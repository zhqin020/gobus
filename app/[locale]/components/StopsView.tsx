"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import dynamic from "next/dynamic"

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false })

interface Stop {
  stop_id: string
  stop_name: string
  stop_desc?: string
  stop_lat: number
  stop_lon: number
  stop_sequence: number
}

interface Direction {
  direction_id: number
  trip_headsign: string
  stops: Stop[]
}

interface Route {
  route_id: number
  route_short_name: string
  route_long_name: string
  route_desc?: string
  directions: Direction[]
}

interface StopsViewProps {
  selectedRoute: Route | null
  routePolyline: any[]
  userLocation: { lat: number; lng: number } | null
  loadingStops: boolean
  onRecenter: () => void
  onDirectionChange: (reverse: boolean) => void
}

export default function StopsView({
  selectedRoute,
  routePolyline,
  userLocation,
  loadingStops,
  onRecenter,
  onDirectionChange
}: StopsViewProps) {
  const [reverseDirection, setReverseDirection] = useState(false)

  const handleDirectionChange = () => {
    const newDirection = !reverseDirection
    setReverseDirection(newDirection)
    onDirectionChange(newDirection)
  }

  // 确保selectedRoute和directions存在
  if (!selectedRoute || !selectedRoute.directions) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="text-gray-400">加载路线数据中...</div>
      </div>
    )
  }

  // 获取当前方向的数据
  const directionIndex = reverseDirection ? 
    Math.min(1, selectedRoute.directions.length - 1) : 0
  const currentDirection = selectedRoute.directions[directionIndex]
  const currentStops = currentDirection?.stops || []
  const currentHeadSign = currentDirection?.trip_headsign || ''

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="relative h-64 bg-gray-800">
        <div className="absolute top-4 left-4">
          <div className="text-4xl font-bold text-blue-400">{selectedRoute.route_short_name}</div>
          <div className="text-lg text-white mt-2">{selectedRoute.route_long_name}</div>
        </div>
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 pointer-events-auto">
          <button
            className="w-12 h-12 bg-[#23272F] rounded-full flex items-center justify-center border-2 border-blue-400 focus:outline-none"
            onClick={handleDirectionChange}
            aria-label="反转线路方向"
          >
            <ArrowRight className={`w-6 h-6 text-blue-400 transition-transform ${reverseDirection ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {/* 地图显示线路和站点 */}
        <div className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
          {routePolyline && Array.isArray(routePolyline) && routePolyline.length > 0 && userLocation && (
            <MapView
              userLocation={userLocation}
              routePolyline={reverseDirection ? [...routePolyline].reverse() : routePolyline}
              stops={reverseDirection ? [...currentStops].reverse() : currentStops}
              reverseDirection={reverseDirection}
            />
          )}
        </div>
      </div>

      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-blue-400" />
          <span className="font-medium">{currentHeadSign}</span>
        </div>
      </div>

      <div className="p-4">
        {loadingStops ? (
          <div className="text-gray-400">加载中...</div>
        ) : currentStops.length === 0 ? (
          <div className="text-gray-400">暂无站点数据</div>
        ) : (
          <div className="space-y-4">
            {currentStops.map((stop) => (
              <div key={`${stop.stop_id}-${directionIndex}`} className="flex items-center gap-4">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <div className="flex-1">
                  <div className="font-medium">{stop.stop_name}</div>
                  {stop.stop_desc && <div className="text-gray-400 text-sm">{stop.stop_desc}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}