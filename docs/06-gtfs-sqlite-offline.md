# GTFS SQLite 离线方案实施计划

## 总体目标
- 后端定期生成最新 gtfs.sqlite 并提供下载。
- 前端 Next.js 首次联网时下载数据库文件，后续离线直接用 sql.js 查询。
- 用户个性化数据（如设置、收藏）用 localStorage/IndexedDB 存储。

---

## 实施步骤

### 1. 后端：GTFS TXT 导入 SQLite 脚本
- [x] 新建 `scripts/import-gtfs-sqlite.js`，将 `data/google_transit/*.txt` 导入 `data/gtfs.sqlite`。
- [x] 支持自动建表、批量导入、类型推断。
- [x] 可集成到定时任务或 GTFS 解压后自动执行。
- [x] 测试：生成的 gtfs.sqlite 能用 SQLite 工具正常查询。

### 2. 后端：提供数据库下载接口
- [x] 将 `gtfs.sqlite` 拷贝到 `/public/gtfs.sqlite`，或提供 `/api/download-gtfs-sqlite` 下载接口。
- [x] 测试：前端可通过 URL 下载数据库文件。

### 3. 前端：集成 sql.js 离线查询
- [x] 安装 `sql.js`。
- [x] 首次联网 fetch `/gtfs.sqlite`，用 sql.js 加载。
- [x] 支持 IndexedDB 缓存数据库，断网可用。
- [x] 提供基本 SQL 查询接口（如线路、站点、时刻表等）。
- [x] 测试：离线状态下可正常查询。

### 4. 前端：用户个性化数据本地存储
- [ ] 用户设置、收藏等用 localStorage/IndexedDB 存储。
- [ ] 测试：个性化数据与主库分离，升级无影响。

---

## 备注
- 每一步完成后，建议先测试再进入下一步，确保可控。
- 方案支持大数据量、离线体验、升级平滑。
- 如需详细代码和集成说明，见本文件后续补充。

---

> 本文档将随实施进度持续更新。
