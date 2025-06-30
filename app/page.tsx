"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import {
  Search,
  MapPin,
  Clock,
  AlertTriangle,
  Home,
  Settings,
  MoreHorizontal,
  ArrowRight,
  Bus,
  Train,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import "leaflet/dist/leaflet.css"

// Mock data for transit routes
// const mockRoutes = [...]

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false })

export default function TransitApp() {
  const [currentView, setCurrentView] = useState<"home" | "search" | "route" | "stops" | "arrivals" | "subway">("home")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoute, setSelectedRoute] = useState<any>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [routes, setRoutes] = useState<any[]>([]);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const mapRef = useRef<any>(null);

  // 获取用户当前位置
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {},
        { enableHighAccuracy: true }
      )
    }
  }, [])

  // 获取公交线路数据
  useEffect(() => {
    if (!userLocation) return;
    fetch(`/api/routes?lat=${userLocation.lat}&lng=${userLocation.lng}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRoutes(data);
          setRoutesError(null);
        } else {
          setRoutes([]);
          setRoutesError(data?.error || '数据格式错误');
        }
      })
      .catch((e) => {
        setRoutes([]);
        setRoutesError('网络错误');
      });
  }, [userLocation])

  // 搜索功能：本地过滤公交线路
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    if (!value) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    // 支持按线路编号或名称、站点名模糊搜索
    const q = value.toLowerCase();
    const filtered = routes.filter(
      (r) =>
        r.route_short_name?.toLowerCase().includes(q) ||
        r.route_long_name?.toLowerCase().includes(q)
    );
    setSearchResults(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.toLowerCase().includes("119")) {
      setCurrentView("search")
    } else if (query.toLowerCase().includes("expo")) {
      setCurrentView("subway")
    }
  }

  const handleRouteSelect = (route: any) => {
    setSelectedRoute(route)
    setCurrentView("stops")
  }

  const renderHomeView = () => (
    <div className="min-h-screen bg-[#181B1F] text-white">
      {/* Map Area */}
      <div className="relative h-80 bg-[#181B1F] overflow-hidden">
        {userLocation ? (
          <MapView ref={mapRef} userLocation={userLocation} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">Loading map...</div>
        )}
        {/* 设置按钮 */}
        <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
          <button
            className="w-12 h-12 bg-[#23272F] rounded-full flex items-center justify-center border-2 border-[#3DDC97] focus:outline-none"
            onClick={() => mapRef.current?.recenter && mapRef.current.recenter()}
            aria-label="回到当前位置"
          >
            <MapPin className="w-6 h-6 text-[#3DDC97]" />
          </button>
          <Settings className="w-6 h-6 text-gray-400" />
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 -mt-8 z-20 relative">
        <div className="rounded-2xl bg-[#1E2228] shadow-lg flex items-center px-4 py-3 border border-[#23272F]">
          <Search className="w-6 h-6 text-[#3DDC97] mr-2" />
          <input
            className="flex-1 bg-transparent outline-none text-lg text-white placeholder-[#A0AEC0]"
            placeholder="Where to? 站点名/线路号"
            value={searchInput}
            onChange={handleSearchInput}
          />
        </div>
      </div>

      {/* Routes List */}
      <div className="p-4 space-y-4">
        {routesError && (
          <div className="text-red-400 p-2">{routesError}</div>
        )}
        {(searching ? searchResults : routes).length > 0 ? (
          (searching ? searchResults : routes).map((route) => (
            <Card key={route.route_id} className="bg-[#23272F] border border-[#23272F] shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-[#3DDC97]">{route.route_short_name}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-5 h-5 text-[#3DDC97]" />
                        <span className="font-medium text-white text-lg">{route.route_long_name}</span>
                      </div>
                    </div>
                  </div>
                  {/* 距离最近站点的距离（如有） */}
                  {route.closest_distance != null && (
                    <div className="text-sm text-[#A0AEC0]">{route.closest_distance < 100 ? `${route.closest_distance}m` : `${(route.closest_distance/1000).toFixed(2)}km`} 内</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : !routesError ? (
          <div className="text-[#A0AEC0] p-2">暂无数据</div>
        ) : null}
      </div>
    </div>
  )

  const renderSearchView = () => (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-green-600 p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-white" />
          <Input
            placeholder="119"
            className="bg-transparent border-none text-white placeholder-green-100 text-lg"
            value="119"
            readOnly
          />
          <Button variant="ghost" size="sm" className="text-white">
            ✕
          </Button>
        </div>
      </div>

      {/* Route Info */}
      <div className="bg-gray-800 p-4">
        <div className="flex items-center gap-3">
          <Bus className="w-8 h-8 text-blue-400" />
          <div>
            <div className="text-xl font-bold text-blue-400">119 • TransLink</div>
            <div className="text-gray-400">Edmonds Station / Metrotown Station</div>
          </div>
        </div>
      </div>

      {/* Stops and Stations */}
      <div className="p-4">
        <h3 className="text-gray-400 text-sm font-medium mb-4">STOPS AND STATIONS</h3>
        <div className="space-y-4">
          {mockStops.map((stop, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
                <span className="text-white font-bold">T</span>
              </div>
              <div className="flex-1">
                <div className="font-medium">{stop.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Bus className="w-4 h-4 text-gray-400" />
                  <div className="flex gap-2">
                    {stop.routes.map((route) => (
                      <Badge key={route} variant="secondary" className="bg-blue-600 text-white">
                        {route}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStopsView = () => (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Map Area */}
      <div className="relative h-64 bg-gray-800">
        <div className="absolute top-4 left-4 text-4xl font-bold text-blue-400">119</div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-yellow-600 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <div className="font-medium">Modified service</div>
                <div className="text-sm">Posted 2 days ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Route Direction */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-blue-400" />
          <span className="font-medium">Edmonds Station</span>
        </div>
        <div className="text-gray-400 text-sm">19 stops</div>
      </div>

      {/* Stops List */}
      <div className="p-4">
        <div className="space-y-4">
          {[
            { name: "Metrotown Station (Bay 6)", routes: ["Expo", "19", "31", "49", "110", "116", "129"], time: null },
            { name: "McKay Ave / Kingsborough St Northbound", routes: [], time: "+1 min" },
            { name: "Kingsway / McKay Ave Eastbound", routes: ["N19"], time: "+2 min" },
            { name: "Kingsway / Sussex Ave Eastbound", routes: ["N19"], time: "+3 min" },
            { name: "Kingsway / Nelson Ave Eastbound", routes: ["110", "144", "N19"], time: "+4 min" },
            { name: "Kingsway / Marlborough", routes: [], time: "+5 min" },
          ].map((stop, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <div className="flex-1">
                <div className="font-medium">{stop.name}</div>
                {stop.routes.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    {stop.routes.includes("Expo") && <Badge className="bg-blue-600 text-white">Expo</Badge>}
                    <Bus className="w-4 h-4 text-gray-400" />
                    <div className="flex gap-1">
                      {stop.routes
                        .filter((r) => r !== "Expo")
                        .map((route) => (
                          <Badge key={route} variant="secondary" className="bg-blue-600 text-white text-xs">
                            {route}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              {stop.time && <div className="text-gray-400 text-sm">{stop.time}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderArrivalsView = () => (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Map Area */}
      <div className="relative h-64 bg-gray-800">
        <div className="absolute top-4 left-4 text-4xl font-bold text-blue-400">119</div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-yellow-600 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <div className="font-medium">Modified service</div>
                <div className="text-sm">Posted 2 days ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Station Info */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-blue-400" />
          <span className="font-medium text-lg">Edmonds Station</span>
        </div>
        <div className="text-gray-400 text-sm">Kingsway / McKay Ave Eastbound</div>
      </div>

      {/* Arrival Times */}
      <div className="p-4">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Clock className="w-6 h-6 text-blue-400" />
            <div className="text-3xl font-bold text-blue-400">0 min</div>
          </div>

          <div className="text-2xl text-gray-300">27 min</div>

          <div className="text-2xl text-gray-300">58 min</div>
        </div>

        <Button className="w-full mt-8 bg-blue-600 hover:bg-blue-700">
          <Clock className="w-4 h-4 mr-2" />
          MORE DEPARTURES
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  const renderSubwayView = () => (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Map Area */}
      <div className="relative h-64 bg-gray-800">
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-3 bg-blue-600 p-3 rounded-lg">
            <Train className="w-8 h-8 text-white" />
            <span className="text-lg font-medium">Expo Line</span>
          </div>
        </div>
        <div className="absolute bottom-20 left-4 right-4">
          <div className="bg-yellow-600 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <div className="font-medium">Service alerts for some stops</div>
                <div className="text-sm">Posted Jun 9</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Route Direction */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-blue-400" />
          <span className="font-medium">Eastbound</span>
        </div>
        <div className="text-gray-400 text-sm">24 stops</div>
      </div>

      {/* Stations List */}
      <div className="p-4">
        <div className="space-y-4">
          {mockSubwayStations.map((station, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <div className="flex-1">
                <div className="font-medium">{station.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  {station.hasSeaBus && <Badge className="bg-gray-600 text-white text-xs">SeaBus</Badge>}
                  {station.hasMillennium && <Badge className="bg-yellow-600 text-white text-xs">Millennium</Badge>}
                  <Bus className="w-4 h-4 text-gray-400" />
                  <div className="flex gap-1">
                    {station.routes.map((route) => (
                      <Badge key={route} variant="secondary" className="bg-blue-600 text-white text-xs">
                        {route}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              {station.time && <div className="text-gray-400 text-sm">{station.time}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto bg-gray-900">
      {currentView === "home" && renderHomeView()}
      {currentView === "search" && renderSearchView()}
      {currentView === "stops" && renderStopsView()}
      {currentView === "arrivals" && renderArrivalsView()}
      {currentView === "subway" && renderSubwayView()}

      {/* Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-gray-800 border-t border-gray-700">
        <div className="flex justify-around p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView("home")}
            className={currentView === "home" ? "text-blue-400" : "text-gray-400"}
          >
            <Home className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView("search")}
            className={currentView === "search" ? "text-blue-400" : "text-gray-400"}
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView("stops")}
            className={currentView === "stops" ? "text-blue-400" : "text-gray-400"}
          >
            <Bus className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView("arrivals")}
            className={currentView === "arrivals" ? "text-blue-400" : "text-gray-400"}
          >
            <Clock className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView("subway")}
            className={currentView === "subway" ? "text-blue-400" : "text-gray-400"}
          >
            <Train className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
