import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export default async function handler(req, res) {
  const q = req.query.q?.toLowerCase() || '';

  if (!q) {
    res.status(200).json([]);
    return;
  }

  try {
    const db = await open({
      filename: './data/gtfs.sqlite',
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY,
    });

    // Search routes by route_short_name or route_long_name matching query
    const routes = await db.all(
      `SELECT route_id, route_short_name, route_long_name, route_type
       FROM routes
       WHERE LOWER(route_short_name) LIKE '%' || ? || '%'
          OR LOWER(route_long_name) LIKE '%' || ? || '%'
       LIMIT 20`,
      q,
      q
    );

    await db.close();

    res.status(200).json(routes);
  } catch (error) {
    console.error('Error searching routes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
