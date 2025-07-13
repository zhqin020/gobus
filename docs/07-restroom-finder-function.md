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


## 本地缓存
由于洗手间的信息相对固定，尽量使用localStorage来缓存数据，避免每次都需要请求接口。
服务端也可参照 GTFS 更新数据的方式，定期更新数据。如果数据过期24小时，则更新数据库

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
