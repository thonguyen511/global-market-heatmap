export let timeMultiplier = 1;
export const simulatedTimeMs = Date.now();

const marqueeDisplay = document.getElementById('time-marquee');
const speedSlider = document.getElementById('speed-slider');
const speedValueLabel = document.getElementById('speed-value');

if (speedSlider && speedValueLabel) {
    speedSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (val === 0) {
            timeMultiplier = 1;
        } else {
            timeMultiplier = Math.pow(10, val / 20); // Exponential speed scale
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

const timezones = [
    { label: "Honolulu (UTC-10)", offset: -10 },
    { label: "Los Angeles (UTC-7)", offset: -7 },
    { label: "Chicago (UTC-5)", offset: -5 },
    { label: "New York (UTC-4)", offset: -4 },
    { label: "Sao Paulo (UTC-3)", offset: -3 },
    { label: "GLOBAL UTC", offset: 0 },
    { label: "London (UTC+1)", offset: 1 },
    { label: "Paris (UTC+2)", offset: 2 },
    { label: "Moscow (UTC+3)", offset: 3 },
    { label: "Dubai (UTC+4)", offset: 4 },
    { label: "Mumbai (UTC+5.5)", offset: 5.5 },
    { label: "Bangkok (UTC+7)", offset: 7 },
    { label: "Singapore (UTC+8)", offset: 8 },
    { label: "Tokyo (UTC+9)", offset: 9 },
    { label: "Sydney (UTC+10)", offset: 10 },
    { label: "Auckland (UTC+12)", offset: 12 }
];

let lastMarqueeUpdate = 0;

export function updateTime() {
    const currentFrameTime = performance.now();
    const realDate = new Date();
    
    if (currentFrameTime - lastMarqueeUpdate > 60000 || lastMarqueeUpdate === 0) {
        lastMarqueeUpdate = currentFrameTime;
        const utcMs = realDate.getTime() + (realDate.getTimezoneOffset() * 60000);
        let text = "";
        timezones.forEach(tz => {
            const localDate = new Date(utcMs + (3600000 * tz.offset));
            const hh = String(localDate.getHours()).padStart(2, '0');
            const mm = String(localDate.getMinutes()).padStart(2, '0');
            text += `<span style="color:${tz.offset===0 ? '#fff' : '#58ccff'}">${tz.label}: ${hh}:${mm}</span> &nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp; `;
        });
        if (marqueeDisplay) marqueeDisplay.innerHTML = text + text + text;
    }

    return realDate.getUTCHours() + (realDate.getUTCMinutes() / 60);
}
