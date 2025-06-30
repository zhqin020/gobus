"use client"

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import type { Map as LeafletMap } from 'leaflet';

// 修复默认 marker 图标丢失
const DefaultIcon = L.icon({
  iconUrl: "/images/marker-icon.png",
  shadowUrl: "/images/marker-shadow.png",
  iconRetinaUrl: "/images/marker-icon-2x.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

if (typeof window !== "undefined") {
  L.Marker.prototype.options.icon = DefaultIcon
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

  useEffect(() => {
    // 仅用于触发 marker icon 修复
  }, [])

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
      <Marker position={userLocation}>
        <Popup>你在这里</Popup>
      </Marker>
    </MapContainer>
  )
})

export default MapView
