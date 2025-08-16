"use client"

import React from "react"
import { useEffect, useState, useRef } from "react"
import StopsView from "./components/StopsView"
import RestroomView, { Restroom } from "./components/RestroomView"
import dynamic from "next/dynamic"
import { motion, useAnimation } from "framer-motion"

import {
  Search,
  MapPin,
  Clock,
  AlertTriangle,
  Home,
  Settings,
  Heart,
  MoreHorizontal,
  CircleParking ,

  ArrowRight,
  Bus,
  Train,
  Edit3,
  Briefcase,
  Plus,
  Check,
  X,
} from "lucide-react"
import Image from "next/image";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import "leaflet/dist/leaflet.css"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false }) 

// 在文件顶部（import 之后，export default function TransitApp 之前）
let addressSearchRequestId = 0;

export default function TransitApp() {
  const t = useTranslations()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("home")
  const [isStopsViewOpen, setIsStopsViewOpen] = useState(false)
  interface RestroomWithName extends Restroom {
    name: string;
  }
  const [restrooms, setRestrooms] = useState<RestroomWithName[]>([]);
  const [selectedRestroomId, setSelectedRestroomId] = useState<string | null>(null);
  const [loadingRestrooms, setLoadingRestrooms] = useState(false);
  const [restroomError, setRestroomError] = useState<string | null>(null);
  const controls = useAnimation()
  const controlsRef = useRef(controls);

  // New state for stop info panel
  const [stopInfo, setStopInfo] = useState<{
    stop: { stop_id: string; stop_name: string; stop_address?: string }
    routes: Array<{ route_id: string; route_short_name: string; trip_headsign: string; route_type?: number }>
  } | null>(null)
  const [showStopInfoPanel, setShowStopInfoPanel] = useState(false)

  // Set initial draggable panel position to middle of screen on mount
  useEffect(() => {
    const middle = window.innerHeight * 0.6
    controls.start({ y: middle })
  }, [controls])

  // Ensure controlsRef is updated
  useEffect(() => {
    controlsRef.current = controls
  }, [controls])

  // Hide RestroomView when activeTab changes away from 'favorite'
  useEffect(() => {
    if (activeTab !== 'favorite') {
      setSelectedRestroomId(null);
    }
  }, [activeTab]);

  // Hide StopsView when activeTab changes
  useEffect(() => {
    if (activeTab !== 'favorite') {
      setIsStopsViewOpen(false);
    }
  }, [activeTab]);



  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoute, setSelectedRoute] = useState<any>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [currentAddressName, setCurrentAddressName] = useState<string | null>(null)
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
  const [addressSearchResults, setAddressSearchResults] = useState<any[]>([]);
  // New state for selected address and nearby routes on search tab
  const [selectedAddress, setSelectedAddress] = useState<{ address: string; lat: number | null; lng: number | null } | null>(null);
  const [nearbyRoutes, setNearbyRoutes] = useState<any[]>([]);
  // Add state to control visibility of selected address panel
  const [showSelectedAddressPanel, setShowSelectedAddressPanel] = useState(false);

  useEffect(() => {
    console.log('[State] showSelectedAddressPanel changed:', showSelectedAddressPanel);
  }, [showSelectedAddressPanel]);

  useEffect(() => {
    console.log('[State] selectedAddress changed:', selectedAddress);
  }, [selectedAddress]);

  useEffect(() => {
    console.log('[State] selectedAddress changed:', selectedAddress);
  }, [selectedAddress]);

  useEffect(() => {
    if (showSelectedAddressPanel) {
      console.log('[State] showSelectedAddressPanel is true, panel should be visible');
    } else {
      console.log('[State] showSelectedAddressPanel is false, panel should be hidden');
    }
  }, [showSelectedAddressPanel]);

  useEffect(() => {
    console.log('[State] activeTab changed:', activeTab);
  }, [activeTab]);

  // Add a safe getter for addressSearchResults length
  const addressSearchResultsLength = Array.isArray(addressSearchResults) ? addressSearchResults.length : 0;
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [routePolyline, setRoutePolyline] = useState<any[]>([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [reverseDirection, setReverseDirection] = useState(false);
  const mapRef = useRef<{ recenter: () => void; centerOnRestroom: (coords: { lat: number, lon: number }) => void; } | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch restrooms when favorite tab is active, with localStorage caching
  useEffect(() => {
    if (activeTab === 'favorite' && userLocation) {
      const fetchRestrooms = async () => {
        setLoadingRestrooms(true);
        setRestroomError(null);
        try {
          const cacheKey = 'restroomsCache';
          const cacheTimestampKey = 'restroomsCacheTimestamp';
          const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

          const cachedData = localStorage.getItem(cacheKey);
          const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
          const now = Date.now();

          if (cachedData && cachedTimestamp && now - parseInt(cachedTimestamp) < cacheExpiry) {
            // Use cached data
            const parsed = JSON.parse(cachedData);
            setRestrooms(Array.isArray(parsed) ? parsed : []);
          } else {
            // Fetch from server API
            const response = await fetch(`/api/restrooms?lat=${userLocation.lat}&lng=${userLocation.lng}`);
            if (!response.ok) {
              throw new Error('Failed to fetch restrooms');
            }
            const data = await response.json();
            setRestrooms(Array.isArray(data) ? data : []);
            // Update cache
            localStorage.setItem(cacheKey, JSON.stringify(data));
            localStorage.setItem(cacheTimestampKey, now.toString());
          }
        } catch (error) {
          console.error("Failed to fetch restrooms:", error);
          setRestrooms([]); // Always set to array on error
          if (error instanceof Error) {
            setRestroomError(error.message);
          } else {
            setRestroomError("An unknown error occurred.");
          }
        } finally {
          setLoadingRestrooms(false);
        }
      };
      fetchRestrooms();
    } else {
      setRestrooms([]); // Clear restrooms when not on favorite tab
    }
  }, [activeTab, userLocation]);

  // Reverse geocode userLocation to get address name via backend proxy to avoid CORS
  useEffect(() => {
    if (!userLocation) {
      setCurrentAddressName(null);
      console.log('[ReverseGeocode] userLocation is null, cleared currentAddressName');
      return;
    }
    const fetchAddressName = async () => {
      try {
        const params = new URLSearchParams({
          lat: String(userLocation.lat),
          lng: String(userLocation.lng),
        });
        console.log('[ReverseGeocode] Fetching address for:', userLocation);
        const response = await fetch(`/api/proxy-nominatim?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch address name');
        const data = await response.json();
        console.log('[ReverseGeocode] Response data:', data);
        if (data && Array.isArray(data) && data.length > 0) {
          // data[0] is now an object with address, lat, lng
          setCurrentAddressName(data[0].address || null);
          console.log('[ReverseGeocode] Set currentAddressName:', data[0].address);
        } else {
          setCurrentAddressName(null);
          console.log('[ReverseGeocode] No address found, set currentAddressName to null');
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        setCurrentAddressName(null);
      }
    };
    fetchAddressName();
  }, [userLocation]);


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

  const handleSearchInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    if (!value) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const q = value.toLowerCase();

    // Search local routes first
    const filteredRoutes = Array.isArray(routes) ? routes.filter(
      (r) => {
        try {
          if (r.route_short_name != null && String(r.route_short_name).toLowerCase().includes(q)) {
            return true;
          }
          if (r.route_long_name != null && String(r.route_long_name).toLowerCase().includes(q)) {
            return true;
          }
          return false;
        } catch (e) {
          console.error('Error filtering route:', r, e);
          return false;
        }
      }
    ) : [];

    // Fetch remote routes matching query
    let remoteRoutes: any[] = [];
    try {
      const routeRes = await fetch(`/api/gtfs/route/search?q=${encodeURIComponent(value)}`);
      if (routeRes.ok) {
        remoteRoutes = await routeRes.json();
      }
    } catch (error) {
      console.error('Error fetching remote routes:', error);
    }

    // Combine local filtered routes and remote routes, deduplicate by route_id
    const routeMap = new Map<string, any>();
    filteredRoutes.forEach(r => routeMap.set(r.route_id, r));
    remoteRoutes.forEach(r => routeMap.set(r.route_id, r));
    const combinedRoutes = Array.from(routeMap.values());

    // Limit routes to max 10
    const limitedRoutes = combinedRoutes.slice(0, 10);

    // Query remote address and stops search APIs
    try {
      const [addressRes, stopsRes] = await Promise.all([
        fetch(`/api/proxy-nominatim?q=${encodeURIComponent(value)}&lat=${userLocation?.lat || ''}&lng=${userLocation?.lng || ''}&language=${language}`),
        fetch(`/api/gtfs/stops/search?q=${encodeURIComponent(value)}`)
      ]);

      const addresses = addressRes.ok ? await addressRes.json() : [];
      const stops = stopsRes.ok ? await stopsRes.json() : [];

      // Limit results to max 10 each
      const limitedAddresses = Array.isArray(addresses) ? addresses.slice(0, 10) : [];
      const limitedStops = Array.isArray(stops) ? stops.slice(0, 10) : [];

      // Map address objects to strings for rendering
      const addressStrings = limitedAddresses.map((addr: any) => addr.address || '');

      // Normalize stops to match search result format
      const stopsFormatted = limitedStops.map((stop: any) => ({
        stop_id: stop.stop_id,
        stop_code: stop.stop_code,
        stop_name: stop.stop_name,
        stop_lat: stop.stop_lat,
        stop_lon: stop.stop_lon,
      }));

      // Combine all results: routes, addresses (strings), stops
      // Sort order: route, address, stop
      const combinedResults = [
        ...limitedRoutes,
        ...addressStrings,
        ...stopsFormatted,
      ];

      setSearchResults(combinedResults);
    } catch (error) {
      console.error('Error fetching search results:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddressSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddressSearchInput(value);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (!value) {
      setAddressSearchResults([]);
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      const currentRequestId = ++addressSearchRequestId;
      try {
        const params = new URLSearchParams({ q: value });
        // 自动带上定位参数
        if (userLocation) {
          params.set('lat', String(userLocation.lat));
          params.set('lng', String(userLocation.lng));
        }
        // 自动带上当前界面语言
        params.set('language', language);
        // 如有city变量可用，也可加上city参数
        // if (currentCity) params.set('city', currentCity);
        const response = await fetch(`/api/proxy-nominatim?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch from proxy');
        const data = await response.json();
        console.log('[AddressSearch] 查询结果:', data);
        if (currentRequestId === addressSearchRequestId) {
          setAddressSearchResults(data);
        }
      } catch (error) {
        if (currentRequestId === addressSearchRequestId) {
          setAddressSearchResults([]);
        }
      }
    }, 1000); // 1秒防抖
  };

  // Handle selecting an address from search results
  const handleAddressSelect = (address: any) => {
    // 确保获取到地址字符串
    const addressStr = typeof address === 'string' ? address : address.address || JSON.stringify(address);
    
    if (editingAddressType === "home") {
      setHomeAddress(addressStr);
    } else if (editingAddressType === "work") {
      setWorkAddress(addressStr);
    }
    setEditingAddressType(null);
    setAddressSearchInput("");
    setAddressSearchResults([]);
  };

  const handleRouteSelect = (route: any) => {
    console.log('[handleRouteSelect] selected route:', route);
    setSelectedRoute(route)
    setIsStopsViewOpen(true)
  }

  const handleRestroomSelect = (restroom: Restroom) => {
    setSelectedRestroomId(restroom.id);
    if (mapRef.current) {
      mapRef.current.centerOnRestroom({ lat: restroom.lat, lon: restroom.lon });
    }
  };



  const languageLabelMap = {
    en: "En",
    zh: "简",
    fr: "Fr",
  }

  const changeLanguage = (lang: "en" | "zh" | "fr") => {
    setLanguage(lang)
    router.push(`/${lang}`)
  }

  const renderHomeSheet = () => {
    const handleDragEnd = (event: any, info: any) => {
      const { point, velocity } = info
      const currentY = point.y
      const top = 0 // 允许拖到屏幕顶部
      const middle = window.innerHeight * 0.6 // 默认停靠在屏幕中间
      const bottom = window.innerHeight - 140
      if (Math.abs(velocity.y) > 300) {
        // 速度过快时，根据方向停靠在顶部或底部
        controlsRef.current.start({ y: velocity.y < 0 ? top : bottom })
      } else {
        // 允许面板停在任何位置
        controlsRef.current.start({ y: currentY })
      }
    }

    return (
      <motion.div
        key={currentAddressName}
        drag="y"
        onDragEnd={handleDragEnd}
        animate={controls}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        dragConstraints={{ top: 0, bottom: typeof window !== "undefined" ? window.innerHeight : 900 }}
        dragElastic={{ top: 0.05, bottom: 0.05 }}
        className="absolute top-0 left-0 right-0 h-full bg-[#23272F] rounded-t-2xl shadow-2xl flex flex-col z-20"
        style={{ touchAction: "none" }}
      >
          <div className="p-4 flex-shrink-0 cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-2" />
            <div className="flex items-center gap-2 text-white text-lg font-semibold">
              <MapPin className="w-5 h-5" />
              <span className="text-sm text-gray-400 mr-2">Current Location:</span>
          <span className="font-normal">{currentAddressName ?? t('whereToPlaceholder')}</span>
            </div>
          </div>
          <hr className="border-t border-gray-600 mx-4" />
        <div className="overflow-y-auto px-4 flex-grow pb-4">
          {routesError && (
            <div className="text-red-400 p-2">{routesError}</div>
          )}
            {(searching ? (searchResults ?? []) : (routes ?? [])).length > 0 ? (
              Array.isArray(searching ? searchResults : routes) && (searching ? searchResults : routes).map((route) => (
              <Card key={route.route_id} className="bg-[#23272F] border border-[#23272F] shadow-md cursor-pointer"
                onClick={() => {
                  console.log('[HomeView] Card onClick, route:', route);
                  handleRouteSelect(route);
                }}>
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
      </motion.div>
    )
  }

  const renderSettingsView = () => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col justify-end z-50">
      <div className="bg-[#23272F] rounded-t-3xl p-6 max-h-[70vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl font-semibold">{t('settings')}</h2>
          <button
            onClick={() => setActiveTab("home")}
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
                  {addressSearchResultsLength > 0 ? (
                    addressSearchResults.map((addr, index) => (
                      <div
                        key={index}
                        className="p-2 cursor-pointer hover:bg-green-700 text-white"
                        onClick={() => handleAddressSelect(addr)}
                      >
                        {typeof addr === 'string' ? addr : addr.address || JSON.stringify(addr)}
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
                  {Array.isArray(addressSearchResults) && addressSearchResults.length > 0 ? (
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

  // 加载选中线路的 stops、polyline 和 directions
  useEffect(() => {
    // 仅在 selectedRoute 变化且有效时才进行数据获取
    if (selectedRoute && selectedRoute.route_id) {
      console.log('[Stops useEffect] selectedRoute:', selectedRoute);
      
      setLoadingStops(true);
      
      // 获取路线详细信息
      const routeUrl = `/api/gtfs/route/${selectedRoute.route_id}`;
      console.log('[Stops useEffect] fetch route url:', routeUrl);
      
      // 获取方向信息
      const directionsUrl = `/api/gtfs/directions/${selectedRoute.route_id}`;
      console.log('[Stops useEffect] fetch directions url:', directionsUrl);

      fetch(routeUrl)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(routeData => {
          console.log('[Stops useEffect] route data:', routeData);
          
          // 验证并处理返回数据
          console.log('Full route data received:', routeData);
          
          // 检查服务器连接状态
          if (!routeData || typeof routeData !== 'object') {
            console.warn('Invalid route data received - server may be down');
            throw new Error('Invalid route data received - server may be down');
          }

          // 确保至少有一个有效字段
          if (!routeData.stops && !routeData.polyline && !routeData.directions) {
            console.warn('No valid route data received - empty response');
            throw new Error('No valid route data received - empty response');
          }

          // 更新selectedRoute包含可用数据
          setSelectedRoute((prev: any) => ({
            ...prev,
            stops: routeData.stops || prev.stops || [],
            polyline: routeData.polyline || prev.polyline || [],
            directions: routeData.directions || prev.directions || []
          }));
          
          setRouteStops(routeData.stops || []);
          setRoutePolyline(routeData.polyline || []);
          setLoadingStops(false);
        })
        .catch(error => {
          console.error('[Stops useEffect] Error:', error);
          setRouteStops([]);
          setRoutePolyline([]);
          setLoadingStops(false);
        });
    }
  }, [selectedRoute?.route_id]);

  const handleDirectionChange = (reverse: boolean) => {
    setReverseDirection(reverse)
  }

  // 加载本地设置
  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang && (savedLang === 'en' || savedLang === 'zh' || savedLang === 'fr')) {
      setLanguage(savedLang);
    }
    const savedHome = localStorage.getItem('homeAddress');
    if (savedHome) setHomeAddress(savedHome);
    const savedWork = localStorage.getItem('workAddress');
    if (savedWork) setWorkAddress(savedWork);
  }, []);

  // 保存language
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // 保存home/work address
  useEffect(() => {
    if (homeAddress) {
      localStorage.setItem('homeAddress', homeAddress);
    } else {
      localStorage.removeItem('homeAddress');
    }
  }, [homeAddress]);
  useEffect(() => {
    if (workAddress) {
      localStorage.setItem('workAddress', workAddress);
    } else {
      localStorage.removeItem('workAddress');
    }
  }, [workAddress]);

  // Reset search state when switching to search tab
  useEffect(() => {
    if (activeTab === "search") {
      setSearchInput("");
      setSearchResults([]);
      setSearching(false);
    } else if (activeTab === "home") {
      setSearching(false);
      setSearchInput("");
      setSearchResults([]);
    }
  }, [activeTab]);

  return (
      <div className="max-w-md mx-auto bg-gray-900 h-screen flex flex-col">
        {/* Move Head outside the return to the top-level of the component */}
        <div className="relative flex-1">
          {userLocation ? (
            <MapView
              ref={mapRef}
              userLocation={userLocation}
              routePolyline={isStopsViewOpen ? routePolyline : []}
              restrooms={restrooms} // pass full restroom objects including address
              selectedRestroomId={selectedRestroomId}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">{t('loadingMap')}</div>
          )}

          <div className="absolute top-4 right-4 z-10 pointer-events-auto">
            <button
              className="w-12 h-12 bg-[#23272F] rounded-full flex items-center justify-center border-2 border-[#3DDC97] focus:outline-none"
              onClick={handleRecenter}
              aria-label="回到当前位置"
            >
              <MapPin className="w-6 h-6 text-[#3DDC97]" />
            </button>
          </div>

          {activeTab === 'search' && (
            <div className="absolute top-4 left-4 right-20 z-20">
              <div className="rounded-2xl bg-[#1E2228] shadow-lg flex items-center px-4 py-3 border border-[#23272F]">
                <Search className="w-6 h-6 text-[#3DDC97] mr-2" />
                <input
                  className="flex-1 bg-transparent outline-none text-lg text-white placeholder-[#A0AEC0]"
                  placeholder={t('searchAddress')}
                  value={searchInput}
                  onChange={handleSearchInput}
                  autoFocus
                />
              </div>
              {(searchInput.length > 0 /* always show results if input */) && (
                <div className="mt-2 max-h-60 overflow-auto bg-gray-800 rounded-md border border-gray-700">
                  {searchResults && searchResults.length > 0 ? (
                    searchResults.map((result, index) => {
                      // Determine icon based on result type
                      let icon = null
                      let label = ''
                      let key = ''
                      console.log('[SearchResult] result:', result)
                      if (result.route_id) {
                        // Bus route
                        icon = <Bus className="w-5 h-5 text-[#3DDC97]" />
                        label = `${result.route_short_name} - ${result.route_long_name}`
                        key = result.route_id && result.route_id !== '' ? String(result.route_id) : `route-${index}`
                      } else if (typeof result === 'string') {
                        // Address string
                        icon = <MapPin className="w-5 h-5 text-[#3DDC97]" />
                        label = result
                        // Use index to ensure unique key for addresses
                        key = result && result !== '' ? `${result}-${index}` : `address-${index}`
                      } else if (result.stop_name) {
                        // Stop
                        icon = <CircleParking className="w-5 h-5 text-[#3DDC97]" />
                        //icon = <Image src="/images/bus-stop.svg" alt="Bus Stop" width={20} height={20} className="text-[#3DDC97]" />
                        label = `${result.stop_code || ''} - ${result.stop_name}`
                        key = result.stop_id && result.stop_id !== '' ? String(result.stop_id) : `stop-${index}`
                      }
                      return (
                        <div
                          key={key}
                          className="p-2 cursor-pointer hover:bg-green-700 text-white flex items-center gap-2"
                          onClick={async () => {
                            if (result.route_id) {
                              // Bus route selected
                              setSelectedRoute(result)
                              setIsStopsViewOpen(true)
                              // Keep activeTab as 'search' for bus route per requirements
                              // setActiveTab('home');
                              setSearchInput('')
                              setSearchResults([])
                            } else if (typeof result === 'string') {
                              console.log('[SearchResult] Address clicked:', result)
                              // Address selected
                              // Move map center to address location (requires geocoding)
                              try {
                                const geocodeRes = await fetch(`/api/proxy-nominatim?q=${encodeURIComponent(result)}`)
                                if (!geocodeRes.ok) throw new Error('Failed to geocode address')
                                const geocodeData = await geocodeRes.json()
                                if (!Array.isArray(geocodeData) || geocodeData.length === 0) throw new Error('No geocode results')
                                const firstResult = geocodeData[0]
                                if (!firstResult.lat || !firstResult.lng) {
                                  throw new Error('Invalid geocode result')
                                }
                                const lat = parseFloat(firstResult.lat)
                                const lng = parseFloat(firstResult.lng)
                                if (isNaN(lat) || isNaN(lng)) {
                                  throw new Error('Geocode lat/lng is NaN')
                                }
                                setUserLocation({ lat, lng })
                                setSelectedAddress({
                                  address: firstResult.address,
                                  lat,
                                  lng,
                                })
                                // Fetch nearby routes for this location
                                const nearbyRes = await fetch(`/api/gtfs/route/nearby?lat=${lat}&lng=${lng}`)
                                const nearbyRoutes = nearbyRes.ok ? await nearbyRes.json() : []
                                setNearbyRoutes(Array.isArray(nearbyRoutes) ? nearbyRoutes : [])
                                setShowSelectedAddressPanel(true)
                                if (activeTab !== 'search') {
                                  setActiveTab('search')
                                }
                                setAddressSearchInput('')
                                setAddressSearchResults([])
                                setSearchInput('')
                                setSearchResults([])
                                console.log('[SearchResult] Selected address and nearby routes set, panel shown')
                              } catch (error) {
                                console.error('Failed to fetch nearby routes for address:', error)
                                setSelectedAddress({
                                  address: result,
                                  lat: null,
                                  lng: null,
                                })
                                setNearbyRoutes([])
                                setShowSelectedAddressPanel(true)
                                if (activeTab !== 'search') {
                                  setActiveTab('search')
                                }
                                setAddressSearchInput('')
                                setAddressSearchResults([])
                                setSearchInput('')
                                setSearchResults([])
                                console.log('[SearchResult] Show selected address panel set to true on error')
                              }
                            } else if (result.stop_id) {
                              // Stop selected
                              // Show stop details and routes in draggable panel
                              try {
                                // Fetch routes serving this stop
                                const res = await fetch(`/api/gtfs/stops/${result.stop_id}/routes`)
                                const routesData = res.ok ? await res.json() : []
                                setStopInfo({
                                  stop: {
                                    stop_id: result.stop_id,
                                    stop_name: result.stop_name,
                                    stop_address: result.stop_address || '',
                                  },
                                  routes: Array.isArray(routesData) ? routesData : [],
                                })
                                setShowStopInfoPanel(true)
                              } catch (error) {
                                console.error('Failed to fetch routes for stop:', error)
                                setStopInfo({
                                  stop: {
                                    stop_id: result.stop_id,
                                    stop_name: result.stop_name,
                                    stop_address: result.stop_address || '',
                                  },
                                  routes: [],
                                })
                                setShowStopInfoPanel(true)
                              }
                              setActiveTab('home')
                              setSearchInput('')
                              setSearchResults([])
                            }
                          }}
                        >
                          {icon}
                          <span>{label}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-2 text-gray-400">{t('noResults')}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'home' && !isStopsViewOpen && renderHomeSheet()}
          {activeTab === 'search' && selectedAddress && showSelectedAddressPanel && (
            <motion.div
              drag="y"
              initial={{ y: typeof window !== 'undefined' ? window.innerHeight * 0.6 : 500 }} // 默认停靠在屏幕中间
              dragConstraints={{ top: 0, bottom: typeof window !== 'undefined' ? window.innerHeight : 900 }}
              dragElastic={{ top: 0.05, bottom: 0.05 }}
              className="absolute top-0 left-0 right-0 h-full bg-[#23272F] rounded-t-2xl shadow-2xl flex flex-col z-20"
              style={{ touchAction: 'none' }}
            >
              <div className="p-4 flex-shrink-0 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-2" />
                <div className="flex items-center gap-2 text-white text-lg font-semibold">
                  <MapPin className="w-5 h-5" />
                  <span className="text-sm text-gray-400 mr-2">Selected Address:</span>
                  <span className="font-normal">{selectedAddress.address}</span>
                </div>
              </div>
              <hr className="border-t border-gray-600 mx-4" />
              <div className="overflow-y-auto px-4 flex-grow pb-4">
                {(nearbyRoutes.length === 0 || selectedAddress?.lat === null || selectedAddress?.lng === null) ? (
                  <div className="text-gray-400 p-2">No nearby routes found.</div>
                ) : (
                  nearbyRoutes.map((route) => (
                    <Card key={route.route_id} className="bg-[#23272F] border border-[#23272F] shadow-md cursor-pointer mb-2"
                      onClick={() => {
                        setSelectedRoute(route)
                        setIsStopsViewOpen(true)
                      }}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <Bus className="w-5 h-5 text-[#3DDC97]" />
                        <div className="font-bold text-[#3DDC97]">{route.route_short_name}</div>
                        <div className="text-white">{route.trip_headsign}</div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'favorite' && userLocation && Array.isArray(restrooms) && restrooms.length > 0 && (
            <RestroomView
              restrooms={restrooms}
              loading={loadingRestrooms}
              error={restroomError}
              onRestroomSelect={handleRestroomSelect}
            />
          )}
          {activeTab === 'favorite' && userLocation && (!Array.isArray(restrooms) || restrooms.length === 0) && (
            <div className="flex items-center justify-center h-full text-gray-400">
              {loadingRestrooms ? t('loadingMap') : t('noResults')}
            </div>
          )}

        </div>

        {isStopsViewOpen && (
          <StopsView
            selectedRoute={selectedRoute}
            routePolyline={routePolyline}
            userLocation={userLocation}
            loadingStops={loadingStops}
            onRecenter={handleRecenter}
            onDirectionChange={handleDirectionChange}
            onBack={() => setIsStopsViewOpen(false)}
          />
        )}

        {activeTab === 'settings' && renderSettingsView()}

        <footer className="w-full max-w-md mx-auto bg-[#23272F] border-t border-gray-700 z-30">
          <div className="flex justify-around p-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setActiveTab('home')
                setIsStopsViewOpen(false)
              }}
              className={`rounded-full ${activeTab === 'home' ? 'text-[#3DDC97]' : 'text-gray-400'}`}
            >
              <Home className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setActiveTab('search')
                setIsStopsViewOpen(false)
              }}
              className={`rounded-full ${activeTab === 'search' ? 'text-[#3DDC97]' : 'text-gray-400'}`}
            >
              <Search className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (activeTab === 'favorite') {
                  setActiveTab('home')
                  setIsStopsViewOpen(false)
                } else {
                  setActiveTab('favorite')
                  setIsStopsViewOpen(false)
                }
              }}
              className={`rounded-full ${activeTab === 'favorite' ? 'text-[#3DDC97]' : 'text-gray-400'}`}
            >
              <Heart className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setActiveTab('settings')
                setIsStopsViewOpen(false)
              }}
              className={`rounded-full ${activeTab === 'settings' ? 'text-[#3DDC97]' : 'text-gray-400'}`}
            >
              <Settings className="w-6 h-6" />
            </Button>
          </div>
        </footer>
      </div>
    
  )
}
