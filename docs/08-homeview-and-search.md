# app 入口页面和查询功能

## 1. 入口页面

点击 home 图标，当前位置移动到地图中间，下面的draggable panel显示当前地址的完整信息，和当前位置附近的公交线路，点击线路编号，跳转到线路详情页。
目前主要的功能基本完成，需要修改的内容：
i: 将 <div className="space-y-4"> 改成 draggable panel 的样式，可以参考 stopsview, RestroomView 中的  draggable panel  . Done
ii: 去掉 <Search className="w-6 h-6 text-[#3DDC97] mr-2" /> 不需要搜索功能    Done
iii: 在初始状态下，draggable panel 应该停留在屏幕中部，需要将地图显示出来，可以看到当前的位置 Done
iv: 在 公交线路列表上方，显示当前的地址信息，包括地址名称，和地址的经纬度。 done

### 设计方案和计划

- 修改 home 页底部面板：
  - 将当前使用的简单 div（className="space-y-4"）替换为类似 RestroomView 和 StopsView 组件中使用的 draggable panel。
  - 移除 home 面板搜索输入框中的 Search 图标。
- draggable panel 需支持垂直拖拽，带有弹簧动画和吸附点。
- 保留现有的公交线路列表渲染逻辑，放置于 draggable panel 内。
- 不修改 search 页顶部的搜索框和下拉结果。
- 修改文件：`app/[locale]/page.tsx`
- 修改后需测试 home 页 UI 和交互，确保 draggable panel 和线路列表正常显示，且 home 页无 Search 图标。

## 2. Search页面
点击search，地图显示顶部搜索框，对地址、公交线路、stop_code 进行查找。输入的同时下拉框中显示搜索结果，点击搜索结果，跳转到相应的页面。在页面的最上方显示查询框, 可以查询公交线路、站点、地址。
在输入的过程中查询，根据查询的结果类型，显示不同的图标。地址前面的图标是 position icon, 公交线路前面的图标是 公交车或地铁(根据route_type)，站点前面的图标是 stop icon。
在下拉框中选择一个结果，draggable panel 显示不同的内容，或跳转到相应的页面 
i: 如果是公交线路，跳转到该线路的详情页：stopsview。 
ii: 如果是地址，则将对应位置移动到屏幕中央，在下面的 draggable panel 显示地址的完整信息，并显示导航图标，点击导航图标可以跳转到 Google map。 在地址下方显示此地址附近的公交线路
iii: 如果是站点，则显示站点的详细信息，包括站点的地址，下面显示停靠此站点的所有公交线路

### 设计方案和计划

- 当前搜索功能仅搜索本地缓存的公交线路数据，导致无本地数据时无搜索结果。
- 计划增强搜索功能：
  - 在搜索输入时，先搜索本地缓存的公交线路。
  - 如果本地公交线路无匹配结果，调用远程API查询地址和站点数据（如 `/api/proxy-nominatim` 查询地址，新增或现有API查询站点）。
  - 合并本地公交线路和远程地址、站点搜索结果，更新搜索结果列表。
  - 搜索结果下拉框根据结果类型显示不同图标（公交线路、地址、站点）。
  - 点击搜索结果时，根据类型跳转或更新对应面板：
    - 公交线路跳转到 stopsview 页面。
    - 地址移动地图中心，显示地址详情和导航图标，显示附近公交线路。
    - 站点显示站点详情和停靠公交线路。
- 主要修改文件：
  - `app/[locale]/page.tsx`：增强搜索逻辑，调用远程API，合并结果，更新UI。
  - 可能新增或修改API路由以支持站点搜索。
- 测试：
  - 确认无本地公交线路时，搜索仍能显示地址和站点结果。
  - 确认搜索结果点击行为符合预期。
  - 确认搜索结果图标和显示正确。


### 设计方案和计划

- 在 search 页顶部显示搜索框，使用 `app/[locale]/components/SearchBox.tsx` 组件。
- 实现搜索结果下拉框，显示地址、公交线路、站点，带有不同图标。
- 点击搜索结果，根据类型跳转或更新 draggable panel 内容：
  - 公交线路跳转到 stopsview 页面。
  - 地址移动地图中心，显示地址详情和导航图标，显示附近公交线路。
  - 站点显示站点详情和停靠公交线路。
- 修改文件：
  - `app/[locale]/page.tsx`
  - 可能调整 `app/[locale]/components/SearchBox.tsx` 以支持更多功能。
- 测试搜索页面 UI 和交互，确保搜索框、结果显示和跳转功能正常。


Q:The home view panel and stops list panel are designed to show exclusively based on the state: the home view panel shows when activeTab is 'home' and stops list panel is closed, and the stops list panel shows when isStopsViewOpen is true.
A: Yes, that's correct. The home view panel and stops list panel are designed to show exclusively based

Q:Clicking a bus route search result sets isStopsViewOpen to true and activeTab to 'home', so only the stops list panel shows.
A: 部分正确， Clicking a bus route search result sets isStopsViewOpen to true， activeTab 不必切换到 'home'， 可以继续保留在 'search', only the stops list panel shows. 

Q:Clicking an address search result sets activeTab to 'home' but does not set isStopsViewOpen, so only the home view panel shows.
A: Yes, that's correct. the address and nearby bus routes are shown in the home view panel.


Q: Please clarify if your issue is that the home view panel shows when clicking an address search result (which is expected), or if it shows when clicking a bus route search result (which is unexpected).
A: home view only display selected address and routes nearby, no search result should be shown

Q: Also, please confirm your desired behavior for the draggable panels when clicking different types of search results.
A: - 点击搜索结果，根据类型跳转或更新 draggable panel 内容：
  - 公交线路跳转到 stopsview 页面。
  - 地址移动地图中心，显示地址详情和导航图标，显示附近公交线路。
  - 站点显示站点详情和停靠公交线路。
