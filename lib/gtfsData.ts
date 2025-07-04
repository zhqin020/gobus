import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

// 全局缓存
let gtfsData: any = null;

export async function loadGtfsData(gtfsZipPath: string) {
  if (gtfsData) return gtfsData;
  const zip = new AdmZip(gtfsZipPath);
  const files = zip.getEntries();
  const data: any = {};
  for (const entry of files) {
    if (entry.entryName.endsWith('.txt')) {
      const content = entry.getData().toString('utf-8');
      const [header, ...rows] = content.split(/\r?\n/).filter(Boolean);
      const headers = header.split(',');
      data[entry.entryName.replace('.txt', '')] = rows.map(row => {
        const cols = row.split(',');
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = cols[i]; });
        return obj;
      });
    }
  }
  gtfsData = data;
  return data;
}

// 新增：优先从txt目录读取GTFS数据
export async function loadGtfsDataFromTxt(gtfsDirPath: string) {
  if (gtfsData) return gtfsData;
  const data: any = {};
  const files = fs.readdirSync(gtfsDirPath);
  for (const file of files) {
    if (file.endsWith('.txt')) {
      const content = fs.readFileSync(path.join(gtfsDirPath, file), 'utf-8');
      const [header, ...rows] = content.split(/\r?\n/).filter(Boolean);
      const headers = header.split(',');
      data[file.replace('.txt', '')] = rows.map(row => {
        const cols = row.split(',');
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = cols[i]; });
        return obj;
      });
    }
  }
  gtfsData = data;
  return data;
}

// 修改loadGtfsData，自动判断zip或txt目录
export async function loadGtfsDataAuto(gtfsPath: string) {
  if (gtfsData) return gtfsData;
  if (fs.existsSync(gtfsPath) && fs.statSync(gtfsPath).isDirectory()) {
    return loadGtfsDataFromTxt(gtfsPath);
  } else if (fs.existsSync(gtfsPath) && gtfsPath.endsWith('.zip')) {
    return loadGtfsData(gtfsPath);
  } else {
    throw new Error('GTFS path not found: ' + gtfsPath);
  }
}

export function getRouteStops(route_id: string) {
  if (!gtfsData) throw new Error('GTFS data not loaded');
  // 1. 找出该route的所有trips
  const routeIdStr = String(route_id);
  const trips = gtfsData['trips'].filter((t: any) => String(t.route_id) === routeIdStr);
  if (!trips.length) return [];
  // 2. 取第一个trip_id，查找stop_times
  const trip_id = trips[0].trip_id;
  const stop_times = gtfsData['stop_times'].filter((st: any) => st.trip_id === trip_id);
  // 3. 查找stop信息
  const stops = stop_times.map((st: any) => {
    const stop = gtfsData['stops'].find((s: any) => s.stop_id === st.stop_id);
    return stop ? { ...stop, stop_sequence: st.stop_sequence } : null;
  }).filter(Boolean);
  return stops;
}

export function getRouteShape(route_id: string) {
  if (!gtfsData) throw new Error('GTFS data not loaded');
  // 1. 找出该route的所有trips
  const routeIdStr = String(route_id);
  const trips = gtfsData['trips'].filter((t: any) => String(t.route_id) === routeIdStr);
  if (!trips.length) return [];
  // 2. 取第一个trip的shape_id
  const shape_id = trips[0].shape_id;
  // 3. 查找shape点
  const shapes = gtfsData['shapes'].filter((s: any) => s.shape_id === shape_id);
  // 按shape_pt_sequence排序
  shapes.sort((a: any, b: any) => Number(a.shape_pt_sequence) - Number(b.shape_pt_sequence));
  return shapes.map((s: any) => ({ lat: Number(s.shape_pt_lat), lng: Number(s.shape_pt_lon) }));
}
