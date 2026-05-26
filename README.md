# Global Market Heatmap 🌍

A beautiful, interactive 3D WebGL visualization of global financial markets using Three.js and TradingView widgets.

## Overview
This project visualizes the Earth in 3D, featuring custom day/night shaders, a rotating cloud layer, and country borders rendered via D3 GeoJSON. Various global financial markets are plotted on the globe. Their colors dynamically update in real-time based on actual UTC market hours (Green = Open, Red = Closed).

Users can interact with the globe by hovering or clicking on market indicators to instantly spawn a full TradingView Market Heatmap for that specific region. 

## Features
- **3D Globe Visualization**: Built natively with Three.js. Includes specular maps, normal maps, and dynamic day/night cycles synchronized to simulated or real time.
- **Live Market Hours**: Market dots update their color seamlessly based on their real-world open/close UTC schedules.
- **Top Time Marquee**: A continuous scrolling marquee tracking the real-world time across major global financial hubs.
- **Smart Interactions**:
  - **Hover**: Take a quick peek! Hovering over a dot opens the TradingView Heatmap for 15 seconds.
  - **Click**: Pin the market! Left-clicking locks the Heatmap open so you can interact with the widget.
- **Smooth Camera Panning**: The globe gracefully shifts via camera frustum offsets to perfectly balance the layout when the heatmap is opened.
- **Modular ES6 Architecture**: The codebase is strictly organized into ES6 modules for scalability and professional maintainability.

## Technology Stack
- **Three.js**: 3D WebGL rendering, orbit controls, camera math, and custom shaders.
- **D3.js**: Equirectangular projection of GeoJSON data to map country borders onto the globe.
- **TradingView**: Injection of the dynamic Stock Heatmap widget.
- **HTML/CSS/JS**: Pure Vanilla JS, styled elegantly with CSS backdrops and micro-animations.

## Running Locally

You can run this project easily using Docker!

### Using Docker
1. Build the image:
```bash
docker build -t global-market-heatmap .
```
2. Run the container:
```bash
docker run -p 8080:80 global-market-heatmap
```
3. Open your browser and navigate to `http://localhost:8080`.

### Without Docker (Node.js)
If you prefer running it locally with Node.js:
```bash
npx serve .
```

## Folder Structure
```
.
├── assets/
│   ├── geo/         # GeoJSON borders & markets.json config
│   └── textures/    # High-res 2k Earth maps
├── css/             # Stylesheets
├── src/             # ES6 Modules
│   ├── core/        # Scene setup and Time loop manager
│   ├── objects/     # Earth mesh and Market dot generators
│   ├── ui/          # Raycaster and hover/click interaction logic
│   └── main.js      # Application entry point
├── Dockerfile       # Nginx static server image
└── index.html       # HTML layout
```
