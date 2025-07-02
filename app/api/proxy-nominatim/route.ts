import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q) {
    return NextResponse.json([], { status: 200 });
  }
  // 代理到 Nominatim API
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=5`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'gobus-app/1.0',
      'Accept-Language': 'en',
    },
  });
  if (!res.ok) {
    return NextResponse.json([], { status: 200 });
  }
  const data = await res.json();
  // 提取显示用的地址字符串
  const results = Array.isArray(data)
    ? data.map((item: any) => item.display_name)
    : [];
  return NextResponse.json(results);
}
