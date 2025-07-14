"use client"

import { useEffect, useState, useRef } from "react"
import StopsView from "./components/StopsView"
import RestroomView from "./components/RestroomView"
import dynamic from "next/dynamic"

import {
  Search,
  MapPin,
  Clock,
  AlertTriangle,
  Home,
  Settings,
  Heart,
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

interface Restroom {
  id: string;
  name: string;
  address: string;
  distance: number | null;
  is_open: boolean;

  lat: number;
  lon: number;
}

export default function TransitApp() {
  const t = useTranslations()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("home")
  const [isStopsViewOpen, setIsStopsViewOpen] = useState(false)
  const [restrooms, setRestrooms] = useState<import("./components/RestroomView").Restroom[]>([]);
  const [selectedRestroomId, setSelectedRestroomId] = useState<string | null>(null);
  const [loadingRestrooms, setLoadingRestrooms] = useState(false);
  const [restroomError, setRestroomError] = useState<string | null>(null);

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
            setRestrooms(JSON.parse(cachedData));
          } else {
            // Fetch from server API
            const response = await fetch(`/api/restrooms?lat=${userLocation.lat}&lng=${userLocation.lng}`);
            if (!response.ok) {
              throw new Error('Failed to fetch restrooms');
            }
            const data = await response.json();
            setRestrooms(data);
            // Update cache
            localStorage.setItem(cacheKey, JSON.stringify(data));
            localStorage.setItem(cacheTimestampKey, now.toString());
          }
        } catch (error) {
          console.error("Failed to fetch restrooms:", error);
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

  const renderHomeSheet = () => (
    <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-[#181B1F] rounded-t-2xl shadow-lg max-h-[45vh] overflow-y-auto">
      <div className="mb-4">
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
      <div className="space-y-4">
        {routesError && (
          <div className="text-red-400 p-2">{routesError}</div>
        )}
        {((searching ? searchResults : routes) ?? []).length > 0 ? (
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
    </div>
  )

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

  return (
    <div className="max-w-md mx-auto bg-gray-900 h-screen flex flex-col">
      <div className="relative flex-1">
        {userLocation ? (
          <MapView
            ref={mapRef}
            userLocation={userLocation}
            routePolyline={isStopsViewOpen ? routePolyline : []}
            restrooms={restrooms}  // pass full restroom objects including address
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
                value={addressSearchInput}
                onChange={handleAddressSearchInput}
                autoFocus
              />
            </div>
             {addressSearchResults.length > 0 && (
                <div className="mt-2 max-h-60 overflow-auto bg-gray-800 rounded-md border border-gray-700">
                  {Array.isArray(addressSearchResults) && addressSearchResults.map((addr) => (
                    <div
                      key={addr}
                      className="p-2 cursor-pointer hover:bg-green-700 text-white"
                      onClick={() => handleAddressSelect(addr)}
                    >
                      {addr}
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {activeTab === 'home' && renderHomeSheet()}

        {activeTab === 'favorite' && userLocation && (
          <RestroomView
            restrooms={restrooms}
            loading={loadingRestrooms}
            error={restroomError}
            onRestroomSelect={handleRestroomSelect}
          />
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

      {activeTab === "settings" && renderSettingsView()}

      <footer className="w-full max-w-md mx-auto bg-[#23272F] border-t border-gray-700 z-30">
        <div className="flex justify-around p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setActiveTab("home");
              setIsStopsViewOpen(false);
            }}
            className={`rounded-full ${activeTab === "home" ? "text-[#3DDC97]" : "text-gray-400"}`}
          >
            <Home className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setActiveTab("search");
              setIsStopsViewOpen(false);
            }}
            className={`rounded-full ${activeTab === "search" ? "text-[#3DDC97]" : "text-gray-400"}`}
          >
            <Search className="w-6 h-6" />
          </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          if (activeTab === 'favorite') {
            setActiveTab('home');
            setIsStopsViewOpen(false);
          } else {
            setActiveTab('favorite');
            setIsStopsViewOpen(false);
          }
        }}
        className={`rounded-full ${activeTab === 'favorite' ? "text-[#3DDC97]" : "text-gray-400"}`}
      >
        <Heart className="w-6 h-6" />
      </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setActiveTab("settings");
              setIsStopsViewOpen(false);
            }}
            className={`rounded-full ${activeTab === "settings" ? "text-[#3DDC97]" : "text-gray-400"}`}
          >
            <Settings className="w-6 h-6" />
          </Button>
        </div>
      </footer>
    </div>
  )
}


// 在文件顶部（import 之后，export default function TransitApp 之前）
let addressSearchRequestId = 0;
