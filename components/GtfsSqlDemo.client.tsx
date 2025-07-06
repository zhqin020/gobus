import { useEffect, useState } from 'react';

export default function GtfsSqlDemo() {
  // SSR/构建阶段直接返回 null，防止 fs/sql.js 被 Next.js 解析
  if (typeof window === 'undefined') return null;

  const [routes, setRoutes] = useState<any[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let db: any = null;
    async function initDb() {
      // 动态 require，彻底避免 Next.js 构建时静态分析
      const initSqlJs = require('sql.js/dist/sql-wasm.js');
      const SQL = await initSqlJs({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}`
      });
      const res = await fetch(`${window.location.origin}/gtfs.sqlite`);
      const buf = await res.arrayBuffer();
      db = new SQL.Database(new Uint8Array(buf));
      const stmt = db.prepare('SELECT route_id, route_short_name, route_long_name FROM routes LIMIT 20');
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      setRoutes(rows);
      setDbReady(true);
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
        {routes.map(r => (
          <li key={r.route_id}>{r.route_short_name} - {r.route_long_name}</li>
        ))}
      </ul>
    </div>
  );
}
