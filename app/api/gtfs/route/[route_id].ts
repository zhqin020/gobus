console.log('[API] Loaded app/api/gtfs/route/[route_id].ts module');

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(req: NextRequest, { params }: { params: { route_id: string } }) {
  const { route_id } = params;
  console.log('[API] GET /api/gtfs/route/:route_id called with route_id:', route_id);
  if (!route_id) {
    console.log('[API] Missing route_id in request');
    return NextResponse.json({ error: 'Missing route_id' }, { status: 400 });
  }

  const dataPath = path.join(process.cwd(), 'data', 'gtfs_routes.json');
  try {
    console.log('[API] Reading GTFS data from:', dataPath);
    const content = await fs.readFile(dataPath, 'utf-8');
    console.log('[API] File content:', content);
    const routes = JSON.parse(content);
    console.log('[API] Loaded routes:', routes);
    // Debug: print all route_ids in the file
    if (Array.isArray(routes)) {
      console.log('[API] All route_ids in file:', routes.map((r: any) => r.route_id));
      // Extra: log each route_id and its type
      routes.forEach((r: any, idx: number) => {
        console.log(`[API] routes[${idx}].route_id:`, r.route_id, 'type:', typeof r.route_id);
      });
    }
    console.log('[API] typeof route_id param:', typeof route_id, 'value:', route_id);
    const route = routes.find((r: any) => String(r.route_id) === String(route_id));
    console.log('[API] route_id to match:', route_id, 'Matched route:', route);
    if (!route) {
      console.log('[API] Route not found for route_id:', route_id);
      // Extra debug: show typeof route_id and typeof all route_ids
      if (Array.isArray(routes)) {
        routes.forEach((r: any) => {
          console.log(`[API] Compare: typeof(r.route_id)=${typeof r.route_id}, value=${r.route_id} vs typeof(route_id)=${typeof route_id}, value=${route_id}`);
        });
      }
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }
    console.log('[API] Found route:', route.route_id, 'stops:', Array.isArray(route.stops) ? route.stops.length : 0, 'polyline:', Array.isArray(route.polyline) ? route.polyline.length : 0, 'directions:', Array.isArray(route.directions) ? route.directions.length : 0);
    return NextResponse.json({
      stops: route.stops || [],
      polyline: route.polyline || [],
      directions: route.directions || [],
    });
  } catch (e: any) {
    console.error('[API] Error reading GTFS data:', e.message);
    return NextResponse.json({ error: 'Data not found' }, { status: 404 });
  }
}


