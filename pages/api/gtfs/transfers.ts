import type { NextApiRequest, NextApiResponse } from 'next';
import sqlite3 from 'sqlite3';
import path from 'path';

// 定义返回的数据结构
type Route = {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
};

type TransferData = {
  subway: Route[];
  bus: Route[];
};

// 数据库文件路径
const dbPath = path.resolve(process.cwd(), 'data/gtfs.sqlite');

// 经纬度查询范围 (大约 200 米)
const LATITUDE_RANGE = 0.0018;
const LONGITUDE_RANGE = 0.0018;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TransferData | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { stop_lat, stop_lon, current_route_id } = req.body;

  if (stop_lat === undefined || stop_lon === undefined || current_route_id === undefined) {
    return res.status(400).json({ error: 'Missing required parameters: stop_lat, stop_lon, current_route_id' });
  }

  try {
    const routes: Route[] = await new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
          if (err) {
              console.error('Error opening database', err.message);
              return reject(err);
          }
      });

      // 计算经纬度范围
      const minLat = stop_lat - LATITUDE_RANGE;
      const maxLat = stop_lat + LATITUDE_RANGE;
      const minLon = stop_lon - LONGITUDE_RANGE;
      const maxLon = stop_lon + LONGITUDE_RANGE;

      // 查询在指定范围内的所有线路，并排除当前线路
      // 这个查询比较复杂，它会：
      // 1. 找到在经纬度范围内的所有站点 (stops)
      // 2. 通过 stop_times 找到经过这些站点的所有 trip
      // 3. 通过 trips 找到对应的线路 (routes)
      // 4. 排除掉当前线路 (current_route_id)
      // 5. 去重，确保每个换乘线路只返回一次
      const sql = `
          SELECT DISTINCT
              r.route_id,
              r.route_short_name,
              r.route_long_name,
              r.route_type
          FROM stops s
          JOIN stop_times st ON s.stop_id = st.stop_id
          JOIN trips t ON st.trip_id = t.trip_id
          JOIN routes r ON t.route_id = r.route_id
          WHERE
              s.stop_lat BETWEEN ? AND ?
              AND s.stop_lon BETWEEN ? AND ?
              AND r.route_id != ?
      `;

      db.all(sql, [minLat, maxLat, minLon, maxLon, current_route_id], (err, rows: Route[]) => {
          db.close((closeErr) => {
              if (closeErr) {
                  // This error is secondary, log it but don't reject the promise on it
                  console.error('Error closing the database:', closeErr.message);
              }
          });

          if (err) {
              return reject(err);
          }
          resolve(rows);
      });
    });
    
    // 将结果按 route_type 分类
    const subway = routes.filter((r: Route) => r.route_type === 1);
    const bus = routes.filter((r: Route) => r.route_type === 3);

    res.status(200).json({ subway, bus });

  } catch (error) {
    const err = error as Error;
    console.error('Error querying transfer routes:', err.message);
    res.status(500).json({ error: 'Failed to query transfer routes from the database.' });
  }
}
