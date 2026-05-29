/**
 * @file Markets.js
 * @description Handles the parsing of geographic JSON data, placing interactive market dots 
 * onto the 3D globe, and maintaining their color states (Open/Closed/Holiday) via time logic.
 */

import { setMarqueeMarkets } from '../core/TimeManager.js';

export const marketDots = []; // Stores the rendered 3D dot objects for raycasting

let holidaysCache = {}; // Local cache for country-specific holiday dates

/**
 * Converts geographic Latitude and Longitude coordinates to 3D Cartesian coordinates.
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {number} radius - The radius of the globe to map onto
 * @returns {THREE.Vector3} - The resulting X,Y,Z coordinate vector
 */
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
}

// ==========================================
// 1. Market Initialization
// ==========================================

/**
 * Fetches market coordinate/holiday data and renders 3D dots on the globe.
 * @param {THREE.Group} earthGroup - The parent group to attach the dots to.
 */
export function initMarkets(earthGroup) {
    const dotGeometry = new THREE.SphereGeometry(0.012, 16, 16);
    const closedMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    Promise.all([
        fetch('assets/geo/markets.json').then(res => res.json()),
        fetch('assets/geo/holidays.json').then(res => res.json())
    ]).then(([marketsData, holidaysData]) => {
        holidaysCache = holidaysData;
        setMarqueeMarkets(marketsData);
        marketsData.forEach(market => {
            const dot = new THREE.Mesh(dotGeometry, closedMaterial.clone());
            const position = latLonToVector3(market.lat, market.lon, 1.008);
            dot.position.copy(position);
            dot.userData = market;
            earthGroup.add(dot);
            marketDots.push(dot);
        });
    }).catch(err => console.error("Error loading markets or holidays:", err));
}

let lastUpdate = 0;
const formatters = {};

export function updateMarketColors(currentUTCFloat) {
    const now = Date.now();
    if (now - lastUpdate < 1000) return; // Only calculate once per second to save CPU
    lastUpdate = now;
    
    const nowDate = new Date(now); // Use real time as requested
    
    marketDots.forEach(dot => {
        const market = dot.userData;
        const tz = market.trading_hours.timezone;
        let isOpen = false;
        let isHoliday = false;
        
        try {
            if (!formatters[tz]) {
                formatters[tz] = new Intl.DateTimeFormat('en-US', {
                    timeZone: tz,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    weekday: 'long',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: false
                });
            }
            
            const parts = formatters[tz].formatToParts(nowDate);
            const getPart = (type) => parts.find(p => p.type === type)?.value;
            
            const year = getPart('year');
            const month = getPart('month');
            const day = getPart('day');
            const weekday = getPart('weekday');
            let hour = parseInt(getPart('hour'));
            if (hour === 24) hour = 0;
            const minute = parseInt(getPart('minute'));
            
            const localDateStr = `${year}-${month}-${day}`;
            
            const marketHolidays = holidaysCache[market.iso] || [];
            isHoliday = marketHolidays.includes(localDateStr);
            const isWeekend = market.trading_hours.weekend_days.includes(weekday);
            
            if (!isHoliday && !isWeekend) {
                const [openH, openM] = market.trading_hours.open.split(':').map(Number);
                const [closeH, closeM] = market.trading_hours.close.split(':').map(Number);
                
                const currentMins = hour * 60 + minute;
                const openMins = openH * 60 + openM;
                const closeMins = closeH * 60 + closeM;
                
                if (openMins > closeMins) {
                    isOpen = currentMins >= openMins || currentMins <= closeMins;
                } else {
                    isOpen = currentMins >= openMins && currentMins < closeMins;
                }
            }
        } catch (e) {
            console.error(`Error calculating time for ${market.name}:`, e);
        }
        
        market.isOpen = isOpen;
        market.isHoliday = isHoliday;
        if (isHoliday) {
            dot.material.color.setHex(0x58ccff); // Ice Blue
        } else {
            dot.material.color.setHex(isOpen ? 0x00ff00 : 0xff0000); // Green (Open) / Red (Closed)
        }
    });
}
