/**
 * @file TimeManager.js
 * @description Manages the application's internal clock and time-scaling features.
 * This includes logic for the time slider (allowing users to speed up the day/night cycle),
 * and updating the UI marquee that displays market hours.
 */

export let timeMultiplier = 1;
export const simulatedTimeMs = Date.now();

// UI Elements
const marqueeDisplay = document.getElementById('time-marquee');
const speedSlider = document.getElementById('speed-slider');
const speedValueLabel = document.getElementById('speed-value');

// ==========================================
// 1. Time Scaling & Slider Interaction
// ==========================================

if (speedSlider && speedValueLabel) {
    speedSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (val === 0) {
            timeMultiplier = 1; // Real-time
        } else {
            timeMultiplier = Math.pow(10, val / 20); // Exponential speed scale for drastic fast-forwarding
        }
        
        if (timeMultiplier >= 1000) {
            speedValueLabel.textContent = (timeMultiplier / 1000).toFixed(1) + 'k x';
        } else if (timeMultiplier >= 100) {
            speedValueLabel.textContent = Math.round(timeMultiplier) + 'x';
        } else {
            speedValueLabel.textContent = timeMultiplier.toFixed(1) + 'x';
        }
    });
}

let lastMarqueeUpdate = 0;
let marqueeMarkets = [];

export function setMarqueeMarkets(markets) {
    marqueeMarkets = markets;
    lastMarqueeUpdate = 0; // force immediate update
}

export function updateTime() {
    const currentFrameTime = performance.now();
    const realDate = new Date();
    
    // Only update the DOM if we have markets data and it's time
    if (marqueeMarkets.length > 0 && (currentFrameTime - lastMarqueeUpdate > 60000 || lastMarqueeUpdate === 0)) {
        lastMarqueeUpdate = currentFrameTime;
        
        let text = "";
        
        // Add GLOBAL UTC as the first fixed item
        const utcHour = String(realDate.getUTCHours()).padStart(2, '0');
        const utcMin = String(realDate.getUTCMinutes()).padStart(2, '0');
        text += `<span style="color:#fff">GLOBAL UTC: ${utcHour}:${utcMin}</span> &nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp; `;
        
        // Add all markets dynamically based on their timezone
        marqueeMarkets.forEach(market => {
            try {
                const tz = market.trading_hours.timezone;
                const formatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: tz,
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: false
                });
                
                const parts = formatter.formatToParts(realDate);
                let hour = parseInt(parts.find(p => p.type === 'hour')?.value || 0);
                if (hour === 24) hour = 0; // 24:00 edge case fix
                const hh = String(hour).padStart(2, '0');
                const mm = String(parts.find(p => p.type === 'minute')?.value || 0).padStart(2, '0');
                
                text += `<span style="color:#58ccff">${market.name}: ${hh}:${mm}</span> &nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp; `;
            } catch (e) {
                // Ignore invalid timezones silently to prevent breaking the loop
            }
        });
        
        if (marqueeDisplay) marqueeDisplay.innerHTML = text + text + text;
    }

    return realDate.getUTCHours() + (realDate.getUTCMinutes() / 60);
}
