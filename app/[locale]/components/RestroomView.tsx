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
        {safeRestrooms.length === 0 && <p className="text-gray-400 text-center">No restrooms found nearby.</p>}
        {safeRestrooms
          .filter(restroom => {
            // 添加调试日志
            console.log('Filtering restroom:', restroom.id, restroom.address, restroom);
            
            // 确保标签存在，如果不存在则使用空对象
            const tags = restroom.tags && typeof restroom.tags === 'object' ? restroom.tags : {};
            
            // 检查标签键名是否包含商业场所相关词汇
            const hasBusinessTagInKeys = Object.keys(tags).some(key => 
              [
                'restaurant', 'cafe', 'hotel', 'shopping_mall', 'gas_station',
                'convenience_store', 'pharmacy', 'bank', 'atm', 'hospital',
                'library', 'museum', 'theater', 'cinema', 'bar', 'pub'
              ].includes(String(key).toLowerCase())
            );
            
            // 检查标签值是否包含商业场所相关词汇
            const hasBusinessTagInValues = Object.values(tags).some(tag => 
              [
                'restaurant', 'cafe', 'hotel', 'shopping_mall', 'gas_station',
                'convenience_store', 'pharmacy', 'bank', 'atm', 'hospital',
                'library', 'museum', 'theater', 'cinema', 'bar', 'pub'
              ].includes(String(tag).toLowerCase())
            );
            
            // 检查标签键名是否包含公共厕所相关词汇
            const hasPublicTagInKeys = Object.keys(tags).some(key => 
              [
                'toilets', 'amenity', 'public', 'park', 'street', 'building', 'transportation'
              ].includes(String(key).toLowerCase())
            );
            
            // 检查标签值是否包含公共厕所相关词汇
            const hasPublicTagInValues = Object.values(tags).some(tag => 
              [
                'toilets', 'amenity', 'public', 'park', 'street', 'building', 'transportation'
              ].includes(String(tag).toLowerCase())
            );
            
            // 如果是商业场所厕所
            const isBusinessRestroom = restroom.isCommercial === true ||
              hasBusinessTagInKeys || hasBusinessTagInValues;
            
            // 如果是公共厕所（非商业厕所）
            const isPublicRestroom = !isBusinessRestroom;
            
            // 添加调试日志
            console.log('Restroom details - isPublic:', isPublicRestroom, 'isBusiness:', isBusinessRestroom, 'showBusiness:', showBusinessRestrooms);
            
            // 显示条件：当显示商业厕所开启时显示所有厕所，否则只显示公共厕所
            const shouldShow = showBusinessRestrooms || isPublicRestroom;
            console.log('Should show restroom:', shouldShow);
            return shouldShow;
          })
          .map((restroom, index) => (
            <div
              key={restroom.id}
              onClick={() => onRestroomSelect(restroom)}
              className="p-4 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 cursor-pointer"
            >
              <div className="font-bold text-white text-lg truncate">{restroom.address}</div>
              <div className="mt-1 text-gray-300 text-sm">
                {restroom.tags && Object.keys(restroom.tags).length > 0 ? (
                  Object.entries(restroom.tags).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className="font-mono text-xs text-gray-400">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-xs">No additional information</div>
                )}
                {/* 显示是否为商业厕所 */}
                <div className="mt-1 flex items-center gap-1">
                  <span className="font-mono text-xs text-gray-400">Business:</span>
                  <span className={restroom.isCommercial ? "text-green-400" : "text-red-400"}>
                    {restroom.isCommercial ? "Yes" : "No"}
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
              {index !== restrooms.length - 1 && (
                <div className="border-t border-gray-600 mt-3" />
              )}
            </div>
          ))}
      </div>
    </motion.div>
  )
}
