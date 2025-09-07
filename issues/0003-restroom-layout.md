## 问题：

需要对 @app\[locale]\components\RestroomView.tsx  显示布局进行修改：
1. 显示洗手间列表的panel， 应该和 stopsview 风格一致，有一个可拖动的header, 可以从底部拖动到中间，到顶部，可以缩到底部，显示完整的地图
2. 地址下面显示 tags, 用户可以了解洗手间的特点
3. 删除 Closed 图标和lable, 改为导航 icon，可以 调用google map 程序进行导航
4. 记录中间的分割线，应该在当前记录的 xxxkm away, 和 下一个Address 之间。目前在当前记录的 xxxkm away 的上方，导致视觉上容易混淆
5. when set "show business restrooms" off,  no restroom shown in dragable panel, all public restroom should be listed in dragable panel.
6. 点击 favorite icon, 没有效果


## 解决摘要

概述：为了让 `RestroomView` 的交互和视觉与 `StopsView` 保持一致，并改善可用性，建议按下面方案逐项实现并验证。下面包含每项的实现建议、验收准则和下一步动作。

1) 面板可拖拽与布局一致
- 建议：复用 `StopsView` 中的 draggable header 与 `framer-motion` 控制器（或封装为可复用 Hook），使 `RestroomView` 可以从底部拖到中间、到顶部，支持缩到底部仅显示地图。
- 验收准则：面板在拖拽结束时停靠点与 `StopsView` 一致；无明显抖动；在最小化时地图无遮挡。

2) 地址下显示 tags
- 建议：后端/数据模型在 restroom 对象中包含 `tags` 字段（字符串数组），客户端在地址行下方渲染为 `Badge`/标签列，最多展示 3 个并支持 "更多"。
- 验收准则：标签可见、样式与应用中其他标签一致；在无 tags 时不留空白占位。

3) 替换 Closed 图标为导航按钮
- 建议：删除 "Closed" 的图标/文本，增加一个导航 (directions) 图标按钮；点击时调用外部导航（首选使用 Google Maps universal link：`https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`），移动端可唤起地图 APP。
- 验收准则：点击后能打开 Google Maps（或在桌面打开浏览器方向页面）；按钮带 aria-label 和可访问性提示。

4) 调整分割线位置
- 建议：将记录间的分割线渲染在当前记录的下方（即在显示 "xxx km away" 下方），保证视觉上分割当前记录与下一个地址；在组件中把分割线放到条目结束位置而不是开始位置。
- 验收准则：视觉上不再把分割线显示在当前记录的上方，用户能直观区分条目边界。

5) "show business restrooms" 开关行为
- 建议：当开关为 off 时，客户端应过滤掉 `is_business`（或类似字段）为 true 的记录；如果后端支持，优先通过 API 参数过滤（如 `/api/restrooms?showBusiness=false`）以减少网络传输。
- 验收准则：关掉开关后，拖拽面板只显示公共洗手间；无空白或空面板（若没有公共洗手间，应显示 "无结果" 信息）。

优先级与验收
- 优先级：1) 面板拖拽与分割线（影响交互） 2) show business 筛选（影响数据正确性） 3) 标签与导航按钮（增强体验）。
- 验收：为每项增加一条小型验收测试（手动或端到端），并在 PR 描述中引用。

实现范围与修改文件（建议）
- 前端：`app/[locale]/components/RestroomView.tsx`（主改动）
- 可复用：`components/ui` 下的 draggable header / panel 样式或 Hook（可抽出供 `StopsView` 与 `RestroomView` 复用）
- 后端（可选）：`pages/api/restrooms` 增加 `showBusiness` 参数或保证返回对象包含 `tags`, `is_business`, `lat/lng` 等字段

当前状态
- 状态：待实现（issue 已记录并补充了解决摘要）
- 推荐下一步：由一名开发者依据上文实现 1 个最小可运行 PR（建议先实现面板拖拽与筛选逻辑），完成后移除 debug 日志并加入小型验收测试。

如果需要，我可以：
- 按照上述步骤为 `RestroomView` 草拟一个具体的实现补丁（包含 UI/样式和 API 使用），并在本仓库直接创建修改补丁。
- 或者先生成一个 PR 描述和代码分工清单供指派人员使用。
