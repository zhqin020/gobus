# GTFS 数据库结构说明

本文档描述了 GTFS SQLite 数据库的结构，包含以下表：

## 数据库表列表

1. [agency](#agency)
2. [calendar](#calendar)
3. [calendar_dates](#calendar_dates)
4. [directions](#directions)
5. [direction_names_exceptions](#direction_names_exceptions)
6. [feed_info](#feed_info)
7. [routes](#routes)
8. [route_names_exceptions](#route_names_exceptions)
9. [shapes](#shapes)
10. [signup_periods](#signup_periods)
11. [stops](#stops)
12. [stop_order_exceptions](#stop_order_exceptions)
13. [stop_times](#stop_times)
14. [transfers](#transfers)
15. [trips](#trips)

## 表结构详情

### agency
存储公交机构信息

| 字段名 | 类型 | 描述 |
|--------|------|------|
| agency_id | TEXT | 机构ID |
| agency_name | TEXT | 机构名称 |
| agency_url | TEXT | 机构网址 |
| agency_timezone | TEXT | 机构时区 |
| agency_lang | TEXT | 机构语言 |
| agency_fare_url | TEXT | 票价信息网址 |

### calendar
服务日历表

| 字段名 | 类型 | 描述 |
|--------|------|------|
| service_id | REAL | 服务ID |
| monday | REAL | 周一是否服务(1/0) |
| tuesday | REAL | 周二是否服务(1/0) |
| wednesday | REAL | 周三是否服务(1/0) |
| thursday | REAL | 周四是否服务(1/0) |
| friday | REAL | 周五是否服务(1/0) |
| saturday | REAL | 周六是否服务(1/0) |
| sunday | REAL | 周日是否服务(1/0) |
| start_date | REAL | 服务开始日期 |
| end_date | REAL | 服务结束日期 |

### calendar_dates
日历例外日期表

| 字段名 | 类型 | 描述 |
|--------|------|------|
| service_id | REAL | 服务ID |
| date | REAL | 日期 |
| exception_type | REAL | 例外类型 |

### directions
方向信息表

| 字段名 | 类型 | 描述 |
|--------|------|------|
| direction | TEXT | 方向描述 |
| direction_id | REAL | 方向ID |
| route_id | REAL | 线路ID |
| route_short_name | REAL | 线路简称 |
| LineIdConst | REAL | 线路常量ID |

### direction_names_exceptions
方向名称例外表

| 字段名 | 类型 | 描述 |
|--------|------|------|
| route_name | REAL | 线路名称 |
| direction_id | REAL | 方向ID |
| direction_name | TEXT | 方向名称 |
| direction_do | REAL | 方向操作 |

### feed_info
数据源信息表

| 字段名 | 类型 | 描述 |
|--------|------|------|
| feed_publisher_name | TEXT | 数据发布者名称 |
| feed_publisher_url | TEXT | 数据发布者网址 |
| feed_lang | TEXT | 数据语言 |
| feed_start_date | REAL | 数据开始日期 |
| feed_end_date | REAL | 数据结束日期 |
| feed_version | TEXT | 数据版本 |

### routes
线路信息表

| 字段名 | 类型 | 描述 |
|--------|------|------|
| route_id | REAL | 线路ID |
| agency_id | TEXT | 所属机构ID |
| route_short_name | REAL | 线路简称 |
| route_long_name | TEXT | 线路全称 |
| route_desc | TEXT | 线路描述 |
| route_type | REAL | 线路类型 |
| route_url | TEXT | 线路网址 |
| route_color | TEXT | 线路颜色 |
| route_text_color | TEXT | 文字颜色 |

### route_names_exceptions
线路名称例外表

| 字段名 | 类型 | 描述 |
|--------|------|------|
| route_id | REAL | 线路ID |
| route_name | REAL | 线路名称 |
| route_do | TEXT | 线路操作 |
| name_type | TEXT | 名称类型 |

### shapes
线路形状点表

| 字段名 | 类型 | 描述 |
|--------|------|------|
| shape_id | REAL | 形状ID |
| shape_pt_lat | REAL | 点纬度 |
| shape_pt_lon | REAL | 点经度 |
| shape_pt_sequence | REAL | 点顺序 |
| shape_dist_traveled | REAL | 行驶距离 |

### signup_periods
注册时段表

| 字段名 | 类型 | 描述 |
|--------|------|------|
| sign_id | REAL | 注册ID |
| from_date | REAL | 开始日期 |
| to_date | REAL | 结束日期 |

### stops
站点信息表

| 字段名 | 类型 | 描述 |
|--------|------|------|
| stop_id | REAL | 站点ID |
| stop_code | REAL | 站点代码 |
| stop_name | TEXT | 站点名称 |
| stop_desc | TEXT | 站点描述 |
| stop_lat | REAL | 站点纬度 |
| stop_lon | REAL | 站点经度 |
| zone_id | TEXT | 区域ID |
| stop_url | TEXT | 站点网址 |
| location_type | REAL | 位置类型 |
| parent_station | TEXT | 父站点 |
| wheelchair_boarding | REAL | 轮椅可达性 |

### stop_order_exceptions
站点顺序例外表

| 字段名 | 类型 | 描述 |
|--------|------|------|
| route_name | TEXT | 线路名称 |
| direction_name | TEXT | 方向名称 |
| direction_do | REAL | 方向操作 |
| stop_id | REAL | 站点ID |
| stop_name | TEXT | 站点名称 |
| stop_do | REAL | 站点操作 |

### stop_times
站点时间表

| 字段名 | 类型 | 描述 |
|--------|------|------|
| trip_id | REAL | 行程ID |
| arrival_time | TEXT | 到达时间 |
| departure_time | TEXT | 离开时间 |
| stop_id | REAL | 站点ID |
| stop_sequence | REAL | 站点顺序 |
| stop_headsign | TEXT | 站点显示牌 |
| pickup_type | REAL | 上车类型 |
| drop_off_type | REAL | 下车类型 |
| shape_dist_traveled | TEXT | 行驶距离 |
| timepoint | REAL | 时间点 |

### transfers
换乘信息表

| 字段名 | 类型 | 描述 |
|--------|------|------|
| from_stop_id | REAL | 起始站点ID |
| to_stop_id | REAL | 目标站点ID |
| transfer_type | REAL | 换乘类型 |
| min_transfer_time | REAL | 最小换乘时间 |
| from_trip_id | TEXT | 起始行程ID |
| to_trip_id | TEXT | 目标行程ID |

### trips
行程信息表

| 字段名 | 类型 | 描述 |
|--------|------|------|
| route_id | REAL | 线路ID |
| service_id | REAL | 服务ID |
| trip_id | REAL | 行程ID |
| trip_headsign | TEXT | 行程显示牌 |
| trip_short_name | TEXT | 行程简称 |
| direction_id | REAL | 方向ID |
| block_id | REAL | 区块ID |
| shape_id | REAL | 形状ID |
| wheelchair_accessible | REAL | 轮椅可达性 |
| bikes_allowed | REAL | 自行车允许 |