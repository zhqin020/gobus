"use client"

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
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

const MapView = forwardRef<
  { recenter: () => void } | undefined,
  { userLocation: { lat: number; lng: number } }
>(function MapView(
  { userLocation },
  ref
) {
  const mapRef = useRef<LeafletMap | null>(null)

  useImperativeHandle(ref, () => ({
    recenter: () => {
      if (mapRef.current) {
        mapRef.current.setView(userLocation, 14)
      }
    }
  }))

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

  return (
    <MapContainer
      center={userLocation}
      zoom={14}
      style={{ width: "100%", height: "100%", zIndex: 1 }}
      scrollWheelZoom={false}
      whenCreated={(mapInstance: LeafletMap) => { mapRef.current = mapInstance }}
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
    </MapContainer>
  )
})

export default MapView
