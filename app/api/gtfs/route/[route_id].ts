import path from 'path';
import { promises as fs } from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { gtfsCache } from '../../../../lib/cache';
import { NextRequest, NextResponse } from 'next/server';

import fsSync from 'fs';

const versionFilePath = path.join(process.cwd(), 'data/gtfs_version.json');

export async function GET(req: NextRequest, { params }: { params: { route_id: string } }) {
  const { route_id } = params;
  console.log('[API] GET /api/gtfs/route/:route_id called with route_id:', route_id);
  if (!route_id) {
    console.log('[API] Missing route_id in request');
    return NextResponse.json({ error: 'Missing route_id' }, { status: 400 });
  }

  let currentEtag = '';
  if (fsSync.existsSync(versionFilePath)) {
    try {
      const versionData = JSON.parse(await fs.readFile(versionFilePath, 'utf-8'));
      currentEtag = versionData.etag || '';
    } catch {
      currentEtag = '';
    }
  }

  // Bypass cache for debugging
  console.log('[DEBUG] Bypassing cache for route:', route_id);
  gtfsCache.clear(`route_${route_id}`);

  let db: any;
  try {
    db = await open({
      filename: 'data/gtfs.sqlite',
      driver: sqlite3.Database,
    });

    // Query route info from database
    const route = await db.get('SELECT * FROM routes WHERE route_id = ?', route_id);
    if (!route) {
      console.log('[API] Route not found for route_id:', route_id);
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // Query stops for this route
    const stops = await db.all(
      `SELECT s.stop_id, s.stop_name, s.stop_lat, s.stop_lon
       FROM stops s
       JOIN stop_times st ON s.stop_id = st.stop_id
       JOIN trips t ON st.trip_id = t.trip_id
       WHERE t.route_id = ?
       GROUP BY s.stop_id
       ORDER BY st.stop_sequence`,
      route_id
    );

    if (!stops || stops.length === 0) {
      console.log('[API] No stops found for route_id:', route_id);
      return NextResponse.json({ error: 'No stops found' }, { status: 404 });
    }

    // Process stops with arrival times
    const stopsWithTimes = await Promise.all(
      stops.map(async (stop: any) => {
        // Get stop times for this stop
        const stopTimes = await db.all(
          `SELECT st.arrival_time, st.departure_time, t.trip_headsign, r.route_short_name
           FROM stop_times st
           JOIN trips t ON st.trip_id = t.trip_id
           JOIN routes r ON t.route_id = r.route_id
           WHERE st.stop_id = ?
           ORDER BY st.arrival_time LIMIT 5`,
          stop.stop_id
        );

        // Format arrival times
        const formattedStopTimes = stopTimes.map((st: any) => {
          const [hours, minutes, seconds] = st.arrival_time.split(':').map(Number);
          const arrivalDate = new Date();
          arrivalDate.setHours(hours, minutes, seconds);

          // Handle midnight rollover
          if (arrivalDate < new Date()) {
            arrivalDate.setDate(arrivalDate.getDate() + 1);
          }

          const now = new Date();
          const diffMinutes = Math.floor((arrivalDate.getTime() - now.getTime()) / (1000 * 60));

          return {
            arrival_time: st.arrival_time,
            departure_time: st.departure_time,
            route_short_name: st.route_short_name,
            trip_headsign: st.trip_headsign,
            minutes_to_arrival: diffMinutes > 0 ? diffMinutes : 0,
            calculated_time: arrivalDate.toISOString()
          };
        });

        return {
          ...stop,
          stopTimes: formattedStopTimes
        };
      })
    );

    // Get route polyline
    const polyline = await db.get(
      'SELECT shape_points FROM shapes WHERE shape_id = ?',
      route.shape_id
    );

    const responseData = {
      stops: stopsWithTimes,
      polyline: polyline?.shape_points ? JSON.parse(polyline.shape_points) : [],
      route
    };

    gtfsCache.set(`route_${route_id}`, responseData, currentEtag);

    const response = NextResponse.json(responseData);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({ error: 'Failed to connect to database' }, { status: 500 });
  } finally {
    // Always close the database connection
    if (db) {
      try {
        await db.close();
        console.log('[API] Database connection closed');
      } catch (closeError) {
        console.error('[API] Error closing database:', closeError);
      }
    }
  }
}
