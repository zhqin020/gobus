## 洗手间发现功能

1. 点击 底部的favorate icon 显示附近的公共洗手间，
2. 在地图上展示相应的restroom icon, 同时，在滑动 panel 列出发现的洗手间列表， 样式参考：docs\refer\restroom-finder.tsx
3. 应该限制输出结果的数量
    --距离5km 以内
    --距离最近的30个记录


## 接口：
可以使用当地城市的公共数据接口，
const API_ENDPOINTS = {
  vancouver: 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/public-washrooms/records?limit=100',
  toronto: 'https://open.toronto.ca/api/v1/datastore/search?resource_id=84045937-0341-4561-81e0-72125559fc6c&limit=100',
};


## 本地缓存和数据更新
由于洗手间的信息相对固定，尽量使用localStorage来缓存数据，避免每次都需要请求接口， 频繁访问公共接口会被限制访问甚至进入黑名单。
数据更新服务端也可参照 GTFS 更新数据的方式，定期更新数据。如果数据过期24小时，则更新数据库。
优先在本地缓存中查找，如果缓存中不存在，则从服务器的数据库查找，并更新本地缓存。
如果服务器没有数据，则访问 https://overpass-api.de， https://nominatim.openstreetmap.org/， 增量更新服务器的数据库

由于数据库里已经保存了GTFS 公交信息，会定期更新。目前是先删除再重建、更新。如果再添加洗手间数据，当定期更新GTFS数据时就不应该在更新前删除数据库，而是增量更新。
根据上面的需求，需要对已有的数据库更新程序进行修改。

### Restroom 数据更新和读取方案

- 修改 `scripts/import-gtfs-sqlite.js`，支持增量更新，避免每次导入时删除整个数据库。
- 新增 `restrooms` 表，包含字段：`id`、`name`、`address`、`lat`、`lon`、`distance`、`is_open`。
- 直接从公共数据接口（如温哥华、 多伦多开放数据平台）导入洗手间数据，取消使用 `data/restrooms.json` 文件。
- 使用 UPSERT 语句实现数据库的增量更新。
- 通过比较数据更新时间戳或版本号判断是否需要更新数据库，从而触发增量更新。建议将洗手间数据的更新时间保存到 `data/gtfs_version.json` 文件中。
- 当洗手间数据超过一周未更新时，视为过期，客户端查询请求将直接访问公共数据平台以获取最新数据，并触发服务器端数据更新。
- 该更新逻辑集成在现有 GTFS 数据导入流程中，确保洗手间数据与公交数据同步更新。
- 客户端优先使用 `localStorage` 缓存洗手间数据，提升访问速度并减少公共接口请求频率。
-当缓存数据过期或不存在时，数据更新应由前端驱动：
  - 客户端先在本地缓存查询数据。
  - 查询失败时，向服务器发送查询请求。
  - 服务器数据库无结果或数据过期时，访问公共数据平台获取最新数据并更新数据库。
  - 这样确保数据及时更新且减少不必要的公共接口请求。

此方案确保洗手间数据的及时更新和高效访问，避免频繁请求公共接口导致的访问限制问题。


## AI asks
Q:Do you want the new RestroomView component to include both the list of restrooms and the map markers, or should the map markers remain managed by the MapView component separately?
A: 需要提供一个api，用来查询附近的洗手间，然后返回一个数组，数组中包含每个洗手间的经纬度，以及名称，地址，距离，是否可用等信息。这个功能不要放在MapView组件中，MapView组件可以调用接口，进行洗手间的显示。RestroomView 组件只负责显示洗手间的清单， 点击一条记录， 地图上相应位置的图标变色并移动到地图中心。

Q: Should the restroom data fetching be triggered only when the favorite tab is active, or should it be pre-fetched and cached for faster display? . I will create a plan to suit the response to these questions.
A: restroom data fetching be triggered only when the favorite tab is active, and the data should be pre-fetched and cached for faster display.

## Implementation Plan

### 1. Create a Dedicated API Route for Restrooms

*   **File:** `app/api/restrooms/route.ts` (New file)
*   **Action:**
    *   Create a new API endpoint that accepts `lat` and `lng` as query parameters.
    *   This endpoint will fetch data from the appropriate city's public restroom API (starting with Vancouver).
    *   It will calculate the distance of each restroom from the user's provided coordinates.
    *   The API will format and return a JSON array of restroom objects, each containing:
        *   `id`
        *   `name`
        *   `address`
        *   `lat`
        *   `lng`
        *   `distance`
        *   `is_open` (or a similar availability field)
    *   Implement logic to check the restroom data version timestamp in `data/gtfs_version.json`.
    *   If the restroom data is expired (older than one week), fetch fresh data from the public API and update the database.

### 2. Create the `RestroomView` Component

*   **File:** `app/[locale]/components/RestroomView.tsx` (New file)
*   **Action:**
    *   Create a new client-side component to display a list of nearby restrooms.
    *   This component will be responsible for fetching data from the new `/api/restrooms` endpoint.
    *   It will display the restrooms in a styled list within a sliding panel, similar to `StopsView.tsx`.
    *   It will accept a prop (`onRestroomSelect`) to notify the parent component when a restroom is selected.

### 3. Update the `MapView` Component

*   **File:** `components/MapView.tsx`
*   **Action:**
    *   Remove the existing logic that directly fetches restroom data.
    *   Add two new props: `restrooms` (to receive the list of restroom data) and `selectedRestroomId` (to identify the selected marker).
    *   Render restroom markers on the map based on the `restrooms` prop.
    *   Implement logic to highlight the marker that matches `selectedRestroomId`.
    *   Expose a new function via `useImperativeHandle` called `centerOnRestroom(coords)` to allow the parent component to pan the map to a specific location.

### 4. Refactor the Main Page Component

*   **File:** `app/[locale]/page.tsx`
*   **Action:**
    *   Introduce new state variables to manage the list of restrooms (`restrooms`), the selected restroom (`selectedRestroom`), and the cached data.
    *   When the "favorite" tab is activated:
        *   First, check the cache for existing restroom data.
        *   If data is not cached, fetch it from the `/api/restrooms` endpoint and store it in both the state and the cache.
        *   Render the new `RestroomView` component.
    *   Pass the `restrooms` data and the `selectedRestroomId` to the `MapView` component.
    *   Implement the `onRestroomSelect` handler. When a restroom is selected in `RestroomView`, this handler will:
        *   Update the `selectedRestroom` state.
        *   Call the new `centerOnRestroom` function on the `MapView`'s ref to move the map.
