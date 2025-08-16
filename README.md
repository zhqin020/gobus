# gobus
GoBus is an app that easily find bus and subway routes, view all stops along the way, and get clear transfer information to reach your destination.

## Development Setup

This project uses [pnpm](https://pnpm.io/) as its package manager. Please ensure you have pnpm installed before setting up the development environment.

### Install pnpm

If you haven't installed pnpm, you can do so with:

```bash
npm install -g pnpm
```

### Install dependencies

Before installing dependencies, you may need to clean pnpm's cache if you're encountering issues:

```bash
pnpm cache delete
```

Then install dependencies:

```bash
pnpm install
```

If you encounter any issues with node-gyp or native modules, you might need to install them separately:

```bash
pnpm install sqlite3
```

### Environment Variables

To use the Public Bathrooms API, you need to get an API key from RapidAPI:

1. Visit [RapidAPI Public Bathrooms](https://rapidapi.com/wanderlog-wanderlog-default/api/public-bathrooms)
2. Sign up or log in to your RapidAPI account
3. Subscribe to the Public Bathrooms API
4. Copy your API key from the dashboard

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

### Start the development server

```bash
pnpm dev
```

### Build for production

```bash
pnpm build
```

If you encounter the "next is not recognized as an internal or external command" error, please ensure that:
1. You have run `pnpm install` successfully
2. The `node_modules` directory exists in your project root
3. The `node_modules/.bin` directory exists and contains the `next` executable

If the issue persists, try clearing the pnpm cache and reinstalling dependencies:

```bash
pnpm cache delete
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

Please refer to the [development environment setup guide](./docs/05-%20development%20env%20setup.md) for more detailed instructions.
