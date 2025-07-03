
## Install pnpm

If you haven’t installed pnpm, you can do so with:
npm install -g pnpm

## Install dependencies:
pnpm install

## 多语言支持
del node_modules /s 
pnpm add next-intl


## Start the development server:

pnpm dev

or:


npm run dev

## browse
Open your browser and go to http://localhost:3000 to view the app.

### 公交信息下载：
启动定时任务（建议在服务端后台运行）
npm run schedule-gtfs

手动下载
npm run download-gtfs