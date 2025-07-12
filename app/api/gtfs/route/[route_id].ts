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

  // Bypass cache for debugging
  console.log('[DEBUG] Bypassing cache for route:', route_id);
  gtfsCache.clear(`route_${route_id}`);

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

    // Query transfers for each stop - with debug logging
    const stopsWithTransfers = await Promise.all(
      route.stops.map(async (stop: any) => {
        console.log(`Querying transfers for stop ${stop.stop_id} (${stop.stop_name})`);
        const transfers = await db.all(
          `SELECT t.*, r.route_short_name, r.route_type 
           FROM transfers t
           JOIN routes r ON t.to_route_id = r.route_id
           WHERE t.from_stop_id = ?`,
          stop.stop_id
        );
        console.log(`Found ${transfers.length} transfers for stop ${stop.stop_id}:`, transfers);
        
        return {
          ...stop,
          transfers: transfers.length > 0 ? transfers : undefined,
        };
      })
    );

    // Calculate arrival times
    const now = new Date();
    console.log('Current time:', now.toISOString());
    console.log('Processing stops with times...');
    
    // Process all stops with their times
    const stopsWithTimes = await Promise.all(
      stopsWithTransfers.map(async (stop: any) => {
        console.log(`Processing stop ${stop.stop_id} (${stop.stop_name})`);
        
        // Get all stop times for this stop
        const timesForStop = stopTimes.filter((st: any) => st.stop_id === stop.stop_id);
        console.log(`Found ${timesForStop.length} times for stop ${stop.stop_id}`);
        
        // Format stop times with route info
        const formattedStopTimes = await Promise.all(
          timesForStop.map(async (st: any) => {
            const trip = await db.get('SELECT * FROM trips WHERE trip_id = ?', st.trip_id);
            const route = trip ? await db.get('SELECT * FROM routes WHERE route_id = ?', trip.route_id) : null;
            
            // Parse arrival time (HH:MM:SS format)
            const [hours, minutes] = st.arrival_time.split(':').map(Number);
            let arrivalDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              hours,
              minutes
            );
            
            // Handle times after midnight (e.g. 25:30 becomes next day 1:30)
            if (hours >= 24) {
              arrivalDate = new Date(arrivalDate.getTime() + (hours - 24) * 60 * 60 * 1000);
            }
            
            // Calculate minutes until arrival
            const diffMinutes = Math.floor((arrivalDate.getTime() - now.getTime()) / (1000 * 60));
            
            console.log(`Stop ${stop.stop_id} time ${st.arrival_time}: ${diffMinutes} minutes from now`);
            
            return {
              arrival_time: st.arrival_time,
              departure_time: st.departure_time,
              route_short_name: route?.route_short_name,
              trip_headsign: trip?.trip_headsign,
              minutes_to_arrival: diffMinutes > 0 ? diffMinutes : 0,
              calculated_time: arrivalDate.toISOString()
            };
          })
        );
      
      // Format transfer routes
      const transferRoutes = stop.transfers 
        ? [...new Set(stop.transfers.map((t: any) => t.route_short_name))] 
        : undefined;
      
      return {
        ...stop,
        stopTimes: formattedStopTimes.length > 0 ? formattedStopTimes : undefined,
        transferRoutes
      };
    });

    console.log('Processed stops with times:', stopsWithTimes);
    console.log('First stop arrival times:', stopsWithTimes[0]?.stopTimes);
    
    const responseData = {
      stops: stopsWithTimes || [],
      polyline: route.polyline || [],
      directions: route.directions || [],
      // Removed raw stop_times to avoid confusion with processed data
    };

    gtfsCache.set(`route_${route_id}`, responseData, currentEtag);

    const response = NextResponse.json(responseData);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (e: any) {
    console.error('[API] Error processing route data:', e.message);
    return NextResponse.json({ error: 'Data not found' }, { status: 404 });
  }
}