import { NextResponse } from 'next/server';

// Haversine formula to calculate distance between two points
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');

  // Overpass API query to find toilets within 3km radius
  const overpassQuery = `[out:json];
    node
      [amenity=toilets]
      (around:3000,${lat},${lng});
    out;`;

  const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

  try {
    const response = await fetch(overpassUrl, {
      headers: {
        'User-Agent': 'GoBus/1.0 (https://github.com/gobus-app/gobus)'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data from Overpass API. Status: ' + response.status);
    }

    const data = await response.json();
    console.log('[API /api/restrooms] Fetched ' + data.elements.length + ' records from Overpass API.');

    const restrooms = data.elements.map((item: any) => ({
      id: item.id,
      name: item.tags?.name || 'Public Toilet',
      address: item.tags?.address || 'Address not available',
      lat: item.lat,
      lon: item.lon,
      is_open: true, // No availability info in Overpass, assume open
      distance: getDistance(lat, lng, item.lat, item.lon),
    }));

    // Filter by distance (<= 5km), sort by distance, and take the top 30
    const filteredAndSortedRestrooms = restrooms
      .filter((r: any) => r.distance != null && r.distance <= 5)
      .sort((a: any, b: any) => a.distance - b.distance)
      .slice(0, 30);

    console.log('[API /api/restrooms] Returning ' + filteredAndSortedRestrooms.length + ' records after filtering.');

    return NextResponse.json(filteredAndSortedRestrooms);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
