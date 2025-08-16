# 显示商业单位的厕所

## 修改内容
1. 在 dragable panel 上方增加一个开关(switch)，用于切换是否显示商业单位的厕所
2. 如果开启开关，地图上显示商业单位的厕所图标（包括 Mcdonald's, Starbucks,  Dunkin Donuts, KFC, 以及有厕所的大型商场 等），地址名称为商业单位名称

3. 如果关闭开关，地图上不显示商业单位的厕所图标
4. 点击地图上的厕所图标，弹出一个弹窗，显示厕所的详细信息，包括地址、名称、距离、是否无障碍、是否有changing table等
5. 点击 dragable 中的厕所记录，地图居中显示当前选中的厕所
6. 公共厕所的图标和商业场所的厕所图标需要有区别，例如公共厕所的图标为蓝色，商业场所的图标为红色



## 思路
1. Refuge Restrooms API描述：Refuge Restrooms API 提供全球性别中立和无障碍厕所信息，支持按位置搜索。虽然主要面向性别中立厕所，但也包含一些商业场所的厕所（例如咖啡店、餐厅）。
适用性：可用于查找部分商业场所的厕所，但覆盖范围可能有限，尤其是快餐店或购物中心。
关键端点：GET /api/restrooms/nearby：按经纬度搜索附近厕所。参数：latitude、longitude、radius（默认 1 英里）。
示例：GET /api/restrooms/nearby?latitude=37.7749&longitude=-122.4194&radius=0.5

GET /api/restrooms/search：按名称或地址搜索，支持过滤条件（如 accessible、changing_table）。示例：GET /api/restrooms/search?query=mcdonalds&accessible=true
async function fetchRefugeRestrooms(lat: number, lon: number) {
  const API_KEY = "YOUR_API_KEY";
  const response = await fetch(
    `https://www.refugerestrooms.org/api/v1/restrooms/nearby?latitude=${lat}&longitude=${lon}&radius=1`,
    {
      headers: { Authorization: `Token token=${API_KEY}` },
    }
  );
  const data = await response.json();
  return data.map((restroom: any) => ({
    id: restroom.id,
    address: restroom.street || "Unknown",
    lat: restroom.latitude,
    lon: restroom.longitude,
    tags: { name: restroom.name, ...restroom }, // 包含所有可用标签
    distance: calculateDistance(lat, lon, restroom.latitude, restroom.longitude),
  }));
}

2. Google Places API描述：Google Places API 提供丰富的地点数据，包括餐厅、咖啡店、购物中心等商业场所。虽然它不直接提供厕所信息，但可以通过查询特定类型的地点（如 restaurant、cafe、shopping_mall）并假设这些地点通常有厕所。
适用性：非常适合查找麦当劳、KFC、星巴克等连锁店以及购物中心的厕所。
关键端点：Nearby Search：GET /maps/api/place/nearbysearch/json参数：location（经纬度）、radius、type（如 restaurant、cafe）。
示例：GET /maps/api/place/nearbysearch/json?location=37.7749,-122.4194&radius=5000&type=restaurant&key=YOUR_API_KEY

Text Search：GET /maps/api/place/textsearch/json参数：query（如 mcdonalds near me）、location、radius.
示例：GET /maps/api/place/textsearch/json?query=mcdonalds&location=37.7749,-122.4194&radius=5000&key=YOUR_API_KEY
async function fetchGooglePlaces(lat: number, lon: number) {
  const API_KEY = "YOUR_GOOGLE_API_KEY";
  const types = ["restaurant", "cafe", "shopping_mall", "fast_food"];
  const results = [];
  for (const type of types) {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=5000&type=${type}&key=${API_KEY}`
    );
    const data = await response.json();
    results.push(
      ...data.results.map((place: any) => ({
        id: place.place_id,
        address: place.vicinity,
        lat: place.geometry.location.lat,
        lon: place.geometry.location.lng,
        tags: { name: place.name, type: place.types.join(" "), brand: place.name.toLowerCase() },
        distance: calculateDistance(lat, lon, place.geometry.location.lat, place.geometry.location.lng),
      }))
    );
  }
  return results;
}

3. Public Bathrooms API (RapidAPI)描述：提供全球 60,000+ 条厕所数据，支持按经纬度搜索，覆盖公共和商业场所，性能优于早期版本。
适用性：高覆盖率，适合查找快餐店、咖啡店、购物中心等商业厕所。
关键端点：GET /bathrooms：按经纬度搜索附近厕所。示例：GET https://public-bathrooms.p.rapidapi.com/bathrooms?lat=40.7128&lng=-74.0060

认证：需要 RapidAPI 密钥（免费层提供有限调用）。
实现建议：注册 RapidAPI，获取 API 密钥。
调用 /bathrooms 端点，过滤商业场所（如 tags 包含 restaurant、fast_food）。
async function fetchPublicBathrooms(lat: number, lon: number) {
  const API_KEY = "YOUR_RAPIDAPI_KEY";
  const response = await fetch(
    `https://public-bathrooms.p.rapidapi.com/bathrooms?lat=${lat}&lng=${lon}`,
    {
      headers: {
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": "public-bathrooms.p.rapidapi.com",
      },
    }
  );
  const data = await response.json();
  return data.map((restroom: any) => ({
    id: restroom.id,
    address: restroom.address,
    lat: restroom.latitude,
    lon: restroom.longitude,
    tags: restroom.tags || { name: restroom.name },
    distance: calculateDistance(lat, lon, restroom.latitude, restroom.longitude),
  }));
}

4. OpenStreetMap (Overpass API)描述：已用于你的代码，但查询可能未优化。OSM 提供广泛的地点数据，包括商业场所的厕所（amenity=toilets + access=customers）。
适用性：免费且覆盖全球，适合查找麦当劳、KFC 等商业场所的厕所。
关键端点：Overpass QL 查询：通过 Overpass API 查询特定标签的厕所。示例查询：
async function fetchOSMRestrooms(lat: number, lon: number) {
  const query = `
    [out:json];
    (
      node(around:5000,${lat},${lon})["amenity"="toilets"]["access"~"public|customers"];
      node(around:5000,${lat},${lon})["amenity"~"restaurant|fast_food|cafe"]["brand"~"mcdonalds|kfc|starbucks"];
      node(around:5000,${lat},${lon})["shop"="mall"];
    );
    out body;
  `;
  const response = await fetch(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
  );
  const data = await response.json();
  return data.elements.map((element: any) => ({
    id: element.id,
    address: element.tags.name || "Unknown",
    lat: element.lat,
    lon: element.lon,
    tags: element.tags,
    distance: calculateDistance(lat, lon, element.lat, element.lon),
  }));
}

## 优化

1. 为了最大化查询商业厕所的覆盖率，建议组合多个 API，优先使用 Google Places API（覆盖商业场所）和 Public Bathrooms API（覆盖厕所数据），并保留 OpenStreetMap 作为免费备选。实现步骤组合 API 数据：调用 Google Places API 获取附近餐厅、快餐店、咖啡店和购物中心。
调用 Public Bathrooms API 或 Refuge Restrooms API 获取明确标记为厕所的地点。
调用 Overpass API 补充 OSM 数据。
合并结果，基于 tags 标记商业厕所。

示例综合函数：
async function fetchAllRestrooms(lat: number, lon: number) {
  const [googleResults, publicBathrooms, osmResults] = await Promise.all([
    fetchGooglePlaces(lat, lon),
    fetchPublicBathrooms(lat, lon),
    fetchOSMRestrooms(lat, lon),
  ]);
  const allRestrooms = [...googleResults, ...publicBathrooms, ...osmResults];
  // 去重（基于 id 或经纬度）
  const uniqueRestrooms = Array.from(
    new Map(allRestrooms.map(r => [r.id, r])).values()
  );
  return uniqueRestrooms;
}

2， 离线缓存：使用本地存储缓存最近查询的厕所数据，应对网络不稳定情况。

javascript

import { useLocalStorage } from "@uidotdev/usehooks";

const [cachedRestrooms, setCachedRestrooms] = useLocalStorage("restrooms", []);
useEffect(() => {
  if (safeRestrooms.length > 0) {
    setCachedRestrooms(safeRestrooms);
  }
}, [safeRestrooms]);

