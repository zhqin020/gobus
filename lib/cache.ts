// GTFS 数据缓存管理
class GTFSDataCache {
  private static instance: GTFSDataCache;
  private cache: Map<string, { data: any; etag: string; timestamp: number }>;
  
  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): GTFSDataCache {
    if (!GTFSDataCache.instance) {
      GTFSDataCache.instance = new GTFSDataCache();
    }
    return GTFSDataCache.instance;
  }

  // 存储数据
  set(key: string, data: any, etag: string): void {
    this.cache.set(key, {
      data,
      etag,
      timestamp: Date.now()
    });
  }

  // 获取数据
  get(key: string): { data: any; etag: string } | null {
    const item = this.cache.get(key);
    return item ? { data: item.data, etag: item.etag } : null;
  }

  // 检查缓存有效性
  isValid(key: string, currentEtag: string): boolean {
    const item = this.cache.get(key);
    return item ? item.etag === currentEtag : false;
  }
}

export const gtfsCache = GTFSDataCache.getInstance();