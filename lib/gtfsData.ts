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
  const routeIdStr = String(route_id);
  console.log('[getRouteStops] gtfsData keys:', Object.keys(gtfsData));
  console.log('[getRouteStops] gtfsData["trips"] type:', typeof gtfsData['trips'], Array.isArray(gtfsData['trips']), 'length:', Array.isArray(gtfsData['trips']) ? gtfsData['trips'].length : 'N/A');
  const trips = Array.isArray(gtfsData['trips']) ? gtfsData['trips'].filter((t: any) => String(t.route_id) === routeIdStr) : [];
  console.log('[getRouteStops] trips:', Array.isArray(trips) ? trips.length : 'N/A', trips[0]);
  if (!Array.isArray(trips) || trips.length === 0) return [];
  const trip_id = trips[0].trip_id;
  console.log('[getRouteStops] trip_id:', trip_id);
  console.log('[getRouteStops] gtfsData["stop_times"] type:', typeof gtfsData['stop_times'], Array.isArray(gtfsData['stop_times']), 'length:', Array.isArray(gtfsData['stop_times']) ? gtfsData['stop_times'].length : 'N/A');
  const stop_times = Array.isArray(gtfsData['stop_times']) ? gtfsData['stop_times'].filter((st: any) => st.trip_id === trip_id) : [];
  console.log('[getRouteStops] stop_times:', Array.isArray(stop_times) ? stop_times.length : 'N/A', stop_times[0]);
  const stops = Array.isArray(stop_times) ? stop_times.map((st: any) => {
    const stop = Array.isArray(gtfsData['stops']) ? gtfsData['stops'].find((s: any) => s.stop_id === st.stop_id) : null;
    if (!stop) console.log('[getRouteStops] stop not found for stop_id:', st.stop_id);
    return stop ? { ...stop, stop_sequence: st.stop_sequence } : null;
  }).filter(Boolean) : [];
  console.log('[getRouteStops] stops:', Array.isArray(stops) ? stops.length : 'N/A', stops[0]);
  return stops;
}

export function getRouteShape(route_id: string) {
  if (!gtfsData) throw new Error('GTFS data not loaded');
  const routeIdStr = String(route_id);
  console.log('[getRouteShape] gtfsData keys:', Object.keys(gtfsData));
  console.log('[getRouteShape] gtfsData["trips"] type:', typeof gtfsData['trips'], Array.isArray(gtfsData['trips']), 'length:', Array.isArray(gtfsData['trips']) ? gtfsData['trips'].length : 'N/A');
  const trips = Array.isArray(gtfsData['trips']) ? gtfsData['trips'].filter((t: any) => String(t.route_id) === routeIdStr) : [];
  console.log('[getRouteShape] trips:', Array.isArray(trips) ? trips.length : 'N/A', trips[0]);
  if (!Array.isArray(trips) || trips.length === 0) return [];
  const shape_id = trips[0].shape_id;
  console.log('[getRouteShape] shape_id:', shape_id);
  console.log('[getRouteShape] gtfsData["shapes"] type:', typeof gtfsData['shapes'], Array.isArray(gtfsData['shapes']), 'length:', Array.isArray(gtfsData['shapes']) ? gtfsData['shapes'].length : 'N/A');
  const shapes = Array.isArray(gtfsData['shapes']) ? gtfsData['shapes'].filter((s: any) => s.shape_id === shape_id) : [];
  console.log('[getRouteShape] shapes:', Array.isArray(shapes) ? shapes.length : 'N/A', shapes[0]);
  shapes.sort((a: any, b: any) => Number(a.shape_pt_sequence) - Number(b.shape_pt_sequence));
  return Array.isArray(shapes) ? shapes.map((s: any) => ({ lat: Number(s.shape_pt_lat), lng: Number(s.shape_pt_lon) })) : [];
}

// 获取站点的换乘信息
export function getTransfersForStop(stop_id: string) {
  if (!gtfsData) throw new Error('GTFS data not loaded');
  const stopIdStr = String(stop_id);
  
  // 获取所有以该站点为起点的换乘
  const transfers = Array.isArray(gtfsData['transfers']) 
    ? gtfsData['transfers'].filter((t: any) => String(t.from_stop_id) === stopIdStr)
    : [];
  
  // 获取换乘目标站点的信息
  return transfers.map((transfer: any) => {
    const toStop = Array.isArray(gtfsData['stops']) 
      ? gtfsData['stops'].find((s: any) => s.stop_id === transfer.to_stop_id)
      : null;
    
    return {
      from_stop_id: transfer.from_stop_id,
      to_stop_id: transfer.to_stop_id,
      to_stop_name: toStop?.stop_name || '',
      transfer_type: transfer.transfer_type,
      min_transfer_time: transfer.min_transfer_time
    };
  });
}

// 获取站点的到达时间信息
export function getStopTimes(stop_id: string) {
  if (!gtfsData) throw new Error('GTFS data not loaded');
  const stopIdStr = String(stop_id);
  
  // 获取该站点的所有到达时间记录
  const stopTimes = Array.isArray(gtfsData['stop_times']) 
    ? gtfsData['stop_times'].filter((st: any) => st.stop_id === stopIdStr)
    : [];
  
  // 关联行程和路线信息
  return stopTimes.map((stopTime: any) => {
    const trip = Array.isArray(gtfsData['trips']) 
      ? gtfsData['trips'].find((t: any) => t.trip_id === stopTime.trip_id)
      : null;
    
    const route = trip && Array.isArray(gtfsData['routes']) 
      ? gtfsData['routes'].find((r: any) => r.route_id === trip.route_id)
      : null;
    
    return {
      arrival_time: stopTime.arrival_time,
      departure_time: stopTime.departure_time,
      route_id: trip?.route_id,
      route_short_name: route?.route_short_name,
      trip_headsign: trip?.trip_headsign
    };
  });
}

// 计算当前时间到到达时间的分钟数
export function getTimeToArrival(arrival_time: string) {
  if (!arrival_time) return null;
  
  // 解析到达时间 (格式: HH:MM:SS)
  const [hours, minutes] = arrival_time.split(':').map(Number);
  const arrivalDate = new Date();
  arrivalDate.setHours(hours, minutes, 0, 0);
  
  // 计算与当前时间的差值(分钟)
  const now = new Date();
  const diffMs = arrivalDate.getTime() - now.getTime();
  return Math.round(diffMs / (1000 * 60));
}