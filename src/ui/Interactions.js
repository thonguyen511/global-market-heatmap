/**
 * @file Interactions.js
 * @description Manages all mouse interactions (hover, click, right-click) via Three.js Raycaster.
 * Handles the display of tooltips and dynamically loading the correct TradingView image 
 * into the Heatmap overlay container when a user interacts with a market dot.
 */

import { marketDots } from '../objects/Markets.js';
import { earthGroup } from '../objects/Earth.js';
import { moonGroup } from '../objects/Moon.js';

// Setup Raycaster for converting 2D screen mouse coordinates into 3D space intersections
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// UI Elements
const tvContainer = document.getElementById('tradingview-container');
const heatmapOverlay = document.getElementById('heatmap-overlay');
const tooltip = document.getElementById('market-tooltip');

// Global interaction states
export let targetCameraX = 0; // Target offset for smooth camera panning
export let isEarthPaused = false;

// Local interaction tracking
let isHeatmapPinned = false;
let autoCloseTimeout = null;
let hoverDebounce = null;
let currentHoveredMarket = null;

// ==========================================
// 1. Heatmap UI Logic
// ==========================================

/**
 * Opens the heatmap panel and dynamically loads the scraped image for the given market.
 * @param {Object} market - The JSON object containing market data (e.g., iso code)
 */
function showHeatmap(market) {
    heatmapOverlay.classList.remove('hidden');
    document.getElementById('heatmap-title').innerText = market.name;
    
    targetCameraX = 445; 
    
    Array.from(tvContainer.children).forEach(child => child.style.display = 'none');

    const widgetId = 'tv-widget-' + market.iso;
    let widgetWrapper = document.getElementById(widgetId);

    if (!widgetWrapper) {
        widgetWrapper = document.createElement('div');
        widgetWrapper.id = widgetId;
        widgetWrapper.style.width = '100%';
        widgetWrapper.style.height = '100%';
        
        const img = document.createElement('img');
        
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain'; // This ensures the image scales perfectly inside the container
        img.style.borderRadius = '8px';
        widgetWrapper.appendChild(img);
        
        tvContainer.appendChild(widgetWrapper);
    } else {
        widgetWrapper.style.display = 'block';
    }

    // Always fetch the latest image and bypass browser cache
    const imgElement = widgetWrapper.querySelector('img');
    const timestamp = new Date().getTime();
    imgElement.src = `assets/cache_png/${market.iso}.png?t=${timestamp}`;
}

function closeHeatmap() {
    heatmapOverlay.classList.add('hidden');
    currentHoveredMarket = null;
    targetCameraX = 0; 
}

export function initInteractions(camera) {
    document.getElementById('close-heatmap').addEventListener('click', () => {
        isHeatmapPinned = false;
        clearTimeout(autoCloseTimeout);
        closeHeatmap();
    });

    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(marketDots);

        if (intersects.length > 0) {
            const dot = intersects[0].object;
            const market = dot.userData;
            
            tooltip.innerText = `${market.name} (${market.isOpen ? "OPEN" : (market.isHoliday ? "HOLIDAY" : "CLOSED")})`;
            tooltip.style.left = (event.clientX + 15) + 'px';
            tooltip.style.top = (event.clientY + 15) + 'px';
            tooltip.classList.remove('hidden');
            
            if (!isHeatmapPinned) {
                if (currentHoveredMarket !== market.iso) {
                    clearTimeout(hoverDebounce);
                    hoverDebounce = setTimeout(() => {
                        showHeatmap(market);
                        currentHoveredMarket = market.iso;
                    }, 150);
                }
                
                clearTimeout(autoCloseTimeout);
                autoCloseTimeout = setTimeout(() => {
                    if (!isHeatmapPinned) {
                        closeHeatmap();
                    }
                }, 15000);
            }
        } else {
            tooltip.classList.add('hidden');
        }
    });

    window.addEventListener('click', (event) => {
        if (event.target.closest('#heatmap-overlay')) return;

        raycaster.setFromCamera(mouse, camera);
        
        // 1. Check for intersections with Market Dots
        const intersectsMarket = raycaster.intersectObjects(marketDots);
        if (intersectsMarket.length > 0) {
            const dot = intersectsMarket[0].object;
            const market = dot.userData;
            
            isHeatmapPinned = true;
            clearTimeout(autoCloseTimeout);
            clearTimeout(hoverDebounce);
            
            showHeatmap(market);
            currentHoveredMarket = market.iso;
            return;
        }
        
        // 2. Check for intersections with the Moon
        const intersectsMoon = raycaster.intersectObjects(moonGroup.children);
        if (intersectsMoon.length > 0) {
            isHeatmapPinned = true;
            clearTimeout(autoCloseTimeout);
            clearTimeout(hoverDebounce);
            
            // Re-use showHeatmap by passing a mock object with 'crypto' as the iso
            showHeatmap({ name: "Global Crypto Market", iso: "crypto" });
            currentHoveredMarket = "crypto";
            return;
        }
    });

    window.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(earthGroup.children, true);
        if (intersects.length > 0) {
            isEarthPaused = !isEarthPaused;
        }
    });
}
