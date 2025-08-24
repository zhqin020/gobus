import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Haversine formula to calculate distance between two points
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const DB_PATH = path.join(process.cwd(), 'data', 'gtfs.sqlite');
const VERSION_FILE_PATH = path.join(process.cwd(), 'data', 'gtfs_version.json');

const oneWeek = 7 * 24 * 60 * 60 * 1000;

// 扩展的商业品牌列表
const COMMERCIAL_BRANDS = [
  'mcdonalds', 'kfc', 'starbucks', 'dunkin', 'burger_king', 'wendys',
  'subway', 'pizza_hut', 'dominos', 'taco_bell', 'chipotle', 'coffee_bucks',
  'superfresh', 'gourmet garage'
];

// 从Public Bathrooms API获取数据
async function fetchPublicBathroomsAPI(lat: number, lng: number) {
  try {
    // 读取 keys/keys.json
    const keysPath = path.join(process.cwd(), 'keys', 'keys.json');
    const content = await fs.promises.readFile(keysPath, 'utf-8');
    const json = JSON.parse(content);
    // RapidAPI Key
    let API_KEY = '';
    if (json.RapidAPI && json.RapidAPI.PublicBathrooms && json.RapidAPI.PublicBathrooms.apiKey) {
      API_KEY = json.RapidAPI.PublicBathrooms.apiKey;
    }
    if (!API_KEY) {
      console.warn('[API /api/restrooms] Public Bathrooms API key not provided');
      return [];
    }

    const response = await fetch(
      `https://public-bathrooms.p.rapidapi.com/bathrooms?lat=${lat}&lng=${lng}`,
      {
        headers: {
          'X-RapidAPI-Key': API_KEY,
          'X-RapidAPI-Host': 'public-bathrooms.p.rapidapi.com',
          'User-Agent': 'GoBus/1.0 (https://github.com/gobus-app/gobus)'
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch data from Public Bathrooms API. Status: ' + response.status);
    }

    const data = await response.json();
    
    return data.map((restroom: any) => {
      // 从tags中提取地址信息
      const tags = restroom.tags || { name: restroom.name };
      let address = restroom.address || 'Address not available';
      
      // 如果API返回的地址不可用，尝试从tags中提取
      if (!address || address === 'Address not available') {
        // 优先从tags中提取地址信息
        address = tags['addr:full'] || tags['address'] || tags['addr_full'] || null;
        
        // 如果没有完整地址，尝试组合地址组件
        if (!address) {
          const addressParts = [];
          if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
          if (tags['addr:street']) addressParts.push(tags['addr:street']);
          if (addressParts.length > 0) {
            address = addressParts.join(' ');
          }
        }
        
        // 如果仍然没有地址，尝试使用其他地址组件组合
        if (!address) {
          const addressParts = [];
          if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
          if (tags['addr:place']) addressParts.push(tags['addr:place']);
          if (addressParts.length > 0) {
            address = addressParts.join(' ');
          }
        }
        
        // 如果仍然没有地址，尝试使用另一种地址组件组合
        if (!address) {
          const addressParts = [];
          // 使用街道名称作为备选
          if (tags['addr:street']) addressParts.push(tags['addr:street']);
          if (addressParts.length > 0) {
            address = addressParts.join(' ');
          }
        }
        
        // 如果仍然没有地址，尝试组合更多的地址组件
        if (!address) {
          const addressParts = [];
          if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
          // 添加街道、城市等组件
          if (tags['addr:street']) addressParts.push(tags['addr:street']);
          if (tags['addr:city']) addressParts.push(tags['addr:city']);
          if (addressParts.length > 0) {
            address = addressParts.join(', ');
          }
        }
        
        // 如果仍然没有地址，尝试组合另一种地址格式
        if (!address) {
          const addressParts = [];
          if (tags['addr:street']) addressParts.push(tags['addr:street']);
          if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
          if (addressParts.length > 0) {
            address = addressParts.join(' ');
          }
        }
        
        // 如果仍然没有地址，使用'Address not available'
        if (!address) {
          address = 'Address not available';
        }
      }
      
      // 标记是否为商业厕所
    const isCommercial = (COMMERCIAL_BRANDS.some(brand => 
      (restroom.name && restroom.name.toLowerCase().includes(brand)) ||
      (tags.brand && tags.brand.toLowerCase().includes(brand)) ||
      (tags.name && tags.name.toLowerCase().includes(brand)))) ||
      (tags.amenity === 'restaurant') ||
      (tags.amenity === 'fast_food') ||
      (tags.amenity === 'cafe') ||
      (tags.shop === 'mall') ||
      (tags.shop === 'supermarket') ||
      (tags.shop === 'department_store');
    return {
      id: `pb_${restroom.id}`, // 添加前缀以避免ID冲突
      tags: tags,
      address: address,
      lat: restroom.latitude,
      lon: restroom.longitude,
      distance: getDistance(lat, lng, restroom.latitude, restroom.longitude),
      isCommercial: isCommercial
    };
    });
  } catch (error) {
    console.error('[API /api/restrooms] Error fetching from Public Bathrooms API:', error);
    return [];
  }
}

async function fetchRestroomsFromPublicAPI(lat: number, lng: number) {
  // 优化的Overpass查询
    const overpassQuery = `[out:json][timeout:25];
      // 基础公共厕所（所有类型的公共厕所）
      node["amenity"="toilets"]
        (around:5000,${lat},${lng});
      // 商业品牌厕所
      node["amenity"="toilets"]["brand"~"${COMMERCIAL_BRANDS.join('|')}"]
        (around:5000,${lat},${lng});
      // 商场和购物中心厕所
      node["amenity"="toilets"]["destination"~"mall|shopping|center"]
        (around:5000,${lat},${lng});
      // 搜索特定品牌Superfresh和Gourmet Garage的厕所
      node["amenity"="toilets"]["name"~"Superfresh|Gourmet Garage"]
        (around:5000,${lat},${lng});
      out body;`;

  const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

  try {
      // 并行调用多个API
      const [overpassResponse, publicBathroomsResponse] = await Promise.all([
        fetch(overpassUrl, {
          headers: {
            'User-Agent': 'GoBus/1.0 (https://github.com/gobus-app/gobus)'
          }
        }),
        fetchPublicBathroomsAPI(lat, lng)
      ]);

      // 处理Overpass API响应
      if (!overpassResponse.ok) {
        throw new Error('Failed to fetch data from Overpass API. Status: ' + overpassResponse.status);
      }

      const overpassData = await overpassResponse.json();

      // 处理Overpass数据
      console.log(`[API /api/restrooms] Overpass API returned ${overpassData.elements.length} elements`);
      const overpassRestrooms = await Promise.all(overpassData.elements.map(async (item: any) => {
        const tags = item.tags || {};
        // 优先从tags中提取地址信息
        let address = tags['addr:full'] || tags['address'] || tags['addr_full'] || null;
        
        // 如果没有完整地址，尝试组合地址组件
        if (!address) {
          const addressParts = [];
          if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
          if (tags['addr:street']) addressParts.push(tags['addr:street']);
          if (addressParts.length > 0) {
            address = addressParts.join(' ');
          }
        }
        
        // 如果仍然没有地址，尝试使用其他地址组件组合
        if (!address) {
          const addressParts = [];
          if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
          if (tags['addr:place']) addressParts.push(tags['addr:place']);
          if (addressParts.length > 0) {
            address = addressParts.join(' ');
          }
        }
        
        // 如果仍然没有地址，尝试使用另一种地址组件组合
        if (!address) {
          const addressParts = [];
          // 使用街道名称作为备选
          if (tags['addr:street']) addressParts.push(tags['addr:street']);
          if (addressParts.length > 0) {
            address = addressParts.join(' ');
          }
        }
        
        // 如果仍然没有地址，尝试组合更多的地址组件
        if (!address) {
          const addressParts = [];
          if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
          // 添加街道、城市、州等组件
          if (tags['addr:street']) addressParts.push(tags['addr:street']);
          if (tags['addr:city']) addressParts.push(tags['addr:city']);
          if (addressParts.length > 0) {
            address = addressParts.join(', ');
          }
        }
        
        // 如果仍然没有地址，尝试组合另一种地址格式
        if (!address) {
          const addressParts = [];
          if (tags['addr:street']) addressParts.push(tags['addr:street']);
          if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
          if (addressParts.length > 0) {
            address = addressParts.join(' ');
          }
        }

        // 如果仍然没有地址，使用Nominatim反向地理编码
        if (!address) {
          // Reverse geocode using Nominatim
          const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${item.lat}&lon=${item.lon}&zoom=18`;
          try {
            const geoResponse = await fetch(nominatimUrl, {
              headers: {
                'User-Agent': 'GoBus/1.0 (https://github.com/gobus-app/gobus)'
              }
            });
            if (geoResponse.ok) {
              const geoData = await geoResponse.json();
              // Extract short address: house number and road
              const addressParts = [];
              if (geoData.address.house_number) addressParts.push(geoData.address.house_number);
              if (geoData.address.road) addressParts.push(geoData.address.road);
              address = addressParts.length > 0 ? addressParts.join(' ') : geoData.display_name || 'Address not available';
            } else {
              address = 'Address not available';
            }
          } catch {
            address = 'Address not available';
          }
        }

        // 标记是否为商业厕所
        // 公共厕所(amenity=toilets)默认不是商业厕所，除非明确标记为商业品牌
        let isCommercial = false;
        
        // 只有当厕所明确属于商业品牌或商业场所时才标记为商业厕所
        // 对于amenity=toilets的元素，只检查是否属于商业品牌
        if (tags.amenity === 'toilets') {
          if (COMMERCIAL_BRANDS.some(brand => 
            tags.brand?.toLowerCase().includes(brand) || 
            tags.name?.toLowerCase().includes(brand))) {
            isCommercial = true;
          }
        } 
        // 对于非toilets的商业场所元素，标记为商业厕所
        else if (tags.amenity === 'restaurant' ||
          tags.amenity === 'fast_food' ||
          tags.amenity === 'cafe' ||
          tags.shop === 'mall' ||
          tags.shop === 'supermarket' ||
          tags.shop === 'department_store') {
          isCommercial = true;
        }

        // 添加调试日志
        if (tags.name && (tags.name.includes('Superfresh') || tags.name.includes('Gourmet Garage'))) {
          console.log(`[API /api/restrooms] Found target restroom: ${tags.name}`, { id: item.id, tags, address });
        }
        
        return {
          id: `osm_${item.id}`, // 添加前缀以避免ID冲突
          tags: tags,
          address: address,
          lat: item.lat,
          lon: item.lon,
          distance: getDistance(lat, lng, item.lat, item.lon),
          isCommercial: isCommercial
        };
      }));

      // 合并所有API数据
      console.log(`[API /api/restrooms] Overpass restrooms: ${overpassRestrooms.length}, Public Bathrooms: ${publicBathroomsResponse.length}`);
      const allRestrooms = [...overpassRestrooms, ...publicBathroomsResponse];

      // 改进的去重逻辑：基于地理位置去重，优先保留地址信息更完整的数据
      console.log(`[API /api/restrooms] Total restrooms before deduplication: ${allRestrooms.length}`);
      const uniqueRestrooms = Array.from(
        allRestrooms.reduce((map, r) => {
          // 创建一个地理位置键（精度到小数点后5位）
          const geoKey = `${Math.round(r.lat * 100000)},${Math.round(r.lon * 100000)}`;
          
          // 检查是否已存在该地理位置的数据
          if (map.has(geoKey)) {
            const existing = map.get(geoKey);
            
            // 如果新数据有地址而现有数据没有地址，则替换
            if ((!existing.address || existing.address === 'Address not available') && 
                r.address && r.address !== 'Address not available') {
              map.set(geoKey, r);
            }
            // 如果现有数据没有地址而新数据有地址，也替换
            else if ((!r.address || r.address === 'Address not available') && 
                     existing.address && existing.address !== 'Address not available') {
              // 不需要替换，保持现有数据
            }
            // 如果两者都有地址，优先保留地址信息更完整的
            else if (existing.address && existing.address !== 'Address not available' &&
                     r.address && r.address !== 'Address not available') {
              // 比较地址长度，保留更长的地址
              if (r.address.length > existing.address.length) {
                map.set(geoKey, r);
              }
            }
          } else {
            // 如果该地理位置还没有数据，则直接添加
            map.set(geoKey, r);
          }
          return map;
        }, new Map()).values()
      );
      
      console.log(`[API /api/restrooms] Total restrooms after deduplication: ${uniqueRestrooms.length}`);
      
      // 添加调试日志，检查是否有Superfresh或Gourmet Garage
      const targetRestrooms = uniqueRestrooms.filter(r => 
        (r.tags.name && (r.tags.name.includes('Superfresh') || r.tags.name.includes('Gourmet Garage'))) ||
        (r.tags.brand && (r.tags.brand.includes('Superfresh') || r.tags.brand.includes('Gourmet Garage')))
      );
      
      if (targetRestrooms.length > 0) {
        console.log(`[API /api/restrooms] Found ${targetRestrooms.length} target restrooms after deduplication:`);
        targetRestrooms.forEach(r => {
          console.log(`  - ${r.tags.name || r.tags.brand || 'Unknown'}: ${r.address}`);
        });
      } else {
        console.log('[API /api/restrooms] No target restrooms found after deduplication');
      }

      return uniqueRestrooms;
    } catch (error) {
      console.error('[API /api/restrooms] Error fetching from public APIs:', error);
      return [];
    }
}

function queryRestroomsFromDB(db: sqlite3.Database, lat: number, lng: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    // Ensure restrooms table exists before querying
    db.run(`CREATE TABLE IF NOT EXISTS restrooms (
      id TEXT PRIMARY KEY,
      name TEXT,
      address TEXT,
      lat REAL,
      lon REAL,
      distance REAL,
      is_open INTEGER,
      is_commercial INTEGER
    );`, (createErr: Error | null) => {
      if (createErr) {
        reject(createErr);
        return;
      }
      const sql = `
        SELECT id, name, address, lat, lon, distance, is_open, is_commercial
        FROM restrooms
        WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
      `;
      db.all(sql, [lat - 0.05, lat + 0.05, lng - 0.05, lng + 0.05], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          // Calculate distance for each restroom and convert is_commercial back to boolean
          const restroomsWithDistance = rows.map(row => ({
            ...row,
            distance: getDistance(lat, lng, row.lat, row.lon),
            isCommercial: row.is_commercial === 1
          }));
          resolve(restroomsWithDistance);
        }
      });
    });
  });
}

function updateRestroomsInDB(db: sqlite3.Database, restrooms: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS restrooms (
        id TEXT PRIMARY KEY,
        name TEXT,
        address TEXT,
        lat REAL,
        lon REAL,
        distance REAL,
        is_open INTEGER,
        is_commercial INTEGER
      );`, (err) => {
        if (err) reject(err);
      });

      const stmt = db.prepare(`INSERT INTO restrooms (id, name, address, lat, lon, distance, is_open, is_commercial)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,
          address=excluded.address,
          lat=excluded.lat,
          lon=excluded.lon,
          distance=excluded.distance,
          is_open=excluded.is_open,
          is_commercial=excluded.is_commercial;`);

      db.run('BEGIN TRANSACTION');
      for (const restroom of restrooms) {
        stmt.run([
            restroom.id,
            restroom.tags.name || '',
            restroom.address,
            restroom.lat,
            restroom.lon,
            restroom.distance,
            1,
            restroom.isCommercial ? 1 : 0
          ]);
      }
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
      stmt.finalize();
    });
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');

  // Open database
  const db = new sqlite3.Database(DB_PATH);

  // Load version info
  let versionInfo: { restroomVersion?: number } = {};
  if (fs.existsSync(VERSION_FILE_PATH)) {
    try {
      versionInfo = JSON.parse(fs.readFileSync(VERSION_FILE_PATH, 'utf-8'));
    } catch {
      versionInfo = {};
    }
  }

  const restroomVersion = versionInfo.restroomVersion || 0;
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000; // 缩短缓存时间为1天

  try {
    // 查询本地存储的缓存
    let cachedRestrooms = [];
    const cacheKey = `restrooms_${Math.round(lat * 100) / 100}_${Math.round(lng * 100) / 100}`;
    const cachePath = path.join(process.cwd(), 'data', 'cache', `${cacheKey}.json`);
    
    // 检查文件缓存
    if (fs.existsSync(cachePath)) {
      try {
        const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        // 检查缓存是否过期（1小时）
        if (Date.now() - cacheData.timestamp < 60 * 60 * 1000) {
          cachedRestrooms = cacheData.restrooms;
          console.log(`[API /api/restrooms] Using file cached restroom data (${cachedRestrooms.length} entries)`);
        }
      } catch (error) {
        console.error('[API /api/restrooms] Error reading file cache:', error);
      }
    }

    // 如果有有效的文件缓存，直接使用
    if (cachedRestrooms.length > 0) {
      db.close();
      return NextResponse.json(cachedRestrooms);
    }

    // Query restrooms from DB
    let restrooms = await queryRestroomsFromDB(db, lat, lng);
    console.log(`[API /api/restrooms] Queried ${restrooms.length} restrooms from database`);

    // Check if data is expired or empty
    if (restrooms.length === 0 || now - restroomVersion > oneDay) {
      console.log('[API /api/restrooms] Data is empty or expired, fetching from public APIs');
      // Fetch from public APIs
      const publicRestrooms = await fetchRestroomsFromPublicAPI(lat, lng);
      console.log(`[API /api/restrooms] Fetched ${publicRestrooms.length} restrooms from public APIs`);

      // Update DB
      await updateRestroomsInDB(db, publicRestrooms);
      console.log('[API /api/restrooms] Updated restrooms in database');

      // Update version info
      versionInfo.restroomVersion = now;
      fs.writeFileSync(VERSION_FILE_PATH, JSON.stringify(versionInfo, null, 2));
      console.log('[API /api/restrooms] Updated restroom version info');

      restrooms = publicRestrooms;
    } else {
      console.log('[API /api/restrooms] Using cached restroom data from database');
    }

    // Filter by distance (<= 5km), sort by distance, and take top 30
    const filteredAndSortedRestrooms = restrooms
      .filter(r => r.distance != null && r.distance <= 5)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 30);

    // 保存到文件缓存
    try {
      const cacheDir = path.join(process.cwd(), 'data', 'cache');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(
        cachePath,
        JSON.stringify({
          timestamp: Date.now(),
          restrooms: filteredAndSortedRestrooms
        }, null, 2)
      );
      console.log('[API /api/restrooms] Saved restroom data to file cache');
    } catch (error) {
      console.error('[API /api/restrooms] Error writing to file cache:', error);
    }

    db.close();

    return NextResponse.json(filteredAndSortedRestrooms);
  } catch (error) {
    db.close();
    console.error('[API /api/restrooms] Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
