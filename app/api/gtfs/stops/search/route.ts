import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.toLowerCase() || '';

  if (!q) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const db = await open({
      filename: './data/gtfs.sqlite',
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY,
    });

    // Search stops by stop_name or stop_code matching query
    const stops = await db.all(
      `SELECT stop_id, stop_code, stop_name, stop_lat, stop_lon
       FROM stops
       WHERE LOWER(stop_name) LIKE '%' || ? || '%'
          OR LOWER(stop_code) LIKE '%' || ? || '%'
       LIMIT 20`,
      q,
      q
    );

    await db.close();

    return NextResponse.json(stops, { status: 200 });
  } catch (error) {
    console.error('Error searching stops:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
