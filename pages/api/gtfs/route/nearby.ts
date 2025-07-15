import type { NextApiRequest, NextApiResponse } from 'next';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'Invalid or missing lat/lng parameters' });
    return;
  }

  try {
    const db = await open({
      filename: './data/gtfs.sqlite',
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY,
    });

    // Find stops within ~500 meters radius (approximate)
    // Using simple bounding box for performance: ~0.005 degrees ~ 500m
    const latMin = lat - 0.005;
    const latMax = lat + 0.005;
    const lngMin = lng - 0.005;
    const lngMax = lng + 0.005;

    const stops = await db.all(
      `SELECT stop_id FROM stops
       WHERE stop_lat BETWEEN ? AND ?
         AND stop_lon BETWEEN ? AND ?`,
      latMin,
      latMax,
      lngMin,
      lngMax
    );

    if (stops.length === 0) {
      await db.close();
      res.status(200).json([]);
      return;
    }

    const stopIds = stops.map(s => s.stop_id);

    // Find distinct routes serving these stops
    const placeholders = stopIds.map(() => '?').join(',');
    const routes = await db.all(
      `SELECT DISTINCT r.route_id, r.route_short_name, r.route_long_name, r.route_type
       FROM routes r
       JOIN trips t ON r.route_id = t.route_id
       JOIN stop_times st ON t.trip_id = st.trip_id
       WHERE st.stop_id IN (${placeholders})
       LIMIT 20`,
      ...stopIds
    );

    await db.close();

    res.status(200).json(routes);
  } catch (error) {
    console.error('Error fetching nearby routes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
