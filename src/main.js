/**
 * @file main.js
 * @description Entry point for the 3D World Market Heatmap application. 
 * Initializes the Three.js scene, manages the main animation loop, handles camera panning, 
 * and orchestrates interactions between the 3D objects and the UI layer.
 */

import { scene, camera, renderer, controls, stars } from './core/Scene.js';
import { timeMultiplier, simulatedTimeMs, updateTime } from './core/TimeManager.js';
import { earthGroup, initEarth } from './objects/Earth.js';
import { initMarkets, updateMarketColors } from './objects/Markets.js';
import { moonGroup, initMoon } from './objects/Moon.js';
import { initInteractions, targetCameraX, isEarthPaused } from './ui/Interactions.js?v=2';

// ==========================================
// 1. DOM Setup & Scene Initialization
// ==========================================

// Bind the Three.js canvas to the DOM container
const canvasContainer = document.getElementById('canvas-container');
canvasContainer.innerHTML = '';
canvasContainer.appendChild(renderer.domElement);

// Initialize core components and attach them to the scene
initEarth(renderer);
scene.add(earthGroup);

initMoon();
scene.add(moonGroup);

// Load market data markers onto the Earth and set up raycasting interactions
initMarkets(earthGroup);
initInteractions(camera);

// ==========================================
// 2. Main Animation & Render Loop
// ==========================================

let lastFrameTime = performance.now();
const BASE_ROTATION_SPEED = (Math.PI * 2) / (24 * 60 * 60 * 1000); // 360 degrees per 24 hours in radians
const MOON_ORBIT_MS = 27.322 * 24 * 60 * 60 * 1000; // Realistic lunar orbit duration (27.3 days)
const MOON_ORBIT_RADIUS = 3.5; // Scaled down for visual aesthetics (real life is ~60 radii)

let currentOffsetX = 0;
let currentSimulatedTimeMs = simulatedTimeMs;

/**
 * The core render loop running at requestAnimationFrame speed (typically 60 FPS).
 * Handles Earth rotation, camera panning offsets, and triggering UI updates.
 */
function animate() {
    requestAnimationFrame(animate);
    
    // Smoothly pan the camera using ViewOffset when opening/closing UI panels
    currentOffsetX += (targetCameraX - currentOffsetX) * 0.05;
    if (Math.abs(currentOffsetX) > 1) {
        camera.setViewOffset(window.innerWidth, window.innerHeight, currentOffsetX, 0, window.innerWidth, window.innerHeight);
    } else {
        camera.clearViewOffset();
    }
    
    // Calculate delta time to ensure consistent animation speeds across different refresh rates
    const currentFrameTime = performance.now();
    const deltaMs = currentFrameTime - lastFrameTime;
    lastFrameTime = currentFrameTime;
    
    // Increment the simulated clock if the Earth is not paused by the user
    if (!isEarthPaused) {
        currentSimulatedTimeMs += deltaMs * timeMultiplier;
    }
    
    // Synchronize the Earth's physical rotation to match the simulated UTC time
    const simDate = new Date(currentSimulatedTimeMs);
    const msSinceMidnightUTC = simDate.getUTCHours() * 3600000 + simDate.getUTCMinutes() * 60000 + simDate.getUTCSeconds() * 1000 + simDate.getUTCMilliseconds();
    const offsetMs = msSinceMidnightUTC - (12 * 3600000); // Offset so the sun (light source) faces the correct longitude
    earthGroup.rotation.y = offsetMs * BASE_ROTATION_SPEED;

    // Calculate Moon's orbital position with a realistic 5.14 degree orbital inclination
    const orbitAngle = ((currentSimulatedTimeMs % MOON_ORBIT_MS) / MOON_ORBIT_MS) * Math.PI * 2;
    const inclination = 5.14 * (Math.PI / 180); // 5.14 degrees in radians
    
    moonGroup.position.x = Math.cos(orbitAngle) * MOON_ORBIT_RADIUS;
    moonGroup.position.y = Math.sin(orbitAngle) * MOON_ORBIT_RADIUS * Math.sin(inclination);
    moonGroup.position.z = Math.sin(orbitAngle) * MOON_ORBIT_RADIUS * Math.cos(inclination);
    
    // Tidally lock the Moon (the same face always points towards Earth)
    moonGroup.rotation.y = -orbitAngle + Math.PI / 2;

    // Update real-time UI components and recalculate market colors based on open/close schedules
    const currentUTCFloat = updateTime();
    updateMarketColors(currentUTCFloat);

    // Slowly rotate the background starfield for atmospheric effect
    stars.rotation.y += 0.0001;
    
    // Update OrbitControls (for mouse dragging/zooming) and render the frame
    controls.update();
    renderer.render(scene, camera);
}

// Bootstrap the animation loop
animate();

// ==========================================
// 3. Event Listeners
// ==========================================

// Ensure the 3D canvas fluidly adapts to window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
