
## Install pnpm

If you haven’t installed pnpm, you can do so with:
pnpm install -g pnpm

## Install dependencies:
pnpm install

## 多语言支持
del node_modules /s 
pnpm add next-intl


## Environment Variables

To use the Public Bathrooms API, you need to get an API key from RapidAPI:

1. Visit [RapidAPI Public Bathrooms](https://rapidapi.com/wanderlog-wanderlog-default/api/public-bathrooms)
2. Sign up or log in to your RapidAPI account
3. Subscribe to the Public Bathrooms API
4. Copy your API key from the dashboard
url: https://rapidapi.com/developer/authorization/default-application_10913830

Create a `keys/keys.json` file in the project root and add your API key:

```json
{
    "MapApi": {
        "Google":{
            "apiKey": ""
            },
        
        "Mapbox": {
            "apiKey": ""
            }
    },
    "RapidAPI": {
        "PublicBathrooms": {
            "apiKey": "your_rapidapi_key_here"
        }
    }
}
```

You can also copy the `keys/keys.json.example` file and replace the placeholder with your actual API key:

```bash
cp keys/keys.json.example keys/keys.json
```

## Start the development server:

```bash
pnpm dev
```

or:

```bash
pnpm run dev
```

## browse
Open your browser and go to http://localhost:3000 to view the app.

### 公交信息下载：
启动定时任务（建议在服务端后台运行）
pnpm run schedule-gtfs

手动下载
pnpm run download-gtfs


### 修复 npm 安装出错的问题

如果遇到依赖安装问题，可以尝试以下步骤：

1. 清理缓存和依赖：

```bash
rd /s /q node_modules
pnpm cache clean
```

2. 删除锁文件：

```bash
del package-lock.json
del pnpm-lock.yaml
```

3. 重新安装依赖：

```bash
pnpm install
```

如果仍然遇到问题，特别是与原生模块相关的问题，可以尝试：

```bash
pnpm install --legacy-peer-deps
pnpm install better-sqlite3 csv-parse --legacy-peer-deps
```

### 构建和运行

构建项目：

```bash
pnpm build
```

运行开发服务器：

```bash
pnpm dev
```

如果遇到"next is not recognized as an internal or external command"错误，请确保node_modules目录存在，并且其中包含.next可执行文件。如果问题仍然存在，请尝试清理缓存并重新安装依赖。
