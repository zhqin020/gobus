"use client"

import { useState, useEffect } from "react"
import { motion, useAnimation } from "framer-motion"
import { MapPin, Clock, Navigation } from "lucide-react"

export interface Restroom {
  id: string
  address: string
  distance: number | null
  lat: number
  lon: number
  tags: Record<string, any>
}

interface RestroomViewProps {
  restrooms: Restroom[]
  loading: boolean
  error: string | null
  onRestroomSelect: (restroom: Restroom) => void
  onClose?: () => void
}

export default function RestroomView({ restrooms, loading, error, onRestroomSelect, onClose }: RestroomViewProps) {
  const controls = useAnimation()
  // 设置默认停靠在屏幕中间
  useEffect(() => {
    if (typeof window !== "undefined") {
      const middle = window.innerHeight * 0.6
      controls.start({ y: middle })
    }
  }, [controls])

  const onDragEnd = (event: any, info: any) => {
    const { point } = info
    const currentY = point.y
    // 允许在任意位置停靠
    controls.start({ y: currentY })
  }

  if (loading) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-[#181B1F] rounded-t-2xl shadow-lg max-h-[45vh] overflow-y-auto flex justify-center items-center">
        <div className="w-12 h-12 text-white animate-spin border-4 border-t-4 border-gray-600 rounded-full"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-[#181B1F] rounded-t-2xl shadow-lg max-h-[45vh] overflow-y-auto">
        <p className="text-red-400 text-center">{error}</p>
      </div>
    )
  }

  // Defensive: always use an array
  const safeRestrooms = Array.isArray(restrooms) ? restrooms : []

  return (
    <motion.div
      drag="y"
      onDragEnd={onDragEnd}
      animate={controls}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      dragConstraints={{ top: 0, bottom: typeof window !== "undefined" ? window.innerHeight : 900 }}
      dragElastic={{ top: 0.05, bottom: 0.05 }}
      className="absolute top-0 left-0 right-0 h-full bg-[#23272F] rounded-t-2xl shadow-2xl flex flex-col z-10"
      style={{ touchAction: "none" }}
    >
      <div className="p-4 flex-shrink-0 text-center cursor-grab active:cursor-grabbing">
        <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-2" />
        <div className="text-white text-lg font-semibold">Nearby Restrooms</div>
        <button
          onClick={onClose}
          aria-label="Close restrooms panel"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-700"
        >
          ✕
        </button>
      </div>
      <div className="overflow-y-auto px-4 flex-grow pb-4">
        {safeRestrooms.length === 0 && <p className="text-gray-400 text-center">No restrooms found nearby.</p>}
        {safeRestrooms.map((restroom, index) => (
          <div
            key={restroom.id}
            onClick={() => onRestroomSelect(restroom)}
            className="p-4 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 cursor-pointer"
          >
            <div className="font-bold text-white text-lg truncate">{restroom.address}</div>
            <div className="mt-1 text-gray-300 text-sm">
              {Object.entries(restroom.tags ?? {}).map(([key, value]) => (
                <div key={key} className="flex items-center gap-1">
                  <span className="font-mono text-xs text-gray-400">{key}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 flex justify-between items-center text-xs">
              <div className="flex items-center text-gray-300">
                <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>
                  {typeof restroom.distance === "number"
                    ? `${restroom.distance.toFixed(2)} km away`
                    : "Distance unavailable"}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${restroom.lat},${restroom.lon}`
                  window.open(url, "_blank")
                }}
                aria-label="Navigate to restroom"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-600"
              >
                <Navigation className="w-5 h-5" />
                <span className="text-xs">Navigate</span>
              </button>
            </div>
            {index !== restrooms.length - 1 && (
              <div className="border-t border-gray-600 mt-3" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
