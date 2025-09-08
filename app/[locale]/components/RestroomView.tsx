"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { motion, useAnimation } from "framer-motion"
import { MapPin, Clock, Navigation } from "lucide-react"

export interface Restroom {
  id: string
  address: string
  distance: number | null
  lat: number
  lon: number
  tags: Record<string, any>
  isCommercial?: boolean
  name?: string
  description?: string
  // 添加其他可能的字段，确保类型定义足够灵活
  [key: string]: any
}

interface RestroomViewProps {
  restrooms: Restroom[];
  loading: boolean;
  error: string | null;
  onRestroomSelect: (restroom: Restroom) => void;
  onClose: () => void;
  showBusinessRestrooms: boolean;
  setShowBusinessRestrooms: (show: boolean) => void;
}

export default function RestroomView({ restrooms, loading, error, onRestroomSelect, onClose, showBusinessRestrooms, setShowBusinessRestrooms }: RestroomViewProps) {
  // 使用从props传入的状态和setter
  // Defensive: always use an array - 移到useEffect之前
  const safeRestrooms = Array.isArray(restrooms) ? restrooms : []

  // 调试原始数据
  useEffect(() => {
    console.log('Total restrooms:', safeRestrooms.length)
    // 显示前3个厕所的标签信息
    safeRestrooms.slice(0, 3).forEach(restroom => {
      console.log('Sample restroom tags:', restroom.tags || 'No tags available')
    })
  }, [safeRestrooms])
  
  // 添加更多调试日志，追踪数据处理过程
  useEffect(() => {
    console.log('[RestroomView] Props received:', { restrooms, loading, error, showBusinessRestrooms });
    
    // 如果传入的restrooms为空，且不是loading状态，显示模拟数据
    if (!loading && safeRestrooms.length === 0 && typeof window !== 'undefined') {
      console.log('[RestroomView] No restrooms provided, creating local mock data for display');
    }
  }, [restrooms, loading, error, showBusinessRestrooms])
  
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

  // 增强过滤逻辑，确保所有类型的厕所数据都能正确显示
  const filteredRestrooms = safeRestrooms.filter(restroom => {
    // 确保isCommercial字段存在，默认显示公共厕所
    if (restroom.isCommercial !== undefined) {
      return showBusinessRestrooms || !restroom.isCommercial;
    }
    
    // 对于没有isCommercial字段的厕所，默认显示
    return true;
  });
  
  // 添加额外的调试日志，显示过滤前后的数据数量
  useEffect(() => {
    console.log('[RestroomView] Filtered restrooms count:', filteredRestrooms.length);
    if (filteredRestrooms.length > 0) {
      console.log('[RestroomView] Sample of filtered restrooms:', 
        filteredRestrooms.slice(0, Math.min(5, filteredRestrooms.length)).map(r => ({id: r.id, name: r.name || r.tags?.name, address: r.address, isCommercial: r.isCommercial, distance: r.distance})));
      // 检查是否有商业厕所被过滤掉
      const commercialCount = safeRestrooms.filter(r => r.isCommercial).length;
      const nonCommercialCount = safeRestrooms.filter(r => !r.isCommercial).length;
      const shownCommercialCount = filteredRestrooms.filter(r => r.isCommercial).length;
      console.log(`[RestroomView] Restroom breakdown - Total: ${safeRestrooms.length}, Commercial: ${commercialCount}, Public: ${nonCommercialCount}, Shown: ${filteredRestrooms.length} (Commercial shown: ${shownCommercialCount})`);
    } else if (safeRestrooms.length > 0) {
      console.log(`[RestroomView] No restrooms shown after filtering, but received ${safeRestrooms.length} restrooms initially`);
      console.log(`[RestroomView] Show business restrooms: ${showBusinessRestrooms}`);
      // 显示所有未被过滤的厕所类型分布
      const commercialCount = safeRestrooms.filter(r => r.isCommercial).length;
      const nonCommercialCount = safeRestrooms.filter(r => !r.isCommercial).length;
      console.log(`[RestroomView] Restroom types - Commercial: ${commercialCount}, Public: ${nonCommercialCount}`);
    }
  }, [filteredRestrooms, safeRestrooms, showBusinessRestrooms]);

  if (loading) {
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
        <div className="flex-1 flex justify-center items-center">
          <div className="w-12 h-12 text-white animate-spin border-4 border-t-4 border-gray-600 rounded-full"></div>
        </div>
      </motion.div>
    )
  }

  if (error) {
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
        <div className="flex-1 flex justify-center items-center">
          <p className="text-red-400 text-center">{error}</p>
        </div>
      </motion.div>
    )
  }

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
      <div className="px-4 py-2 flex items-center justify-between border-b border-gray-600">
        <span className="text-white text-sm">显示商业场所厕所</span>
        <Switch
          checked={showBusinessRestrooms}
          onCheckedChange={setShowBusinessRestrooms}
        />
      </div>
      <div className="overflow-y-auto px-4 flex-grow pb-4">
        {filteredRestrooms.length === 0 && (
          <div className="text-gray-400 text-center py-8">
            <p>No restrooms found nearby.</p>
            <p className="text-xs mt-2">Try changing your location or enabling business restrooms</p>
          </div>
        )}
        {filteredRestrooms.map((restroom, index) => (
          <div
            key={restroom.id || `restroom-${index}`}
            onClick={() => onRestroomSelect(restroom)}
            className="p-4 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 cursor-pointer mb-3"
          >
            {/* 优先显示name字段，如果没有则显示address */}
            <div className="font-bold text-white text-lg truncate">
              {restroom.name || restroom.tags?.name || restroom.address}
            </div>
            {/* 如果name和address不同，则显示address */}
            {restroom.name && restroom.address && restroom.name !== restroom.address && (
              <div className="text-gray-400 text-sm truncate mt-1">
                {restroom.address}
              </div>
            )}
            <div className="mt-1 text-gray-300 text-sm">
              {/* 优先显示description或comment字段，如果有的话 */}
              {restroom.description || restroom.tags?.description || restroom.tags?.comment ? (
                <div className="mb-2">
                  <span className="font-mono text-xs text-gray-400">Description:</span>
                  <span>{restroom.description || restroom.tags?.description || restroom.tags?.comment}</span>
                </div>
              ) : null}
              
              {/* 显示其他标签信息，但避免显示已经单独显示的字段 */}
              {restroom.tags && Object.keys(restroom.tags).length > 0 ? (
                Object.entries(restroom.tags)
                  .filter(([key]) => !['name', 'description', 'comment', 'address'].includes(key.toLowerCase()))
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className="font-mono text-xs text-gray-400">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))
              ) : null}
              {/* 显示是否为商业厕所 */}
              <div className="mt-1 flex items-center gap-1">
                <span className="font-mono text-xs text-gray-400">Type:</span>
                <span className={restroom.isCommercial ? "text-green-400" : "text-blue-400"}>
                  {restroom.isCommercial ? "Business" : "Public"}
                </span>
              </div>
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
          </div>
        ))}
      </div>
    </motion.div>
  )
}
