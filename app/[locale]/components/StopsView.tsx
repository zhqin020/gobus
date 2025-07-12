"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { motion, useAnimation } from "framer-motion"
import { Circle, CircleDot, CircleCheck, Bus, TramFront } from "lucide-react"

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false })

// --- Type Definitions ---
interface Stop {
  stop_id: string
  stop_name: string
  stop_desc?: string
  stop_lat: number
  stop_lon: number
  stop_sequence: number
  arrival_time?: string
  departure_time?: string
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

interface TransferRoute {
  route_id: string
  route_short_name: string
  route_type: number
}

interface TransferData {
  subway: TransferRoute[]
  bus: TransferRoute[]
}

interface StopsViewProps {
  selectedRoute: Route | null
  routePolyline: any[]
  userLocation: { lat: number; lng: number } | null
  loadingStops: boolean
  onRecenter: () => void
  onDirectionChange: (reverse: boolean) => void
}

// --- Helper Functions ---
const calculateRelativeTime = (timeStr?: string, baseTimeStr?: string) => {
  if (!timeStr || !baseTimeStr) return ''
  const timeToMinutes = (time: string) => {
    const [h, m, s] = time.split(':').map(Number)
    return h * 60 + m + (s || 0) / 60
  }
  const diff = timeToMinutes(timeStr) - timeToMinutes(baseTimeStr)
  return `+${Math.round(diff)} min`
}

// --- Main Component ---
export default function StopsView({
  selectedRoute,
  routePolyline,
  userLocation,
  loadingStops,
}: StopsViewProps) {
  const [currentDirectionIndex, setCurrentDirectionIndex] = useState(0)
  const [transferLines, setTransferLines] = useState<Record<string, TransferData>>({});
  const controls = useAnimation()
  const [panelPositions, setPanelPositions] = useState({ top: 100, middle: 500, bottom: 800 })

  const currentDirection = selectedRoute?.directions?.[currentDirectionIndex]
  const stops = currentDirection?.stops ?? []

  // --- Effects ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const middle = window.innerHeight * 0.6
      setPanelPositions({ top: 100, middle, bottom: window.innerHeight - 140 })
      controls.start({ y: middle })
    }
  }, [controls])

  useEffect(() => {
    if (!stops || stops.length === 0 || !selectedRoute) return;

    const fetchTransferLines = async () => {
      const transfers: Record<string, TransferData> = {};
      const promises = stops.map(async (stop) => {
        try {
          const response = await fetch('/api/gtfs/transfers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stop_lat: stop.stop_lat,
              stop_lon: stop.stop_lon,
              current_route_id: selectedRoute.route_id,
            }),
          });
          if (response.ok) {
            const data: TransferData = await response.json();
            if (data.subway.length > 0 || data.bus.length > 0) {
              transfers[stop.stop_id] = data;
            }
          }
        } catch (error) {
          console.error(`Failed to fetch transfers for stop ${stop.stop_id}:`, error);
        }
      });

      await Promise.all(promises);
      setTransferLines(transfers);
    };

    fetchTransferLines();
  }, [stops, selectedRoute]);


  // --- Event Handlers ---
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

  // --- Render Logic ---
  if (loadingStops) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-4">Loading route data...</span>
      </div>
    )
  }

  if (!selectedRoute || !currentDirection) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-red-500">Error: Route or direction data is not available.</div>
      </div>
    )
  }

  const destination = currentDirection.trip_headsign || ""
  const stopsRemaining = stops.length > 0 ? `${stops.length} stops` : "None"

  return (
    <div className="relative h-screen w-full overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
        <MapView
          userLocation={userLocation ?? { lat: 0, lng: 0 }}
          routePolyline={routePolyline}
          stops={stops.map(stop => ({
            lat: stop.stop_lat,
            lng: stop.stop_lon,
            name: stop.stop_name,
            stop_id: stop.stop_id,
            transferRoutes: [], // This can be updated if needed
            stopTimes: stop.arrival_time ? [{ arrival_time: stop.arrival_time }] : undefined,
          }))}
          reverseDirection={false}
        />
      </div>

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
          <div className="text-3xl font-bold text-blue-400">{selectedRoute.route_short_name}</div>
          <div className="text-lg text-white mt-1">{selectedRoute.route_long_name}</div>
        </div>

        <div className="px-4 pb-2 flex-shrink-0">
          <div className="flex overflow-x-auto no-scrollbar gap-2">
            {selectedRoute.directions.map((dir, idx) => (
              <button
                key={`${dir.direction_id}_${dir.trip_headsign}`}
                onClick={() => setCurrentDirectionIndex(idx)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors
                  ${currentDirectionIndex === idx ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-300"}
                `}
              >
                {dir.trip_headsign}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-3 mt-2">
            <span className="text-white text-xl font-bold">{destination}</span>
            <span className="text-gray-400 text-sm">{stopsRemaining}</span>
          </div>
        </div>

        <div className="overflow-y-auto px-4 flex-grow pb-4">
          <ol className="relative border-l border-gray-600 ml-3">
            {stops.map((stop, idx) => (
              <li key={stop.stop_id} className="mb-4 ml-8">
                <span className="absolute flex items-center justify-center w-6 h-6 bg-gray-700 rounded-full -left-3 ring-4 ring-gray-800">
                  {idx === 0 ? <CircleDot className="w-4 h-4 text-green-400" /> :
                   idx === stops.length - 1 ? <CircleCheck className="w-4 h-4 text-red-400" /> :
                   <Circle className="w-4 h-4 text-blue-400" />}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-white">{stop.stop_name}</div>
                  
                  {stop.arrival_time && stops[0]?.departure_time && (
                    <div className="text-yellow-400 text-xs font-semibold mt-1">
                      {calculateRelativeTime(stop.arrival_time, stops[0].departure_time)}
                    </div>
                  )}

                  {transferLines[stop.stop_id] && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {transferLines[stop.stop_id].subway.map((t) => (
                        <div key={t.route_id} className="bg-blue-800 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <TramFront className="w-3 h-3" />
                          {t.route_short_name}
                        </div>
                      ))}
                      {transferLines[stop.stop_id].bus.map((t) => (
                        <div key={t.route_id} className="bg-gray-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Bus className="w-3 h-3" />
                          {t.route_short_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </motion.div>
    </div>
  )
}
