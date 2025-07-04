import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { loadGtfsDataAuto, getRouteStops, getRouteShape } from '@/lib/gtfsData';

const GTFS_PATH = path.join(process.cwd(), 'data', 'google_transit'); // 指向解压目录

export async function GET(req: NextRequest, { params }: { params: { route_id: string } }) {
  const { route_id } = params;
  if (!route_id) return NextResponse.json({ error: 'Missing route_id' }, { status: 400 });
  try {
    await loadGtfsDataAuto(GTFS_PATH);
    const stops = getRouteStops(route_id);
    const polyline = getRouteShape(route_id);
    return NextResponse.json({ route_id, stops, polyline });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
