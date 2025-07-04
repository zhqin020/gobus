// 拷贝 data/gtfs.sqlite 到 public/gtfs.sqlite
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../data/gtfs.sqlite');
const dest = path.join(__dirname, '../public/gtfs.sqlite');

if (!fs.existsSync(src)) {
  console.error('源文件不存在:', src);
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log('已拷贝 gtfs.sqlite 到 public 目录:', dest);
