"use client"

import { useState, useEffect } from "react"
import { motion, useAnimation } from "framer-motion"
import { MapPin, CircleParking, Bus, Train } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StopInfoPanelProps {
  stop: {
    stop_id: string
    stop_name: string
    stop_address?: string
  }
  routes: Array<{
    route_id: string
    route_short_name: string
    trip_headsign: string
    route_type?: number
  }>
  onClose: () => void
}

export default function StopInfoPanel({ stop, routes, onClose }: StopInfoPanelProps) {
  const controls = useAnimation()
  const [panelPositions, setPanelPositions] = useState({ top: 100, middle: 500, bottom: 800 })

  useEffect(() => {
    if (typeof window !== "undefined") {
      const middle = window.innerHeight * 0.6
      setPanelPositions({ top: 100, middle, bottom: window.innerHeight - 140 })
      controls.start({ y: middle })
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

  return (
    <motion.div
      drag="y"
      onDragEnd={onDragEnd}
      animate={controls}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      dragConstraints={{ top: 0, bottom: typeof window !== "undefined" ? window.innerHeight : 900 }}
      dragElastic={{ top: 0.05, bottom: 0.05 }}
      className="absolute left-0 right-0 bg-[#23272F] rounded-t-2xl shadow-2xl flex flex-col z-20"
      style={{ touchAction: "none", height: '60vh', top: panelPositions.middle }}
    >
      <div className="p-4 flex-shrink-0 text-center cursor-grab active:cursor-grabbing flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CircleParking className="w-6 h-6 text-[#3DDC97]" />
          <div className="text-2xl font-bold text-white">{stop.stop_name}</div>
        </div>
        <button
          onClick={onClose}
          className="text-white text-xl font-bold px-3 py-1 rounded hover:bg-gray-700"
          aria-label="Close stop info panel"
        >
          ×
        </button>
      </div>
      <div className="px-4 pb-2 flex-shrink-0 text-white">
        <div><strong>Stop ID:</strong> {stop.stop_id}</div>
        {stop.stop_address && <div><strong>Address:</strong> {stop.stop_address}</div>}
      </div>
      <div className="overflow-y-auto px-4 flex-grow pb-4">
        <h3 className="text-white text-lg font-semibold mb-2">Routes serving this stop</h3>
        {routes.length === 0 && (
          <div className="text-gray-400">No routes found for this stop.</div>
        )}
        {routes.map((route) => {
          const isTrain = route.route_type === 2 // Assuming 2 means train
          const Icon = isTrain ? Train : Bus
          return (
            <Card
              key={route.route_id}
              className="bg-[#23272F] border border-[#23272F] shadow-md cursor-pointer mb-2"
            >
              <CardContent className="p-4 flex items-center gap-4">
                <Icon className="w-5 h-5 text-[#3DDC97]" />
                <div className="font-bold text-[#3DDC97]">{route.route_short_name}</div>
                <div className="text-white">{route.trip_headsign}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </motion.div>
  )
}
