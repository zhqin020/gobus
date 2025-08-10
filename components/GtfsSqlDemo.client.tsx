import { useEffect, useState } from 'react';

export default function GtfsSqlDemo() {
  // SSR/构建阶段直接返回 null，防止 fs/sql.js 被 Next.js 解析
  if (typeof window === 'undefined') return null;

  const [routes, setRoutes] = useState<any[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [offline, setOffline] = useState(false);

  async function checkForUpdates() {
    console.log('[GTFS Update] Checking for updates...');
    const now = new Date().getTime();
    const lastUpdate = localStorage.getItem('gtfs_last_update');
    
    if (!lastUpdate) {
      console.log('[GTFS Update] No previous update timestamp found - first time load');
    } else {
      const hoursSinceUpdate = (now - parseInt(lastUpdate)) / (60 * 60 * 1000);
      console.log(`[GTFS Update] Last update was ${hoursSinceUpdate.toFixed(1)} hours ago`);
    }

    // 24小时 = 86400000毫秒
    if (!lastUpdate || (now - parseInt(lastUpdate)) > 86400000) {
      console.log('[GTFS Update] Update required (24h threshold exceeded)');
      try {
        console.log('[GTFS Update] Fetching version info from /api/gtfs-version');
        const versionRes = await fetch('/api/gtfs-version');
        
        if (!versionRes.ok) {
          console.error('[GTFS Update] Version check failed:', versionRes.status);
          return false;
        }

        const { timestamp } = await versionRes.json();
        console.log('[GTFS Update] Latest version timestamp:', new Date(timestamp).toISOString());
        
        localStorage.setItem('gtfs_last_update', now.toString());
        console.log('[GTFS Update] Updated local timestamp to current time');
        return true;
      } catch (err) {
        console.error('[GTFS Update] Version check error:', err);
        return false;
      }
    }
    console.log('[GTFS Update] No update needed');
    return false;
  }

  useEffect(() => {
    let db: any = null;
    async function initDb() {
      console.log('[GTFS Load] Initializing database...');
      
      try {
        // 动态 require，彻底避免 Next.js 构建时静态分析
        const initSqlJs = require('sql.js/dist/sql-wasm.js');
        const SQL = await initSqlJs({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}`
        });

        // 检查更新
        const shouldUpdate = await checkForUpdates();
        const cacheBuster = shouldUpdate ? `?t=${Date.now()}` : '';
        
        console.log(`[GTFS Load] Fetching database with cacheBuster: ${cacheBuster || 'none'}`);
        const res = await fetch(`${window.location.origin}/gtfs.sqlite${cacheBuster}`);
        
        if (!res.ok) {
          console.error('[GTFS Load] Database download failed:', res.status);
          return;
        }

        console.log('[GTFS Load] Database downloaded, initializing...');
        const buf = await res.arrayBuffer();
        db = new SQL.Database(new Uint8Array(buf));
        
        console.log('[GTFS Load] Querying sample routes...');
        const stmt = db.prepare('SELECT route_id, route_short_name, route_long_name FROM routes LIMIT 20');
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        
        console.log(`[GTFS Load] Retrieved ${rows.length} sample routes`);
        setRoutes(rows);
        setDbReady(true);
        console.log('[GTFS Load] Database initialized successfully');
      } catch (err) {
        console.error('[GTFS Load] Initialization error:', err);
      }
    }
    initDb();
    const handle = () => setOffline(!navigator.onLine);
    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    return () => {
      window.removeEventListener('online', handle);
      window.removeEventListener('offline', handle);
    };
  }, []);

  return (
    <div style={{background:'#222',color:'#fff',padding:16}}>
      <h2>GTFS SQLite Demo</h2>
      <div>数据库状态: {dbReady ? '已加载' : '加载中'} {offline && '(离线)'}</div>
      <h3>线路示例 (前20条):</h3>
      <ul>
        {(Array.isArray(routes) ? routes : []).map(r => (
          <li key={r.route_id}>{r.route_short_name} - {r.route_long_name}</li>
        ))}
      </ul>
    </div>
  );
}