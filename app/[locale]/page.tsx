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
  Edit3,
  Briefcase,
  Plus,
  Check,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import "leaflet/dist/leaflet.css"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false })

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
  const t = useTranslations()
  const router = useRouter()
  const [currentView, setCurrentView] = useState<"home" | "search" | "route" | "stops" | "arrivals" | "subway" | "settings">("home")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoute, setSelectedRoute] = useState<any>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [routes, setRoutes] = useState<any[]>([]);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showOnMap, setShowOnMap] = useState(true);
  const [language, setLanguage] = useState<"en" | "zh" | "fr">("en");
  const [languagePopoverOpen, setLanguagePopoverOpen] = useState(false);
  const [homeAddress, setHomeAddress] = useState<string | null>(null);
  const [workAddress, setWorkAddress] = useState<string | null>("1498 Cliveden Avenue");
  const [editingAddressType, setEditingAddressType] = useState<"home" | "work" | null>(null);
  const [addressSearchInput, setAddressSearchInput] = useState("");
  const [addressSearchResults, setAddressSearchResults] = useState<string[]>([]);
  const mapRef = useRef<{ recenter: () => void } | null>(null);

  const handleRecenter = () => {
    console.log('[MapPin] recenter button clicked');
    if (mapRef.current) {
      console.log('[MapPin] mapRef.current found, calling recenter');
      mapRef.current.recenter();
    } else {
      console.warn('[MapPin] mapRef.current is null');
    }
  };

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
          setRoutesError(data?.error || t('noData'));
        }
      })
      .catch(() => {
        setRoutes([]);
        setRoutesError(t('noData'));
      });
  }, [userLocation, t])

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    if (!value) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const q = value.toLowerCase();
    const filtered = routes.filter(
      (r) =>
        r.route_short_name?.toLowerCase().includes(q) ||
        r.route_long_name?.toLowerCase().includes(q)
    );
    setSearchResults(filtered);
  };

  // Address search input change handler
  const handleAddressSearchInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddressSearchInput(value);
    if (!value) {
      setAddressSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`/api/proxy-nominatim?q=${encodeURIComponent(value)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch from proxy');
      }
      const data = await response.json();
      setAddressSearchResults(data);
    } catch (error) {
      console.error("Address search error:", error);
      setAddressSearchResults([]);
    }
  };

  // Handle selecting an address from search results
  const handleAddressSelect = (address: string) => {
    if (editingAddressType === "home") {
      setHomeAddress(address);
    } else if (editingAddressType === "work") {
      setWorkAddress(address);
    }
    setEditingAddressType(null);
    setAddressSearchInput("");
    setAddressSearchResults([]);
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

  const languageLabelMap = {
    en: "En",
    zh: "简",
    fr: "Fr",
  }

  const changeLanguage = (lang: "en" | "zh" | "fr") => {
    setLanguage(lang)
    router.push(`/${lang}`)
  }

  const renderHomeView = () => (
    <div className="min-h-screen bg-[#181B1F] text-white">
      <div className="relative h-80 bg-[#181B1F] overflow-hidden">
        {userLocation ? (
          <MapView ref={mapRef} userLocation={userLocation} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">{t('loadingMap')}</div>
        )}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 pointer-events-auto">
          <button
            className="w-12 h-12 bg-[#23272F] rounded-full flex items-center justify-center border-2 border-[#3DDC97] focus:outline-none"
            onClick={handleRecenter}
            aria-label="回到当前位置"
          >
            <MapPin className="w-6 h-6 text-[#3DDC97]" />
          </button>
          <button
            className="w-12 h-12 bg-[#23272F] rounded-full flex items-center justify-center border-2 border-transparent hover:border-[#3DDC97] focus:outline-none"
            onClick={() => setCurrentView("settings")}
            aria-label="设置"
          >
            <Settings className="w-6 h-6 text-gray-400 hover:text-[#3DDC97]" />
          </button>
        </div>
      </div>

      <div className="px-4 -mt-8 z-20 relative">
        <div className="rounded-2xl bg-[#1E2228] shadow-lg flex items-center px-4 py-3 border border-[#23272F]">
          <Search className="w-6 h-6 text-[#3DDC97] mr-2" />
          <input
            className="flex-1 bg-transparent outline-none text-lg text-white placeholder-[#A0AEC0]"
            placeholder={t('whereToPlaceholder')}
            value={searchInput}
            onChange={handleSearchInput}
          />
        </div>
      </div>

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
                  {route.closest_distance != null && (
                    <div className="text-sm text-[#A0AEC0]">{route.closest_distance < 100 ? `${route.closest_distance}m` : `${(route.closest_distance/1000).toFixed(2)}km`} 内</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : !routesError ? (
          <div className="text-[#A0AEC0] p-2">{t('noData')}</div>
        ) : null}
      </div>
    </div>
  )

  const renderSettingsView = () => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col justify-end z-50">
      <div className="bg-[#23272F] rounded-t-3xl p-6 max-h-[70vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl font-semibold">{t('settings')}</h2>
          <button
            onClick={() => setCurrentView("home")}
            aria-label="Close settings"
            className="p-2 rounded-full hover:bg-gray-700"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-700 rounded-lg flex items-center justify-center text-white font-semibold text-lg select-none">
              {languageLabelMap[language]}
            </div>
            <span className="text-white text-lg">{t('language')}</span>
          </div>
          <Popover open={languagePopoverOpen} onOpenChange={setLanguagePopoverOpen}>
            <PopoverTrigger asChild>
              <button className="p-2 rounded-md bg-green-700 hover:bg-green-800">
                <Edit3 className="w-5 h-5 text-white" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <div className="flex flex-col">
                {(["en", "zh", "fr"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      changeLanguage(lang)
                      setLanguagePopoverOpen(false)
                    }}
                    className={`flex items-center gap-3 px-4 py-2 text-white hover:bg-green-700 ${
                      language === lang ? "bg-green-800 font-semibold" : ""
                    }`}
                  >
                    <div className="w-6 h-6 bg-green-700 rounded flex items-center justify-center text-white font-semibold text-sm select-none">
                      {languageLabelMap[lang]}
                    </div>
                    <span>
                      {lang === "en"
                        ? "English"
                        : lang === "zh"
                        ? "简体中文"
                        : "Français"}
                    </span>
                    {language === lang && <Check className="ml-auto w-5 h-5" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <hr className="border-gray-600 mb-6" />

        <div className="space-y-4">
          {/* Home address section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-700 rounded-lg flex items-center justify-center text-white">
                  <Home className="w-6 h-6" />
                </div>
                <div className="text-white text-lg font-medium">{t('home')}</div>
              </div>
              {editingAddressType === "home" ? (
                <button
                  className="p-2 rounded-md bg-red-700 hover:bg-red-800"
                  onClick={() => setEditingAddressType(null)}
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              ) : (
                <button
                  className="p-2 rounded-md bg-green-700 hover:bg-green-800"
                  onClick={() => setEditingAddressType("home")}
                >
                  <Edit3 className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
            {editingAddressType === "home" ? (
              <div>
                <Input
                  placeholder={t('searchAddress')}
                  value={addressSearchInput}
                  onChange={handleAddressSearchInput}
                  autoFocus
                  className="mb-2"
                />
                <div className="max-h-40 overflow-auto bg-gray-800 rounded-md border border-gray-700">
                  {addressSearchResults.length > 0 ? (
                    addressSearchResults.map((addr) => (
                      <div
                        key={addr}
                        className="p-2 cursor-pointer hover:bg-green-700 text-white"
                        onClick={() => handleAddressSelect(addr)}
                      >
                        {addr}
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-gray-400">{t('noResults')}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">{homeAddress || t('noAddressSet')}</div>
            )}
          </div>

          {/* Work address section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-700 rounded-lg flex items-center justify-center text-white">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="text-white text-lg font-medium">{t('work')}</div>
              </div>
              {editingAddressType === "work" ? (
                <button
                  className="p-2 rounded-md bg-red-700 hover:bg-red-800"
                  onClick={() => setEditingAddressType(null)}
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              ) : (
                <button
                  className="p-2 rounded-md bg-green-700 hover:bg-green-800"
                  onClick={() => setEditingAddressType("work")}
                >
                  <Edit3 className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
            {editingAddressType === "work" ? (
              <div>
                <Input
                  placeholder={t('searchAddress')}
                  value={addressSearchInput}
                  onChange={handleAddressSearchInput}
                  autoFocus
                  className="mb-2"
                />
                <div className="max-h-40 overflow-auto bg-gray-800 rounded-md border border-gray-700">
                  {addressSearchResults.length > 0 ? (
                    addressSearchResults.map((addr) => (
                      <div
                        key={addr}
                        className="p-2 cursor-pointer hover:bg-green-700 text-white"
                        onClick={() => handleAddressSelect(addr)}
                      >
                        {addr}
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-gray-400">{t('noResults')}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">{workAddress || t('noAddressSet')}</div>
            )}
          </div>

          <button className="flex items-center justify-center gap-2 text-gray-400 hover:text-white mt-2">
            <Plus className="w-5 h-5" />
            {t('addLocation')}
          </button>
        </div>

        <hr className="border-gray-600 my-6" />

        <div className="flex items-center justify-between">
          <span className="text-white text-lg font-medium">{t('showOnMap')}</span>
          <button
            onClick={() => setShowOnMap(!showOnMap)}
            aria-label="Toggle show on map"
            className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors duration-300 ${
              showOnMap ? "bg-green-600" : "bg-gray-600"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                showOnMap ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )

  const renderSearchView = () => (
    <div className="min-h-screen bg-gray-900 text-white">
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

      <div className="bg-gray-800 p-4">
        <div className="flex items-center gap-3">
          <Bus className="w-8 h-8 text-blue-400" />
          <div>
            <div className="text-xl font-bold text-blue-400">119 • TransLink</div>
            <div className="text-gray-400">Edmonds Station / Metrotown Station</div>
          </div>
        </div>
      </div>

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

      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-blue-400" />
          <span className="font-medium">Edmonds Station</span>
        </div>
        <div className="text-gray-400 text-sm">Kingsway / McKay Ave Eastbound</div>
      </div>

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

      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-blue-400" />
          <span className="font-medium text-lg">Edmonds Station</span>
        </div>
        <div className="text-gray-400 text-sm">Kingsway / McKay Ave Eastbound</div>
      </div>

      <div className="p-4">
        <div className="space-y-4">
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

      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-blue-400" />
          <span className="font-medium">Eastbound</span>
        </div>
        <div className="text-gray-400 text-sm">24 stops</div>
      </div>

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
      {currentView === "settings" && renderSettingsView()}

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
