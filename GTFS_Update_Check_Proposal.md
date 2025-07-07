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