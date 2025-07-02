import type { NextApiRequest, NextApiResponse } from 'next'

import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
    return
  }
  const { q } = req.query
  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'Missing or invalid query parameter q' })
    return
  }
  try {
    const cityBoundingBoxes: Record<string, string> = {
      Vancouver: '-123.2247,49.1983,-123.0237,49.3166',
      Toronto: '-79.6393,43.5810,-79.1150,43.8555',
    }
    // For demonstration, limit to Vancouver bounding box
    const viewbox = cityBoundingBoxes['Vancouver']
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=ca&bounded=1&viewbox=${viewbox}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'gobus-app/1.0 (your-email@example.com)',
        'Accept-Language': 'en',
      },
    })
    if (!response.ok) {
      res.status(response.status).json({ error: 'Failed to fetch from Nominatim' })
      return
    }
    const data = await response.json()
    // Filter and map results to display name
    const filteredResults = data
      .filter((item: any) =>
        item.display_name.toLowerCase().includes('vancouver') ||
        item.display_name.toLowerCase().includes('toronto')
      )
      .map((item: any) => item.display_name)
    res.status(200).json(filteredResults)
  } catch (error) {
    console.error('Proxy Nominatim error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
