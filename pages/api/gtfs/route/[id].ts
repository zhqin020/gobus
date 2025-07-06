import type { NextApiRequest, NextApiResponse } from 'next'
import { Database } from 'sql.js'
import * as fs from 'fs'
import * as path from 'path'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Route ID is required' })
    }

    // 加载SQLite数据库
    const dbPath = path.join(process.cwd(), 'public', 'gtfs.sqlite')
    const dbData = fs.readFileSync(dbPath)
    const SQL = await require('sql.js/dist/sql-wasm.js')()
    const db = new SQL.Database(dbData)

    // 查询route信息
    const routeQuery = db.prepare(`
      SELECT route_id, route_short_name, route_long_name, route_desc, route_type 
      FROM routes 
      WHERE route_id = :id
    `)
    routeQuery.bind({ ':id': id })
    const routeResult = routeQuery.step() ? routeQuery.getAsObject() : null
    routeQuery.free()

    if (!routeResult) {
      return res.status(404).json({ error: 'Route not found' })
    }

    // 查询该route的所有站点
    const stopsQuery = db.prepare(`
      SELECT s.stop_id, s.stop_name, s.stop_lat, s.stop_lon, st.stop_sequence
      FROM stops s
      JOIN stop_times st ON s.stop_id = st.stop_id
      JOIN trips t ON st.trip_id = t.trip_id
      WHERE t.route_id = :id
      GROUP BY s.stop_id
      ORDER BY st.stop_sequence
    `)
    stopsQuery.bind({ ':id': id })
    const stops = []
    while (stopsQuery.step()) {
      stops.push(stopsQuery.getAsObject())
    }
    stopsQuery.free()

    db.close()

    return res.status(200).json({
      ...routeResult,
      stops
    })
  } catch (error) {
    console.error('Error fetching route data:', error)
    return res.status(500).json({ error: 'Failed to fetch route data' })
  }
}