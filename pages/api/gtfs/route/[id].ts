import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 确保只处理GET请求
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { id } = req.query
    
    // TODO: 这里添加实际的GTFS数据获取逻辑
    // 例如从数据库或外部API获取route ID对应的数据
    
    // 临时返回示例数据
    const routeData = {
      id,
      name: `Route ${id}`,
      description: 'Sample route data',
      stops: []
    }

    return res.status(200).json(routeData)
  } catch (error) {
    console.error('Error fetching route data:', error)
    return res.status(500).json({ error: 'Failed to fetch route data' })
  }
}