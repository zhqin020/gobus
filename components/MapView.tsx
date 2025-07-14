"use client"

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker } from "react-leaflet"
import L, { DivIcon } from "leaflet"
import "leaflet/dist/leaflet.css"
import { useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useState } from "react"
import type { Map as LeafletMap } from 'leaflet';

// Fix Leaflet's default icon URLs to avoid 404 errors with locale prefix
if (typeof window !== "undefined") {
  const iconUrl = window.location.origin + "/images/marker-icon.png";
  const iconRetinaUrl = window.location.origin + "/images/marker-icon-2x.png";
  const shadowUrl = window.location.origin + "/images/marker-shadow.png";
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: iconUrl,
    iconRetinaUrl: iconRetinaUrl,
    shadowUrl: shadowUrl,
  });
}

const RecenterControl = forwardRef<{ recenter: () => void }, { center: { lat: number; lng: number } }>(function RecenterControl({ center }, ref) {
  const map = useMap();

  useImperativeHandle(ref, () => ({
    recenter: () => {
      console.log('[RecenterControl] recenter called with center:', center);
      map.flyTo(center, 14);
    }
  }), [center, map]);

  return null;
});

interface Restroom {
  id: string;
  lat: number;
  lon: number;
  name: string;
  address?: string;
}

const MapAccessor = ({ onMap }: { onMap: (map: LeafletMap) => void }) => {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
};

const MapView = forwardRef<
  { recenter: () => void; centerOnRestroom: (coords: { lat: number, lon: number }) => void; } | undefined,
  {
    userLocation: { lat: number; lng: number },
    routePolyline?: Array<{ lat: number; lng: number }>, // 新增 prop: routePolyline
    stops?: Array<{ 
      lat: number; 
      lng: number; 
      name: string; 
      stop_id?: string;
      transferRoutes?: string[];
      stopTimes?: Array<{
        arrival_time: string;
        route_short_name?: string;
        trip_headsign?: string;
      }>; 
    }>, // 新增 prop: stops
    reverseDirection?: boolean, // 新增 prop: reverseDirection
    restrooms?: Restroom[],
    selectedRestroomId?: string | null
  }
>(function MapView(
  { userLocation, routePolyline, stops, reverseDirection, restrooms, selectedRestroomId },
  ref
) {
  const recenterRef = useRef<{ recenter: () => void }>(null);
  const [map, setMap] = useState<LeafletMap | null>(null);

  useImperativeHandle(ref, () => ({
    recenter: () => {
      console.log('[MapView] recenter called');
      recenterRef.current?.recenter();
    },
    centerOnRestroom: (coords: { lat: number, lon: number }) => {
      if (map) {
        map.flyTo([coords.lat, coords.lon], 16);
      }
    }
  }));


  // 只在客户端创建 DefaultIcon，并传递给 Marker
  const markerIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const getAbsoluteUrl = (path: string) => window.location.origin + path;
    return L.icon({
      iconUrl: getAbsoluteUrl("/images/marker-icon.png"),
      shadowUrl: getAbsoluteUrl("/images/marker-shadow.png"),
      iconRetinaUrl: getAbsoluteUrl("/images/marker-icon-2x.png"),
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }, [userLocation]);

  // 终点图标（红色旗帜）
  const endIcon = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return new DivIcon({
      html: `<div style="font-size:22px;line-height:1;">🚩</div>`,
      className: "",
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });
  }, []);

  const restroomIcon = useMemo(() => L.icon({
    iconUrl: '/images/restroom-icon.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }), []);

  const selectedRestroomIcon = useMemo(() => L.icon({
    iconUrl: '/images/restroom-icon-selected.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  }), []);


  // 处理方向反转
  const sortedStops = useMemo(() => {
    if (!stops) return [];
    // The stops are already sorted when passed as props.
    // We just need to handle the reverse direction toggle.
    const sorted = [...stops];
    return reverseDirection ? sorted.reverse() : sorted;
  }, [stops, reverseDirection]);

  // Filter out any invalid stops
  const validStops = useMemo(() => sortedStops
    .filter(stop => stop && typeof stop.lat === 'number' && typeof stop.lng === 'number'), 
    [sortedStops]);



  return (
    <MapContainer
      center={userLocation}
      zoom={14}
      style={{ width: "100%", height: "100%", zIndex: 1 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markerIcon && (
        <Marker position={userLocation} icon={markerIcon}>
          <Popup>你在这里</Popup>
        </Marker>
      )}
      {/* 绘制线路 polyline，优先使用 routePolyline */}
      {routePolyline && routePolyline.length > 0 ? (
        <Polyline positions={routePolyline.map(p => [p.lat, p.lng])} pathOptions={{ color: "#3498db", weight: 5 }} />
      ) : validStops.length > 0 ? (
        <Polyline positions={validStops.map(p => [p.lat, p.lng])} pathOptions={{ color: "#7ec8e3", weight: 7 }} />
      ) : null}

      {/* 绘制所有站点，首末站特殊处理 */}
      {validStops && Array.isArray(validStops) && validStops.map((stop, idx) => {
        // 起点
        if (idx === 0) {
          return (
            <CircleMarker
              key={idx}
              center={{ lat: stop.lat, lng: stop.lng }}
              radius={10.5} // 1.5倍
              pathOptions={{ color: "#7ec8e3", fillColor: "#7ec8e3", fillOpacity: 1, weight: 2 }}
            >
              <Popup>
                <div>
                  <div>{stop.name}（起点）</div>
                  {stop.transferRoutes && Array.isArray(stop.transferRoutes) && stop.transferRoutes.length > 0 && (
                    <div style={{ fontSize: '0.9em', color: '#888', marginBottom: '8px' }}>
                      换乘: {stop.transferRoutes.join(', ')}
                    </div>
                  )}
                  {stop.stopTimes && Array.isArray(stop.stopTimes) && stop.stopTimes.length > 0 && (
                    <div style={{ fontSize: '0.9em' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>到达时间:</div>
                      {stop.stopTimes.map((time: { arrival_time: string, route_short_name?: string, trip_headsign?: string }, i: number) => {
                        const minsToArrival = time.arrival_time ? 
                          Math.round((new Date(`1970-01-01T${time.arrival_time}Z`).getTime() - new Date().getTime()) / (1000 * 60)) : null;
                        return (

                          <div key={i} style={{ marginBottom: '4px' }}>
                            {time.route_short_name && <span>{time.route_short_name}路 </span>}
                            {time.trip_headsign && <span>往{time.trip_headsign} </span>}
                            {time.arrival_time && (
                              <span>
                                {time.arrival_time.substring(0, 5)}
                                {minsToArrival !== null && minsToArrival > 0 && (
                                  <span style={{ color: minsToArrival <= 5 ? '#f5222d' : '#52c41a' }}>
                                    (约{minsToArrival}分钟)
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        }
        // 终点
        if (idx === validStops.length - 1 && endIcon) {
          return (
            <Marker
              key={idx}
              position={{ lat: stop.lat, lng: stop.lng }}
              icon={endIcon}
            >
              <Popup>
                <div>
                  <div>{stop.name}（终点）</div>
                  {stop.transferRoutes && Array.isArray(stop.transferRoutes) && stop.transferRoutes.length > 0 && (
                    <div style={{ fontSize: '0.9em', color: '#888' }}>
                      换乘: {stop.transferRoutes.join(', ')}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        }
        // 其他普通站点
        return (
          <CircleMarker
            key={idx}
            center={{ lat: stop.lat, lng: stop.lng }}
            radius={7}
            pathOptions={{ color: "#7ec8e3", fillColor: "#fff", fillOpacity: 1, weight: 2 }}
          >
            <Popup>
              <div>
                <div>{stop.name}</div>
                {stop.transferRoutes && Array.isArray(stop.transferRoutes) && stop.transferRoutes.length > 0 && (
                  <div style={{ fontSize: '0.9em', color: '#888' }}>
                    换乘: {stop.transferRoutes.join(', ')}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
      {/* Render restroom markers */}
          {restrooms && restrooms.map((restroom) => {
            const isSelected = restroom.id === selectedRestroomId;
            if (typeof restroom.lat !== 'number' || typeof restroom.lon !== 'number') {
              console.warn(`Invalid restroom marker coordinates for id ${restroom.id}:`, restroom);
              return null;
            }
            return (
              <Marker
                key={restroom.id}
                position={{ lat: restroom.lat, lng: restroom.lon }}
                icon={isSelected ? selectedRestroomIcon : restroomIcon}
              >
                <Popup>{restroom.address}</Popup>
              </Marker>
            );
          })}
      <MapAccessor onMap={setMap} />
      <RecenterControl ref={recenterRef} center={userLocation} />
    </MapContainer>

  )
})

export default MapView
