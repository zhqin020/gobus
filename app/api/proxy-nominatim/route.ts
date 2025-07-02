import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q) {
    return NextResponse.json([], { status: 200 });
  }

  // 1. Google Places API
  try {
    const googleKey = process.env.GOOGLE_PLACES_API_KEY;
    if (googleKey) {
      const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&key=${googleKey}&language=zh-CN`;
      const googleRes = await fetch(googleUrl);
      if (googleRes.ok) {
        const data = await googleRes.json();
        if (data.status === 'OK' && data.predictions?.length > 0) {
          return NextResponse.json(data.predictions.map((p: any) => p.description));
        }
        if ([
          'OVER_QUERY_LIMIT',
          'REQUEST_DENIED',
          'INVALID_REQUEST',
          'UNKNOWN_ERROR'
        ].includes(data.status)) {
          throw new Error('Google quota exceeded');
        }
      }
    }
  } catch (e) {
    // 继续尝试下一个
  }

  // 2. Mapbox Search API
  try {
    const mapboxKey = process.env.MAPBOX_ACCESS_TOKEN;
    if (mapboxKey) {
      const mapboxUrl = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(q)}&access_token=${mapboxKey}&language=zh`;
      const mapboxRes = await fetch(mapboxUrl);
      if (mapboxRes.ok) {
        const data = await mapboxRes.json();
        if (data.suggestions && data.suggestions.length > 0) {
          // Mapbox 建议用 name+context 拼接
          return NextResponse.json(data.suggestions.map((s: any) => {
            let context = s.context ? s.context.map((c: any) => c.name).join(', ') : '';
            return context ? `${s.name}, ${context}` : s.name;
          }));
        }
        if ([429, 402, 403].includes(mapboxRes.status)) {
          throw new Error('Mapbox quota exceeded');
        }
      }
    }
  } catch (e) {
    // 继续尝试下一个
  }

  // 3. geocoder.ca
  try {
    const geoUrl = `http://geocoder.ca/?geoit=XML&json=1&locate=${encodeURIComponent(q)}`;
    const geoRes = await fetch(geoUrl);
    if (geoRes.ok) {
      const data = await geoRes.json();
      let results: string[] = [];
      if (Array.isArray(data.standard)) {
        results = data.standard.map((item: any) => item.staddress && item.city ? `${item.staddress}, ${item.city}, ${item.prov || ''}` : item.location || '');
      } else if (data.standard) {
        const item = data.standard;
        if (item.staddress && item.city) {
          results = [`${item.staddress}, ${item.city}, ${item.prov || ''}`];
        } else if (item.location) {
          results = [item.location];
        }
      }
      return NextResponse.json(results);
    }
  } catch (e) {
    // 忽略
  }

  // 4. 全部失败
  return NextResponse.json([]);
}
