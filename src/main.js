import { scene, camera, renderer, controls, stars } from './core/Scene.js';
import { timeMultiplier, simulatedTimeMs, updateTime } from './core/TimeManager.js';
import { earthGroup, initEarth } from './objects/Earth.js';
import { initMarkets, updateMarketColors } from './objects/Markets.js';
import { initInteractions, targetCameraX, isEarthPaused } from './ui/Interactions.js';

// Setup DOM
document.getElementById('canvas-container').innerHTML = '';
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Initialize Components
initEarth(renderer);
scene.add(earthGroup);

initMarkets(earthGroup);
initInteractions(camera);

// Main Animation Loop
let lastFrameTime = performance.now();
const BASE_ROTATION_SPEED = (Math.PI * 2) / (24 * 60 * 60 * 1000); 
let currentOffsetX = 0;
let currentSimulatedTimeMs = simulatedTimeMs;

function animate() {
    requestAnimationFrame(animate);
    
    // Smooth camera panning via ViewOffset
    currentOffsetX += (targetCameraX - currentOffsetX) * 0.05;
    if (Math.abs(currentOffsetX) > 1) {
        camera.setViewOffset(window.innerWidth, window.innerHeight, currentOffsetX, 0, window.innerWidth, window.innerHeight);
    } else {
        camera.clearViewOffset();
    }
    
    const currentFrameTime = performance.now();
    const deltaMs = currentFrameTime - lastFrameTime;
    lastFrameTime = currentFrameTime;
    
    if (!isEarthPaused) {
        currentSimulatedTimeMs += deltaMs * timeMultiplier;
    }
    
    // Sync earth rotation to simulated UTC time
    const simDate = new Date(currentSimulatedTimeMs);
    const msSinceMidnightUTC = simDate.getUTCHours() * 3600000 + simDate.getUTCMinutes() * 60000 + simDate.getUTCSeconds() * 1000 + simDate.getUTCMilliseconds();
    const offsetMs = msSinceMidnightUTC - (12 * 3600000);
    earthGroup.rotation.y = offsetMs * BASE_ROTATION_SPEED;

    // Update real-time UI and get current UTC float for markets
    const currentUTCFloat = updateTime();
    updateMarketColors(currentUTCFloat);

    stars.rotation.y += 0.0001;
    controls.update();
    renderer.render(scene, camera);
}

animate();

// Window resize handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
