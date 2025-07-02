# 地址查询问题与处理总结

## 1. 问题现象
- 地址联想API会同时调用Google Places、Mapbox、geocoder.ca，造成额度浪费。
- Google Places返回的联想结果未受地理范围限制，出现美国、南美等地的地址。
- 前端未传递lat/lng/city参数，后端解析为NaN或空，导致范围限制失效。
- Google Places返回有结果，但前端收到空数组，联想结果无法显示。
- Google Places返回内容始终为中文，前端切换语言无效。
- 设置页的语言、家庭/工作地址无法持久保存，刷新后丢失。

## 2. 处理过程与优化措施

### 2.1 串行API调用
- 优化后端API逻辑，确保只有前一个API无结果或额度/权限不足时才调用下一个，避免额度浪费。

### 2.2 地理范围限制
- 前端自动获取当前位置（lat/lng），并在地址联想请求时传递给后端。
- 后端收到lat/lng/radius参数后，正确传递给Google Places API的locationRestriction。
- 增强后端本地过滤逻辑，结合secondaryText/description字段和city参数，进一步过滤跨省/国家结果。

### 2.3 结果字段兼容与解析
- 修正后端Google Places v1结果字段解析，兼容suggestions/structuredFormat，拼接mainText和secondaryText，避免过滤掉所有结果。

### 2.4 多语言支持
- 前端在地址联想请求时自动带上当前界面语言（language参数）。
- 后端读取language参数并传递给Google Places API，保证返回内容与前端语言一致。

### 2.5 本地持久化
- 设置页的语言、home/work地址自动保存到localStorage，下次启动时自动恢复。

## 3. 结果
- 地址联想API调用严格串行，额度利用最优。
- 联想结果受地理范围和城市名限制，内容更精准。
- 多语言切换即时生效，联想内容与界面语言一致。
- 设置项本地持久保存，用户体验提升。

---
如需进一步优化或有新需求，请随时提出。
