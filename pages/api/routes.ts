import type { NextApiRequest, NextApiResponse } from 'next'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import fs from 'fs'
import path from 'path'
import { gtfsCache } from '../../lib/cache'
import { exec } from 'child_process'

// Haversine formula to calculate distance between two lat/lng points (in meters)
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000; // meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const versionFilePath = path.join(process.cwd(), 'data/gtfs_version.json')
const dbPath = path.join(process.cwd(), 'data/gtfs.sqlite')

async function ensureDatabaseInitialized(): Promise<void> {
  const gtfsDir = path.join(process.cwd(), 'data/google_transit');
  const gtfsFilesExist = fs.existsSync(gtfsDir) && fs.readdirSync(gtfsDir).some(f => f.endsWith('.txt'));
  const dbExists = fs.existsSync(dbPath);
  const lockFilePath = path.join(process.cwd(), 'data/import.lock');
  const lockExists = fs.existsSync(lockFilePath);

  if (!gtfsFilesExist) {
    console.log('[DB Init] GTFS data files not found, running download script...');
    await new Promise<void>((resolve, reject) => {
      exec('node scripts/download-gtfs.js', (error, stdout, stderr) => {
        if (error) {
          console.error(`[DB Init] Download script error: ${error.message}`);
          reject(error);
          return;
        }
        if (stderr) {
          console.error(`[DB Init] Download script stderr: ${stderr}`);
        }
        console.log(`[DB Init] Download script output:\n${stdout}`);
        resolve();
      });
    }).catch((err) => {
      console.error('[DB Init] Download script promise rejected:', err);
      throw err;
    });
  }

  if (!dbExists || !gtfsFilesExist) {
    if (lockExists) {
      console.log('[DB Init] Import lock file exists, skipping import to avoid duplicate runs.');
    } else {
      console.log('[DB Init] Running import script...');
      await new Promise<void>((resolve, reject) => {
        exec('node scripts/import-gtfs-sqlite.js', (error, stdout, stderr) => {
          if (error) {
            console.error(`[DB Init] Import script error: ${error.message}`);
            reject(error);
            return;
          }
          if (stderr) {
            console.error(`[DB Init] Import script stderr: ${stderr}`);
          }
          console.log(`[DB Init] Import script output:\n${stdout}`);
          resolve();
        });
      }).catch((err) => {
        console.error('[DB Init] Import script promise rejected:', err);
        throw err;
      });
    }
  } else {
    console.log('[DB Init] SQLite database exists and GTFS data files present.');
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { lat, lng } = req.query
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Missing lat/lng query params' })
    }
    const userLat = parseFloat(lat as string)
    const userLng = parseFloat(lng as string)
    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ error: 'Invalid lat/lng' })
    }

    await ensureDatabaseInitialized();

    let currentEtag = ''
    if (fs.existsSync(versionFilePath)) {
      try {
        const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'))
        currentEtag = versionData.etag || ''
      } catch {
        currentEtag = ''
      }
    }

    if (gtfsCache.isValid('nearbyRoutes', currentEtag)) {
      const cachedData = gtfsCache.get('nearbyRoutes')
      return res.status(200).json(cachedData?.data || [])
    }

    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })

    // Query all stops
    let stops;
    try {
      stops = await db.all('SELECT stop_id, stop_lat, stop_lon FROM stops')
    } catch (err) {
      console.error('[API] Error querying stops:', err)
      return res.status(500).json({ error: 'Error querying stops' })
    }

    // Find stops within 500 meters
    const nearbyStops = stops.filter((stop: any) => {
      const stopLat = parseFloat(stop.stop_lat)
      const stopLng = parseFloat(stop.stop_lon)
      if (isNaN(stopLat) || isNaN(stopLng)) return false
      return getDistance(userLat, userLng, stopLat, stopLng) <= 500
    }).map((stop: any) => stop.stop_id)

    if (nearbyStops.length === 0) {
      gtfsCache.set('nearbyRoutes', [], currentEtag, 24 * 60 * 60 * 1000) // 1 day expiration
      return res.status(200).json([])
    }

    let stopTimes;
    try {
      stopTimes = await db.all(
        `SELECT trip_id FROM stop_times WHERE stop_id IN (${nearbyStops.map(() => '?').join(',')})`,
        ...nearbyStops
      )
    } catch (err) {
      console.error('[API] Error querying stop_times:', err)
      return res.status(500).json({ error: 'Error querying stop_times' })
    }

    const nearbyTripIds = new Set(stopTimes.map((st: any) => st.trip_id))

    if (nearbyTripIds.size === 0) {
      gtfsCache.set('nearbyRoutes', [], currentEtag, 24 * 60 * 60 * 1000) // 1 day expiration
      return res.status(200).json([])
    }

    let trips;
    try {
      trips = await db.all(
        `SELECT trip_id, route_id FROM trips WHERE trip_id IN (${Array.from(nearbyTripIds).map(() => '?').join(',')})`,
        ...Array.from(nearbyTripIds)
      )
    } catch (err) {
      console.error('[API] Error querying trips:', err)
      return res.status(500).json({ error: 'Error querying trips' })
    }

    const nearbyRouteIds = new Set(trips.map((trip: any) => trip.route_id))

    if (nearbyRouteIds.size === 0) {
      gtfsCache.set('nearbyRoutes', [], currentEtag, 24 * 60 * 60 * 1000) // 1 day expiration
      return res.status(200).json([])
    }

    let routes;
    try {
      routes = await db.all(
        `SELECT route_id, route_short_name, route_long_name, route_type FROM routes WHERE route_id IN (${Array.from(nearbyRouteIds).map(() => '?').join(',')}) LIMIT 10`,
        ...Array.from(nearbyRouteIds)
      )
    } catch (err) {
      console.error('[API] Error querying routes:', err)
      return res.status(500).json({ error: 'Error querying routes' })
    }

    gtfsCache.set('nearbyRoutes', routes, currentEtag, 24 * 60 * 60 * 1000) // 1 day expiration

    res.status(200).json(routes)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}
