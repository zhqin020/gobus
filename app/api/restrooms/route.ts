import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Haversine formula to calculate distance between two points
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const DB_PATH = path.join(process.cwd(), 'data', 'gtfs.sqlite');
const VERSION_FILE_PATH = path.join(process.cwd(), 'data', 'gtfs_version.json');

const oneWeek = 7 * 24 * 60 * 60 * 1000;

async function fetchRestroomsFromPublicAPI(lat: number, lng: number) {
  const overpassQuery = `[out:json];
    node
      [amenity=toilets]
      (around:3000,${lat},${lng});
    out;`;

  const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

  try {
    const response = await fetch(overpassUrl, {
      headers: {
        'User-Agent': 'GoBus/1.0 (https://github.com/gobus-app/gobus)'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data from Overpass API. Status: ' + response.status);
    }

    const data = await response.json();

    // For each restroom, if address is not available in tags, perform reverse geocoding to get address
    const restrooms = await Promise.all(data.elements.map(async (item: any) => {
      const tags = item.tags || {};
      let address = tags['addr:full'] || tags['address'] || tags['addr_full'] || null;

      if (!address) {
        // Reverse geocode using Nominatim
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${item.lat}&lon=${item.lon}&zoom=18`;
        try {
          const geoResponse = await fetch(nominatimUrl, {
            headers: {
              'User-Agent': 'GoBus/1.0 (https://github.com/gobus-app/gobus)'
            }
          });
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            // Extract short address: house number and road
            const addressParts = [];
            if (geoData.address.house_number) addressParts.push(geoData.address.house_number);
            if (geoData.address.road) addressParts.push(geoData.address.road);
            address = addressParts.length > 0 ? addressParts.join(' ') : geoData.display_name || 'Address not available';
          } else {
            address = 'Address not available';
          }
        } catch {
          address = 'Address not available';
        }
      }

      return {
        id: item.id,
        tags: tags,
        address: address,
        lat: item.lat,
        lon: item.lon,
        distance: getDistance(lat, lng, item.lat, item.lon),
      };
    }));

    return restrooms;
  } catch (error) {
    console.error('[API /api/restrooms] Error fetching from public API:', error);
    return [];
  }
}

function queryRestroomsFromDB(db: sqlite3.Database, lat: number, lng: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    // Ensure restrooms table exists before querying
    db.run(`CREATE TABLE IF NOT EXISTS restrooms (
      id TEXT PRIMARY KEY,
      name TEXT,
      address TEXT,
      lat REAL,
      lon REAL,
      distance REAL,
      is_open INTEGER
    );`, (createErr: Error | null) => {
      if (createErr) {
        reject(createErr);
        return;
      }
      const sql = `
        SELECT id, name, address, lat, lon, distance, is_open
        FROM restrooms
      `;
      db.all(sql, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          // Calculate distance for each restroom
          const restroomsWithDistance = rows.map(row => ({
            ...row,
            distance: getDistance(lat, lng, row.lat, row.lon),
          }));
          resolve(restroomsWithDistance);
        }
      });
    });
  });
}

function updateRestroomsInDB(db: sqlite3.Database, restrooms: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS restrooms (
        id TEXT PRIMARY KEY,
        name TEXT,
        address TEXT,
        lat REAL,
        lon REAL,
        distance REAL,
        is_open INTEGER
      );`, (err) => {
        if (err) reject(err);
      });

      const stmt = db.prepare(`INSERT INTO restrooms (id, name, address, lat, lon, distance, is_open)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,
          address=excluded.address,
          lat=excluded.lat,
          lon=excluded.lon,
          distance=excluded.distance,
          is_open=excluded.is_open;`);

      db.run('BEGIN TRANSACTION');
      for (const restroom of restrooms) {
        stmt.run([
          restroom.id,
          restroom.tags.name || '',
          restroom.address,
          restroom.lat,
          restroom.lon,
          restroom.distance,
          1
        ]);
      }
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
      stmt.finalize();
    });
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');

  // Open database
  const db = new sqlite3.Database(DB_PATH);

  // Load version info
  let versionInfo: { restroomVersion?: number } = {};
  if (fs.existsSync(VERSION_FILE_PATH)) {
    try {
      versionInfo = JSON.parse(fs.readFileSync(VERSION_FILE_PATH, 'utf-8'));
    } catch {
      versionInfo = {};
    }
  }

  const restroomVersion = versionInfo.restroomVersion || 0;
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  try {
    // Query restrooms from DB
    let restrooms = await queryRestroomsFromDB(db, lat, lng);
    console.log(`[API /api/restrooms] Queried ${restrooms.length} restrooms from database`);

    // Check if data is expired or empty
    if (restrooms.length === 0 || now - restroomVersion > oneWeek) {
      console.log('[API /api/restrooms] Data is empty or expired, fetching from public API');
      // Fetch from public API
      const publicRestrooms = await fetchRestroomsFromPublicAPI(lat, lng);
      console.log(`[API /api/restrooms] Fetched ${publicRestrooms.length} restrooms from public API`);

      // Update DB
      await updateRestroomsInDB(db, publicRestrooms);
      console.log('[API /api/restrooms] Updated restrooms in database');

      // Update version info
      versionInfo.restroomVersion = now;
      fs.writeFileSync(VERSION_FILE_PATH, JSON.stringify(versionInfo, null, 2));
      console.log('[API /api/restrooms] Updated restroom version info');

      restrooms = publicRestrooms;
    } else {
      console.log('[API /api/restrooms] Using cached restroom data from database');
    }

    // Filter by distance (<= 5km), sort by distance, and take top 30
    const filteredAndSortedRestrooms = restrooms
      .filter(r => r.distance != null && r.distance <= 5)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 30);

    db.close();

    return NextResponse.json(filteredAndSortedRestrooms);
  } catch (error) {
    db.close();
    console.error('[API /api/restrooms] Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
