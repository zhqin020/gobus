import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { gtfsCache } from '../../../lib/cache';
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

  if (gtfsCache.isValid(`route_${route_id}`, currentEtag)) {
    const cachedData = gtfsCache.get(`route_${route_id}`);
    return NextResponse.json(cachedData?.data || {});
  }

  try {
    const db = await open({
      filename: 'data/gtfs.sqlite',
      driver: sqlite3.Database,
      readonly: true,
    });

    // Query route info from JSON file for stops, polyline, directions
    const dataPath = path.join(process.cwd(), 'data', 'gtfs_routes.json');
    const content = await fs.readFile(dataPath, 'utf-8');
    const routes = JSON.parse(content);
    const route = routes.find((r: any) => String(r.route_id) === String(route_id));
    if (!route) {
      console.log('[API] Route not found for route_id:', route_id);
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // Query stop_times for this route_id from SQLite
    const stopTimes = await db.all(
      `SELECT * FROM stop_times WHERE trip_id IN (
        SELECT trip_id FROM trips WHERE route_id = ?
      ) ORDER BY stop_sequence ASC`,
      route_id
    );

    const responseData = {
      stops: route.stops || [],
      polyline: route.polyline || [],
      directions: route.directions || [],
      stop_times: stopTimes || [],
    };

    gtfsCache.set(`route_${route_id}`, responseData, currentEtag);

    return NextResponse.json(responseData);
  } catch (e: any) {
    console.error('[API] Error processing route data:', e.message);
    return NextResponse.json({ error: 'Data not found' }, { status: 404 });
  }
}


