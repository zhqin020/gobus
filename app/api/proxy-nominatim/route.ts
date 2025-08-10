import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

async function getKeys() {
  // 读取 keys/keys.json
  const keysPath = path.join(process.cwd(), 'keys', 'keys.json');
  const content = await fs.readFile(keysPath, 'utf-8');
  const json = JSON.parse(content);
  // Google Key
  let googleKey = '';
  let mapboxKey = '';
  if (json.MapApi) {
    if (json.MapApi.Google && json.MapApi.Google.apiKey) {
      googleKey = json.MapApi.Google.apiKey;
    }
    if (json.MapApi.Mapbox && json.MapApi.Mapbox.apiKey) {
      mapboxKey = json.MapApi.Mapbox.apiKey;
    }
    // 兼容 MapApi.MapApi.apiKey
    if (!mapboxKey && json.MapApi.MapApi && json.MapApi.MapApi.apiKey) {
      mapboxKey = json.MapApi.MapApi.apiKey;
    }
  }
  return { googleKey, mapboxKey };
}

function filterByCity(results: any[], city: string) {
  if (!city) return results;
  // 只保留包含城市名的结果（忽略大小写）
  return results.filter(addr => {
    if (typeof addr.address === 'string') {
      return addr.address.toLowerCase().includes(city.toLowerCase());
    }
    return false;
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const city = searchParams.get('city') || '';
  // 新增地理范围参数
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const radius = parseInt(searchParams.get('radius') || '30000', 10); // 默认30km
  const languageParam = searchParams.get('language') || 'en';
  console.log('[proxy-nominatim] 查询参数:', { q, city, lat, lng, radius });

  // If lat and lng are provided but no q, perform reverse geocoding
  if (!q && !isNaN(lat) && !isNaN(lng)) {
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'gobus-app/1.0',
          'Accept-Language': languageParam,
        },
      });
      if (!response.ok) {
        console.log('[proxy-nominatim] Reverse geocoding failed:', response.status);
        return NextResponse.json([], { status: response.status });
      }
      const data = await response.json();
      if (data && data.display_name) {
        return NextResponse.json([{ address: data.display_name, lat: lat, lng: lng }]);
      } else {
        return NextResponse.json([]);
      }
    } catch (error) {
      console.log('[proxy-nominatim] Reverse geocoding error:', error);
      return NextResponse.json([]);
    }
  }

  if (!q) {
    return NextResponse.json([], { status: 200 });
  }
  const { googleKey, mapboxKey } = await getKeys();

  // 1. Google Places API (New)
  let googleFailed = false;
  if (googleKey) {
    try {
      const googleUrl = 'https://places.googleapis.com/v1/places:autocomplete';
      const bodyObj: any = {
        input: q,
        languageCode: languageParam,
      };
      if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
        bodyObj.locationRestriction = {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius,
          },
        };
      }
      const body = JSON.stringify(bodyObj);
      console.log('[Google Places New] 请求:', { url: googleUrl, body: bodyObj });
      const googleRes = await fetch(googleUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleKey,
        },
        body,
      });
      const data = await googleRes.json();
      console.log('[Google Places New] 响应:', JSON.stringify(data));
      if (googleRes.ok && data.status !== 'INVALID_ARGUMENT') {
        // Google Places v1: data.suggestions[].placePrediction.structuredFormat.mainText.text
        if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          let results = data.suggestions
            .filter((s: any) => {
              if (!city) return true;
              const sec = s.placePrediction?.structuredFormat?.secondaryText?.text || s.placePrediction?.description || '';
              return sec.toLowerCase().includes(city.toLowerCase());
            })
            .map((s: any) => {
              const main = s.placePrediction?.structuredFormat?.mainText?.text || '';
              const sec = s.placePrediction?.structuredFormat?.secondaryText?.text || '';
              const lat = s.placePrediction?.geometry?.location?.latitude;
              const lng = s.placePrediction?.geometry?.location?.longitude;
              const address = sec ? `${main}, ${sec}` : main;
              return { address, lat, lng };
            });
          results = filterByCity(results, city);
          if (results.length > 0) {
            return NextResponse.json(results);
          }
        }
        if (data.status === 'RESOURCE_EXHAUSTED' || data.status === 'PERMISSION_DENIED') {
          googleFailed = true;
        }
      } else {
        googleFailed = true;
      }
    } catch (e) {
      console.log('[Google Places New] 错误:', e);
      googleFailed = true;
    }
  } else {
    googleFailed = true;
  }

  // 2. Mapbox Search API
  let mapboxFailed = false;
  if (googleFailed && mapboxKey) {
    try {
      const mapboxUrl = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(q)}&access_token=${mapboxKey}&language=${languageParam}`;
      console.log('[Mapbox] 请求:', { url: mapboxUrl });
      const mapboxRes = await fetch(mapboxUrl);
      const data = await mapboxRes.json();
      console.log('[Mapbox] 响应:', JSON.stringify(data));
      if (mapboxRes.ok) {
        if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          let results = data.suggestions.map((s: any) => {
            let context = s.context ? s.context.map((c: any) => c.name).join(', ') : '';
            const address = context ? `${s.name}, ${context}` : s.name;
            const lat = s.center?.lat || s.center?.[1];
            const lng = s.center?.lng || s.center?.[0];
            return { address, lat, lng };
          });
          results = filterByCity(results, city);
          if (results.length > 0) {
            return NextResponse.json(results);
          }
        }
        if ([429, 402, 403].includes(mapboxRes.status)) {
          mapboxFailed = true;
        }
      } else {
        mapboxFailed = true;
      }
    } catch (e) {
      console.log('[Mapbox] 错误:', e);
      mapboxFailed = true;
    }
  } else {
    mapboxFailed = true;
  }

  // 3. geocoder.ca
  if (googleFailed && mapboxFailed) {
    try {
      const geoUrl = `http://geocoder.ca/?geoit=XML&json=1&locate=${encodeURIComponent(q)}`;
      console.log('[geocoder.ca] 请求:', { url: geoUrl });
      const geoRes = await fetch(geoUrl);
      const data = await geoRes.json();
      console.log('[geocoder.ca] 响应:', JSON.stringify(data));
      if (geoRes.ok) {
        let results: any[] = [];
        if (Array.isArray(data.standard)) {
          results = data.standard.map((item: any) => {
            const address = item.staddress && item.city ? `${item.staddress}, ${item.city}, ${item.prov || ''}` : item.location || '';
            const lat = item.latt || null;
            const lng = item.longt || null;
            return { address, lat, lng };
          });
        } else if (data.standard) {
          const item = data.standard;
          const address = item.staddress && item.city ? `${item.staddress}, ${item.city}, ${item.prov || ''}` : item.location || '';
          const lat = item.latt || null;
          const lng = item.longt || null;
          results = [{ address, lat, lng }];
        }
        results = filterByCity(results, city);
        if (results.length > 0) {
          return NextResponse.json(results);
        }
      }
    } catch (e) {
      console.log('[geocoder.ca] 错误:', e);
    }
  }

  // 4. 全部失败
  return NextResponse.json([]);
}
