"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { motion, useAnimation } from "framer-motion"

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
  const [currentDirectionIndex, setCurrentDirectionIndex] = useState(0)
  const controls = useAnimation()

  // 拖动面板吸附位置
  const [panelPositions, setPanelPositions] = useState({ top: 100, middle: 500, bottom: 800 })
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPanelPositions({
        top: 100,
        middle: window.innerHeight * 0.6,
        bottom: window.innerHeight - 140,
      })
      controls.start({ y: window.innerHeight * 0.6 })
    }
  }, [controls])

  const onDragEnd = (event: any, info: any) => {
    const { point, velocity } = info
    const currentY = point.y
    const { top, middle, bottom } = panelPositions
    if (Math.abs(velocity.y) > 300) {
      controls.start({ y: velocity.y < 0 ? top : bottom })
    } else {
      const diffTop = Math.abs(currentY - top)
      const diffMiddle = Math.abs(currentY - middle)
      const diffBottom = Math.abs(currentY - bottom)
      if (diffTop < diffMiddle && diffTop < diffBottom) controls.start({ y: top })
      else if (diffMiddle < diffTop && diffMiddle < diffBottom) controls.start({ y: middle })
      else controls.start({ y: bottom })
    }
  }

  if (!selectedRoute) {
    console.error('StopsView: selectedRoute is null or undefined')
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-red-500">错误: 未选择路线</div>
      </div>
    )
  }

  if (loadingStops) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-4">加载路线数据中...</span>
      </div>
    )
  }

  if (!selectedRoute.directions || selectedRoute.directions.length === 0) {
    console.warn('StopsView: No directions data available', selectedRoute)
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-yellow-500">警告: 该路线无方向数据</div>
      </div>
    )
  }

  const directions = selectedRoute.directions
  const currentDirection = directions[currentDirectionIndex] || directions[0]
  
  if (!currentDirection?.stops) {
    console.error('StopsView: No stops data for direction', currentDirection)
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-red-500">错误: 无站点数据</div>
      </div>
    )
  }

  const stops = currentDirection.stops
  const destination = currentDirection?.trip_headsign || ""
  // 计算当前位置到终点的剩余站点数（如有定位，可进一步优化）
  const stopsRemaining = stops.length > 0 ? `${stops.length} 站` : "无"

  return (
    <div className="relative h-screen w-full overflow-hidden font-sans">
      {/* 1. 背景地图 */}
      <div className="absolute inset-0 z-0">
        <MapView
          userLocation={userLocation}
          routePolyline={routePolyline}
          stops={stops}
          reverseDirection={false}
        />
      </div>

      {/* 2. 可拖动面板 */}
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
        {/* 面板 Header (可拖动区域) */}
        <div className="p-4 flex-shrink-0 text-center cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-2" />
          <div className="text-3xl font-bold text-blue-400">{selectedRoute.route_short_name}</div>
          <div className="text-lg text-white mt-1">{selectedRoute.route_long_name}</div>
        </div>

        {/* 3. 方向切换按钮 - 横向滚动 */}
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="flex overflow-x-auto no-scrollbar gap-2">
            {directions.map((dir, idx) => (
              <button
                key={`${dir.direction_id}_${dir.trip_headsign}_${selectedRoute.route_id}`}
                onClick={() => setCurrentDirectionIndex(idx)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors
                  ${currentDirectionIndex === idx ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-300"}
                `}
                style={{
                  minWidth: "max-content",
                  maxWidth: 240,
                  whiteSpace: "nowrap"
                }}
              >
                {dir.trip_headsign}
              </button>
            ))}
          </div>
        </div>

        {/* 4. 终点站和剩余站点数 */}
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-3 mt-2">
            <span className="text-white text-xl font-bold">{destination}</span>
            <span className="text-gray-400 text-sm">{stopsRemaining}</span>
          </div>
        </div>

        {/* 5. 站点列表 */}
        <div className="overflow-y-auto px-4 flex-grow pb-4">
          {stops.length === 0 ? (
            <div className="text-gray-400 mt-4">暂无站点数据</div>
          ) : (
            stops.map((stop, idx) => (
              <div key={stop.stop_id} className="flex items-start gap-4 py-3 border-b border-gray-700">
                <div className="flex flex-col items-center mr-2">
                  <div className="w-3 h-3 rounded-full border-2 border-blue-400 bg-blue-400"></div>
                  {idx !== stops.length - 1 && (
                    <div className="w-0.5 flex-grow bg-blue-400" style={{ minHeight: "2rem" }}></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">{stop.stop_name}</div>
                  {/* 预计到达时间（如有） */}
                  {/* <div className="text-yellow-400 text-xs font-semibold mt-1">{stop.time}</div> */}
                  {/* 换乘车次（如有） */}
                  {/* <div className="flex flex-wrap gap-1 mt-1">
                    {stop.transfers?.map((t: string, i: number) => (
                      <span key={i} className="bg-gray-600 text-gray-200 text-xs font-bold px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div> */}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}

// 只需安装 framer-motion，无需修改此文件内容