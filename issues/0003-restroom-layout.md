## 问题：

需要对 @app\[locale]\components\RestroomView.tsx  显示布局进行修改：
1. 显示洗手间列表的panel， 应该和 stopsview 风格一致，有一个可拖动的header, 可以从底部拖动到中间，到顶部，可以缩到底部，显示完整的地图
2. 地址下面显示 tags, 用户可以了解洗手间的特点
3. 删除 Closed 图标和lable, 改为导航 icon，可以 调用google map 程序进行导航
4. 记录中间的分割线，应该在当前记录的 xxxkm away, 和 下一个Address 之间。目前在当前记录的 xxxkm away 的上方，导致视觉上容易混淆
