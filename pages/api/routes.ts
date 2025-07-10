import type { NextApiRequest, NextApiResponse } from 'next'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import fs from 'fs'
import path from 'path'
import { gtfsCache } from '../../lib/cache'

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
      filename: 'data/gtfs.sqlite',
      driver: sqlite3.Database,
      readonly: true,
    })

    // Query all stops
    const stops = await db.all('SELECT stop_id, stop_lat, stop_lon FROM stops')

    // Find stops within 500 meters
    const nearbyStops = stops.filter((stop: any) => {
      const stopLat = parseFloat(stop.stop_lat)
      const stopLng = parseFloat(stop.stop_lon)
      if (isNaN(stopLat) || isNaN(stopLng)) return false
      return getDistance(userLat, userLng, stopLat, stopLng) <= 500
    }).map((stop: any) => stop.stop_id)

    if (nearbyStops.length === 0) {
      gtfsCache.set('nearbyRoutes', [], currentEtag)
      return res.status(200).json([])
    }

    // Query stop_times for nearby stops
    const stopTimes = await db.all(
      `SELECT trip_id FROM stop_times WHERE stop_id IN (${nearbyStops.map(() => '?').join(',')})`,
      ...nearbyStops
    )

    const nearbyTripIds = new Set(stopTimes.map((st: any) => st.trip_id))

    if (nearbyTripIds.size === 0) {
      gtfsCache.set('nearbyRoutes', [], currentEtag)
      return res.status(200).json([])
    }

    // Query trips for nearby trip_ids
    const trips = await db.all(
      `SELECT trip_id, route_id FROM trips WHERE trip_id IN (${Array.from(nearbyTripIds).map(() => '?').join(',')})`,
      ...Array.from(nearbyTripIds)
    )

    const nearbyRouteIds = new Set(trips.map((trip: any) => trip.route_id))

    if (nearbyRouteIds.size === 0) {
      gtfsCache.set('nearbyRoutes', [], currentEtag)
      return res.status(200).json([])
    }

    // Query routes for nearby route_ids, limit 10
    const routes = await db.all(
      `SELECT route_id, route_short_name, route_long_name, route_type FROM routes WHERE route_id IN (${Array.from(nearbyRouteIds).map(() => '?').join(',')}) LIMIT 10`,
      ...Array.from(nearbyRouteIds)
    )

    gtfsCache.set('nearbyRoutes', routes, currentEtag)

    res.status(200).json(routes)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}
