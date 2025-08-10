// 自定义sqlite3类型声明

declare module 'sqlite3' {
  export class Database {
    constructor(filename: string, mode?: number, callback?: (err: Error | null) => void);
    close(callback?: (err: Error | null) => void): void;
    all(sql: string, ...params: any[]): Promise<any[]>;
    get(sql: string, ...params: any[]): Promise<any>;
    run(sql: string, ...params: any[]): Promise<void>;
    // 添加其他需要的方法定义
  }

  export const OPEN_READONLY: number;
  export const OPEN_READWRITE: number;
  export const OPEN_CREATE: number;
}