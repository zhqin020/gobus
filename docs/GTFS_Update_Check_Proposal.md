# GTFS 数据更新检查方案

## 当前问题
1. **无版本检查机制**：每次请求都重新下载完整GTFS数据
2. **无缓存机制**：无法利用本地已有数据
3. **无更新日志**：无法追踪数据更新情况

## 性能影响
- 每次请求都下载完整数据包(约50MB)
- 服务器带宽浪费
- 响应时间延长

## 优化解决方案

### 1. 数据分片处理
```typescript
// 首次全量下载
const fullData = await downloadFullGTFS()

// stop_times单独处理
const stopTimes = await downloadStopTimes({
  cacheKey: `stop_times_${YYYYMM}`,
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30天缓存
})
```

### 2. 按需加载机制
```typescript
// 懒加载stop_times
function getStopTimes() {
  if (!cache.has('stop_times')) {
    return downloadStopTimes()
  }
  return cache.get('stop_times')
}
```

### 3. 缓存控制
```typescript
// 按月缓存stop_times
const cacheKey = `stop_times_${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}`
```

### 4. 更新策略
- 基础数据: 每周检查更新
- stop_times: 每月更新 + 按需刷新
```

## 实施步骤
1. 添加HTTP头检查
2. 实现本地缓存系统
3. 添加详细更新日志
4. 优化数据加载流程

## 确认要求
请确认是否按此方案实施修改？同意

1. 实施计划：

分三个阶段实施修改
先实现基础架构再添加优化
确保每个阶段可独立测试
2. 第一阶段：基础架构

添加HTTP头检查
实现版本日志
不改动现有下载逻辑
3. 第二阶段：缓存机制

添加本地缓存系统
实现ETag比对
保持向后兼容
4. 第三阶段：按需加载

拆分stop_times下载
实现按月缓存
添加懒加载逻辑
5. 实施方式：

每个阶段单独提交
添加详细注释
包含测试用例

# GTFS Data Download and Import Automation - Updated Proposal

## Background

The application requires GTFS (General Transit Feed Specification) data to be downloaded, imported into a SQLite database, and then queried by the API to provide transit route information.

## Initial Problem

- When the application started with an empty `data` directory (no GTFS data files and no SQLite database<create_file>
<path>docs/GTFS_Update_Check_Proposal_Updated.md</path>
<content>
# GTFS Data Download and Import Automation

## Background

The application requires GTFS (General Transit Feed Specification) data to be downloaded, imported into a SQLite database, and then queried by the API to provide transit route information.

## Initial Problem

- When the application started with an empty `data` directory (no GTFS data files and no SQLite database), the API failed to return route information.
- The import script reported "Found 0 GTFS files to import," resulting in an empty database without the required tables.
- The API returned errors such as `SQLITE_ERROR: no such table: stops` because the database was not populated.
- The download script skipped downloading GTFS data if the version file indicated the data was up to date, without verifying the actual presence of GTFS data files.
- The API initialization logic only ran the import script if the database file was missing, ignoring the case where GTFS data files were missing but the database file existed.
- Duplicate route entries were observed in the frontend due to concurrent import processes causing duplicate data insertion in the database.

## Solution

### 1. Download Script Update

- Modified the download script (`scripts/download-gtfs.js`) to check if the GTFS data directory exists and contains GTFS files before skipping the download.
- This ensures that even if the version file indicates the data is up to date, the script will download and unzip the GTFS data if the files are missing.
- Added a concurrency lock mechanism using a lock file to prevent multiple concurrent download or import processes.

### 2. API Initialization Update

- Updated the API initialization logic (`pages/api/routes.ts`) to:
  - Check if GTFS data files exist; if not, run the download script.
  - Run the import script if either the SQLite database file or the GTFS data files are missing.
  - Respect the concurrency lock to avoid starting multiple import processes concurrently.

### 3. Import Script Update

- The import script (`scripts/import-gtfs-sqlite.js`) was updated to handle cases where the database file could not be deleted due to being locked or busy, logging a warning and continuing the import process.
- Added a concurrency lock mechanism using a lock file to prevent multiple concurrent import processes.
- Ensured that only one instance of the import or download process can run at a time, preventing duplicate data insertion.

## Outcome

- With these updates, the application can start with an empty `data` directory.
- On first access, the app automatically downloads the GTFS data, imports it into the SQLite database, and serves route information without errors.
- The concurrency lock mechanism prevents duplicate route entries caused by concurrent imports.
- This automation improves reliability and user experience by removing manual setup steps and preventing data inconsistencies.

## Recommendations

- Monitor the GTFS data version file and periodically trigger the download and import process to keep data up to date.
- Handle potential database locks gracefully to avoid import failures.
- Use concurrency locks to prevent multiple simultaneous import or download processes.
- Consider adding logging and alerting for download or import failures to facilitate maintenance.

---

*Document last updated: [Insert Date]*
