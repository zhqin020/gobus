-- SQL query to get stops for route 405 with stop_id, stop_name, coordinates, stop_sequence, and direction_id
SELECT
  st.stop_id,
  s.stop_name,
  s.stop_lat,
  s.stop_lon,
  st.stop_sequence,
  t.direction_id
FROM
  stop_times st
JOIN
  stops s ON st.stop_id = s.stop_id
JOIN
  trips t ON st.trip_id = t.trip_id
JOIN
  routes r ON t.route_id = r.route_id
WHERE
  r.route_short_name = '405'
ORDER BY
  t.direction_id,
  st.stop_sequence;
