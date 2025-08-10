测试：点击 route number 显示 stopview
问题：不能显示地图和公交线路，也不能显示站点
 GET /en 200 in 86ms
 GET /api/routes?lat=49.16279408138799&lng=-123.12498074185957 304 in 17441ms
 GET /api/gtfs/route/34543 404 in 283ms

 取数的问题已经解决，404 错误解决

 下一步，解决这个问题：
可以输出站点的列表了，但是将两个方向的站点显示在同一个列表中，这个不合理。应该两个方向区分开，仅显示一个方向，点击箭头图标后，显示相反的线路

stopsview keep showing '加载线路数据中'，  no data shown  ，已解决

下一步，需要解决地图和线路显示的问题
上图是公交信息app的一个页面，请提供nextjs 页面设计

说明：

1. 背景是当前的地图，上面有当前公交线路 fixed

2. 地图上面一层有一个可以从底部拖动的panel，显示当前公交线路的信息，也可以拖动到底部，显示完整的地图，这个panel 顶部是拖动的header,  fixed

3. 下面是显示线路方向的按钮，分别显示公交的不同方向的终点，点击按钮后可以切换，显示另一个方向的站点。 fixed

4. 下面是当前方向的终点站和当前位置到终点的车站数量。 fixed

5. 下面是车站的列表，和预计到达时间，如果站点有其他的换乘车次，则显示这些车次
    --如果有换乘的route, 则在车站名称下面列出各个route的编号， route_type=1 subway,  route_type=3 bus,  不同的类型显示不同的图标， 先显示subway, 然后列出bus numbers

6. 在车站的右边，显示车辆到达本站的相对时间，+ 1min, 下一个 的时间为 +5min ...
 相对时间从 stop_times 表中获取，diff = stop_times.arrival_time - stop_times.departure_time (of start station)

请参照 docs\refer\get-route-stops-v2.tsx 对 stopsview 进行修改
主要有以下内容：
1. 修改站点列表的显示，目前的连接线是断开的
2. 在站点下方显示换乘线路编号，优先显示地铁，然后是BUS，区分方法：routes.route_type=1 (subway), 3 (bus)
3. 显示风格和图标按照 get-route-stops-v2.tsx
4. 换乘线路的查询方法，参照 docs\refer\get-route-stops-v2.tsx 中的 function getTransferBusLinesForArea 

## 遗留问题：
1. no result when there's no data in local, it seems that the search function only search cached data in local. fixed
2. 查询结果的显示：
    i: stop:  [stop icon]  [stop_code]  [stop name]
    ii: Route: [stop/train icon] [route short name] [trip_headsign]
    iii: Address: [MapPin icon] [address]
3. 查询结果点击后的跳转：
    i: stop:  search view draggable panel.  依次显示：stop info( id, address), Route list(格式和 homeview 中的 route list 一样)
    ii: Route: stopsview.  done
    iii: Address: homeview.  显示选中的地址详细信息和附近的公交线路
问题还是没有解决。看来设计上有问题，需要进行大的改动

点击地址后，不要跳转到homeview,  homeview的功能只有一个：显示当前位置和附近的公交信息。

点击地址后，在search tabpage 显示draggable panel, 格式和 homeview 的相同，但是内容是选中的地址，以及附近的公交信息