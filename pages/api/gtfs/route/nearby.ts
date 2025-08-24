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
    // Include trip_id and stop_id in the result so we can trace which stop/trip caused duplicated route rows
    const routesRaw = await db.all(
      `SELECT r.route_id, r.route_short_name, r.route_long_name, r.route_type,
              t.trip_id AS _trip_id, st.stop_id AS _stop_id
       FROM routes r
       JOIN trips t ON r.route_id = t.route_id
       JOIN stop_times st ON t.trip_id = st.trip_id
       WHERE st.stop_id IN (${placeholders})`,
      ...stopIds
    );

    // Server-side deduplication by a normalized display key derived from route_short_name when possible
    // Normalize by trimming and extracting leading digits (e.g. "404A" -> "404") so numeric route labels are grouped
    // Fallback to route_id when no usable short name exists
    const seen = new Set<string>();
    const uniqueRoutes: any[] = [];
    const normalize = (r: any) => {
      const raw = r?.route_short_name;
      if (!raw && r?.route_id) return String(r.route_id);
      if (!raw) return '';
      const trimmed = String(raw).trim();
      // Extract leading digits (common case for numeric route numbers)
      const m = trimmed.match(/^\s*([0-9]+)\b/);
      if (m && m[1]) return m[1];
      // Otherwise return the trimmed short name
      return trimmed;
    };

    // Group rows by normalized display key so we can log which trip_id/stop_id combos produced duplicates
    const groups = new Map<string, any[]>();
    for (const r of routesRaw) {
      const key = normalize(r) || String(r.route_id ?? '');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    // Log groups that have multiple rows (these indicate duplicates coming from different trips/stops)
    for (const [key, rows] of groups.entries()) {
      if (rows.length > 1) {
        try {
          console.log(`[api/gtfs/route/nearby] duplicate rows for displayKey=${key}:`, rows.map((a) => ({
            route_id: a.route_id,
            route_short_name: a.route_short_name,
            trip_id: a._trip_id,
            stop_id: a._stop_id,
          })));
        } catch (e) {
          console.log('[api/gtfs/route/nearby] error logging duplicate rows', e);
        }
      }
    }

    // Now produce the uniqueRoutes array preserving the first row seen per key
    for (const [key, rows] of groups.entries()) {
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRoutes.push(rows[0]);
      }
    }

    // Optionally limit the number of results sent to client
    const limited = uniqueRoutes.slice(0, 20);

    await db.close();

    res.status(200).json(limited);
  } catch (error) {
    console.error('Error fetching nearby routes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
