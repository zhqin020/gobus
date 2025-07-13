"use client"

import { Loader, MapPin, Clock, Accessibility } from 'lucide-react';

export interface Restroom {

  id: string;
  name: string;
  address: string;
  distance: number | null;
  is_open: boolean;
  lat: number;
  lon: number;
}


interface RestroomViewProps {
  restrooms: Restroom[];
  loading: boolean;
  error: string | null;
  onRestroomSelect: (restroom: Restroom) => void;
}

export default function RestroomView({ restrooms, loading, error, onRestroomSelect }: RestroomViewProps) {


  if (loading) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-[#181B1F] rounded-t-2xl shadow-lg max-h-[45vh] overflow-y-auto flex justify-center items-center">
        <Loader className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-[#181B1F] rounded-t-2xl shadow-lg max-h-[45vh] overflow-y-auto">
            <p className="text-red-400 text-center">{error}</p>
        </div>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-[#181B1F] rounded-t-2xl shadow-lg max-h-[45vh] overflow-y-auto">
      <h2 className="text-white text-lg font-semibold mb-4">Nearby Restrooms</h2>
      <div className="space-y-4">
        {restrooms.map((restroom) => (
          <div
            key={restroom.id}
            onClick={() => onRestroomSelect(restroom)}
            className="p-4 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 cursor-pointer"
          >
            <h3 className="font-bold text-white text-lg truncate">{restroom.name}</h3>
            <div className="flex items-center mt-2 text-gray-300 text-sm">
              <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{restroom.address}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-600 flex justify-between items-center text-xs">
              <div className="flex items-center text-gray-300">
                <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">
                  {typeof restroom.distance === 'number'
                    ? `${restroom.distance.toFixed(2)} km away`
                    : 'Distance unavailable'}
                </span>
              </div>
              <div className={`flex items-center ${restroom.is_open ? 'text-green-400' : 'text-yellow-400'}`}>

                <Accessibility className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{restroom.is_open ? 'Open' : 'Closed'}</span>
              </div>
            </div>
          </div>
        ))}
        {restrooms.length === 0 && <p className="text-gray-400 text-center">No restrooms found nearby.</p>}
      </div>
    </div>
  );
}
