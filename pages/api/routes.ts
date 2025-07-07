import type { NextApiRequest, NextApiResponse } from 'next'
import fetch from 'node-fetch'
import AdmZip from 'adm-zip'
import { parse } from 'csv-parse/sync'

// Updated GTFS static data link
const GTFS_URL = 'https://gtfs-static.translink.ca/gtfs/google_transit.zip'

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Missing lat/lng query params' });
    }
    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);
    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ error: 'Invalid lat/lng' });
    }
    // 第一阶段：添加版本检查基础
    const gtfsRes = await fetch(GTFS_URL)
    if (!gtfsRes.ok) throw new Error('Failed to download GTFS zip')
    
    // 记录版本信息
    const lastModified = gtfsRes.headers.get('last-modified')
    const etag = gtfsRes.headers.get('etag')
    console.log(`[GTFS Version] ${new Date().toISOString()} - ETag: ${etag}`)
    
    // 保持现有下载逻辑
    const buffer = Buffer.from(await gtfsRes.arrayBuffer())
    const zip = new AdmZip(buffer)
    // 读取 stops.txt
    const stopsEntry = zip.getEntry('stops.txt')
    if (!stopsEntry) throw new Error('stops.txt not found in GTFS zip')
    const stopsCsv = stopsEntry.getData().toString('utf-8')
    const stops = parse(stopsCsv, { columns: true, skip_empty_lines: true })
    // 读取 stop_times.txt
    const stopTimesEntry = zip.getEntry('stop_times.txt')
    if (!stopTimesEntry) throw new Error('stop_times.txt not found in GTFS zip')
    const stopTimesCsv = stopTimesEntry.getData().toString('utf-8')
    const stopTimes = parse(stopTimesCsv, { columns: true, skip_empty_lines: true })
    // 读取 routes.txt
    const routesEntry = zip.getEntry('routes.txt')
    if (!routesEntry) throw new Error('routes.txt not found in GTFS zip')
    const routesCsv = routesEntry.getData().toString('utf-8')
    const routes = parse(routesCsv, { columns: true, skip_empty_lines: true })
    // 读取 trips.txt
    const tripsEntry = zip.getEntry('trips.txt')
    if (!tripsEntry) throw new Error('trips.txt not found in GTFS zip')
    const tripsCsv = tripsEntry.getData().toString('utf-8')
    const trips = parse(tripsCsv, { columns: true, skip_empty_lines: true })

    // 找到500米内的stop_id
    const nearbyStops = stops.filter((stop: any) => {
      const stopLat = parseFloat(stop.stop_lat)
      const stopLng = parseFloat(stop.stop_lon)
      if (isNaN(stopLat) || isNaN(stopLng)) return false
      return getDistance(userLat, userLng, stopLat, stopLng) <= 500
    }).map((stop: any) => stop.stop_id)

    // 找到这些stop_id涉及到的trip_id
    const nearbyTripIds = new Set(
      stopTimes.filter((st: any) => nearbyStops.includes(st.stop_id)).map((st: any) => st.trip_id)
    )
    // 找到这些trip_id涉及到的route_id
    const nearbyRouteIds = new Set(
      trips.filter((trip: any) => nearbyTripIds.has(trip.trip_id)).map((trip: any) => trip.route_id)
    )
    // 只返回附近的线路，限制10个
    const result = routes.filter((r: any) => nearbyRouteIds.has(r.route_id)).slice(0, 10).map((r: any) => ({
      route_id: r.route_id,
      route_short_name: r.route_short_name,
      route_long_name: r.route_long_name,
      route_type: r.route_type,
    }))
    res.status(200).json(result)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}