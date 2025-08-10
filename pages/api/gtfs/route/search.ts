import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import type { NextApiRequest, NextApiResponse } from 'next';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 处理查询参数可能是字符串或字符串数组的情况
  const qParam = req.query.q;
  const q = typeof qParam === 'string' ? qParam.toLowerCase() : Array.isArray(qParam) ? qParam[0]?.toLowerCase() || '' : '';

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
