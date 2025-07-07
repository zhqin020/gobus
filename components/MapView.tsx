"use client"

import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker } from "react-leaflet"
import L, { DivIcon } from "leaflet"
import "leaflet/dist/leaflet.css"
import { useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from "react"
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

const MapView = forwardRef<
  { recenter: () => void } | undefined,
  {
    userLocation: { lat: number; lng: number },
    routePolyline?: Array<{ lat: number; lng: number }>, // 新增 prop: routePolyline
    stops?: Array<{ lat: number; lng: number; name: string; transferRoutes?: string[] }>, // 新增 prop: stops
    reverseDirection?: boolean // 新增 prop: reverseDirection
  }
>(function MapView(
  { userLocation, routePolyline, stops, reverseDirection },
  ref
) {
  const recenterRef = useRef<{ recenter: () => void }>(null);

  useImperativeHandle(ref, () => ({
    recenter: () => {
      console.log('[MapView] recenter called');
      recenterRef.current?.recenter();
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

  // 处理方向反转
  const polylinePoints = useMemo(() => {
    if (!routePolyline) return undefined;
    return reverseDirection ? [...routePolyline].reverse() : routePolyline;
  }, [routePolyline, reverseDirection]);

  // Convert stops to { lat, lng, name, transferRoutes? } format and filter invalid ones
  const validStops = Array.isArray(stops)
    ? stops
        .filter(
          stop =>
            stop &&
            typeof stop.stop_lat === "number" &&
            typeof stop.stop_lon === "number" &&
            Number.isFinite(stop.stop_lat) &&
            Number.isFinite(stop.stop_lon)
        )
        .map(stop => ({
          lat: stop.stop_lat,
          lng: stop.stop_lon,
          name: stop.stop_name,
          transferRoutes: stop.transferRoutes || [],
        }))
    : [];

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
      {/* 绘制线路 polyline，颜色改为浅蓝色，宽度等于小圆圈半径 */}
      {polylinePoints && (
        <Polyline positions={polylinePoints.map(p => [p.lat, p.lng])} pathOptions={{ color: "#7ec8e3", weight: 7 }} />
      )}
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
                    <div style={{ fontSize: '0.9em', color: '#888' }}>
                      换乘: {stop.transferRoutes.join(', ')}
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
      <RecenterControl ref={recenterRef} center={userLocation} />
    </MapContainer>
  )
})

export default MapView