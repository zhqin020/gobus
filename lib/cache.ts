class GTFSDataCache {
  private static instance: GTFSDataCache;
  private cache: Map<string, { data: any; etag: string; timestamp: number }>;
  private expirationMap: Map<string, number>;

  private constructor() {
    this.cache = new Map();
    this.expirationMap = new Map();
  }

  public static getInstance(): GTFSDataCache {
    if (!GTFSDataCache.instance) {
      GTFSDataCache.instance = new GTFSDataCache();
    }
    return GTFSDataCache.instance;
  }

  // 存储数据，支持可选过期时间（毫秒）
  set(key: string, data: any, etag: string, expirationMs?: number): void {
    this.cache.set(key, {
      data,
      etag,
      timestamp: Date.now()
    });
    if (expirationMs !== undefined) {
      this.expirationMap.set(key, Date.now() + expirationMs);
    } else {
      this.expirationMap.delete(key);
    }
  }

  // 获取数据
  get(key: string): { data: any; etag: string } | null {
    if (this.isExpired(key)) {
      this.cache.delete(key);
      this.expirationMap.delete(key);
      return null;
    }
    const item = this.cache.get(key);
    return item ? { data: item.data, etag: item.etag } : null;
  }

  // 检查缓存有效性，考虑过期时间
  isValid(key: string, currentEtag: string): boolean {
    if (this.isExpired(key)) {
      this.cache.delete(key);
      this.expirationMap.delete(key);
      return false;
    }
    const item = this.cache.get(key);
    return item ? item.etag === currentEtag : false;
  }

  // 判断缓存是否过期
  private isExpired(key: string): boolean {
    const expireAt = this.expirationMap.get(key);
    if (expireAt === undefined) return false;
    return Date.now() > expireAt;
  }
}

export const gtfsCache = GTFSDataCache.getInstance();
