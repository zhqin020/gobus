## 问题： app 页面布局修改

1. 总体布局 layout  @app\[locale]\page.tsx : 
    -- app 启动后显示homeview ，当前位置的地图和附近的站点和公交线路；  done
    -- 页面底部固定显示 4个图标：home, search, favorite, setting；
    -- 点击 favorite 图标，在地图上标记出 附近的厕所；
    -- 点击 setting 图标，显示 settingview；
    -- 点击 home 图标，显示 homeview；
    -- 点击 search 图标，显示 searchbox；
2. 地图修改：
    -- 取消地图上的setting 图标，将功能转移到页面底部的setting 图标上；
    -- search box， 在点击底部的 search icon 后，显示在地图上， 位置显示在地图的顶部； 