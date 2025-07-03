"use client"

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useState } from "react"
import type { Map as LeafletMap } from 'leaflet';

// Fix Leaflet's default icon URLs to avoid 404 errors with locale prefix
if (typeof window !== "undefined") {
  // Only run once, not on every component mount
  if (!(L.Icon.Default.prototype as any)._getIconUrl_patched) {
    const iconUrl = "/images/marker-icon.png";
    const iconRetinaUrl = "/images/marker-icon-2x.png";
    const shadowUrl = "/images/marker-shadow.png";
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: iconUrl,
      iconRetinaUrl: iconRetinaUrl,
      shadowUrl: shadowUrl,
    });
    // Mark as patched to prevent multiple patches
    (L.Icon.Default.prototype as any)._getIconUrl_patched = true;
  }
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

// Add a stable key for the MapView component based on its props
const getMapViewKey = (props: {
  userLocation: { lat: number; lng: number },
  reverseDirection?: boolean
}) => {
  if (!props.userLocation) return 'no-location';
  return `mapview-${props.userLocation.lat}-${props.userLocation.lng}-${props.reverseDirection ? 'reverse' : 'normal'}`;
};

// Create a client-only component that wraps the actual MapView implementation
const ClientOnlyMapView = ({ ...props }: any) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) {
    return null;
  }
  
  return <MapView {...props} />;
};

// Export the client-only version as the default component
export default ClientOnlyMapView;

// Export the key generator function for use in parent components
export { getMapViewKey };

const MapView = forwardRef<
  { recenter: () => void } | undefined,
  {
    routes?: Route[];
    stops?: Stop[];
    userLocation: { lat: number; lng: number };
    selectedStopId?: string;
    selectedRouteId?: string;
    reverseDirection?: boolean;
    onRouteSelect?: (routeId: string) => void;
    onStopSelect?: (stopId: string) => void;
    onMapReady?: () => void;
  }
>(function MapView(
  { routes, stops, userLocation, selectedStopId, selectedRouteId, reverseDirection, onRouteSelect, onStopSelect, onMapReady },
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

  // 处理方向反转
  const polylinePoints = useMemo(() => {
    if (!routes) return undefined;
    return reverseDirection ? [...routes].reverse() : routes;
  }, [routes, reverseDirection]);

  const stopMarkers = useMemo(() => {
    if (!stops) return undefined;
    return reverseDirection ? [...stops].reverse() : stops;
  }, [stops, reverseDirection]);

  // Add stable keys for all dynamic content
  const mapKey = useMemo(() => {
    if (!userLocation) return 'no-location';
    return `map-${userLocation.lat}-${userLocation.lng}-${reverseDirection}`;
  }, [userLocation, reverseDirection]);

  return (
    <MapContainer
      key={mapKey}
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
      {/* 绘制线路 polyline */}
      {polylinePoints && (
        <Polyline positions={polylinePoints.map(p => [p.lat, p.lng])} pathOptions={{ color: "blue" }} />
      )}
      {/* 绘制所有站点 marker */}
      {markerIcon && stopMarkers && stopMarkers.map((stop, idx) => (
        <Marker key={`stop-${idx}`} position={{ lat: stop.lat, lng: stop.lng }} icon={markerIcon}>
          <Popup>
            <div>
              <div>{stop.name}</div>
              {stop.transferRoutes && stop.transferRoutes.length > 0 && (
                <div style={{ fontSize: '0.9em', color: '#888' }}>
                  换乘: {stop.transferRoutes.join(', ')}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
      <RecenterControl ref={recenterRef} center={userLocation} />
    </MapContainer>
  )
})

