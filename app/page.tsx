"use client"

import { useState } from "react"
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

// Mock data for transit routes
const mockRoutes = [
  {
    id: "404",
    name: "Four Road",
    destination: "Granville Ave / Bridge St Eastbound",
    time: "41 minutes",
    type: "bus",
  },
  {
    id: "408",
    name: "Riverport",
    destinations: ["Riverport", "Ironwood"],
    times: ["7 min", "23:50", "00:55"],
    description: "Garden City Rd / Bennett Rd Southbound",
    type: "bus",
  },
  {
    id: "410",
    name: "22nd St Station",
    time: "15 minutes",
    type: "bus",
  },
  {
    id: "119",
    name: "TransLink",
    destination: "Edmonds Station / Metrotown Station",
    type: "bus",
  },
]

const mockStops = [
  {
    name: "Harris Rd / 119 Ave S...",
    routes: ["701", "722", "791"],
  },
  {
    name: "222 St / 119 Ave Sout...",
    routes: ["733", "741", "743", "745", "746", "748"],
  },
  {
    name: "200 St / 119a Ave No...",
    routes: ["595", "701", "791"],
  },
  {
    name: "272 St / 11900 Block ...",
    routes: ["749"],
  },
]

const mockSubwayStations = [
  {
    name: "Waterfront Station",
    routes: ["44", "50", "R5"],
    hasSeaBus: true,
    hasWheelchair: true,
  },
  {
    name: "Burrard Station",
    routes: ["2", "5", "22", "44", "209", "210", "211", "214"],
    time: "+2 min",
  },
  {
    name: "Granville Station",
    routes: ["4", "7", "10", "14", "16", "17", "20", "50"],
    time: "+3 min",
  },
  {
    name: "Stadium-Chinatown Station",
    routes: ["23"],
    time: "+5 min",
  },
  {
    name: "Main Street-Science World Station",
    routes: ["3", "8", "19", "22", "23", "N8", "N19"],
    time: "+7 min",
  },
  {
    name: "Commercial-Broadway Station",
    routes: ["9", "20", "99", "N9", "N20"],
    hasMillennium: true,
    time: "+10 min",
  },
]

export default function TransitApp() {
  const [currentView, setCurrentView] = useState<"home" | "search" | "route" | "stops" | "arrivals" | "subway">("home")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoute, setSelectedRoute] = useState<any>(null)

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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Map Area */}
      <div className="relative h-96 bg-gray-800 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-800">
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-yellow-400" />
            </div>
            <Settings className="w-6 h-6 text-gray-400" />
          </div>

          {/* Home marker */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-green-600 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-white" />
                <Input
                  placeholder="Where to?"
                  className="bg-transparent border-none text-white placeholder-green-100 text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch(searchQuery)}
                />
                <div className="text-white text-sm">126 min</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Routes List */}
      <div className="p-4 space-y-4">
        {mockRoutes.map((route) => (
          <Card key={route.id} className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-blue-400">{route.id}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-blue-400" />
                      <span className="font-medium">{route.name}</span>
                    </div>
                    {route.destination && <div className="text-sm text-gray-400 mt-1">{route.destination}</div>}
                    {route.description && <div className="text-sm text-gray-400 mt-1">{route.description}</div>}
                  </div>
                </div>
                <div className="text-right">
                  {route.time && <div className="text-blue-400 font-medium">{route.time}</div>}
                  {route.times && (
                    <div className="space-y-1">
                      {route.times.map((time, idx) => (
                        <div key={idx} className="text-blue-400 text-sm">
                          {time}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
