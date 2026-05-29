/**
 * @file Scene.js
 * @description Configures the core Three.js environment including the scene, camera, 
 * renderer, lighting, and background elements (like the starfield).
 */

export const scene = new THREE.Scene();

// Initialize the main perspective camera
export const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 4);

// Set up the WebGL renderer with anti-aliasing for smooth edges
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Configure OrbitControls for mouse interaction (rotating, zooming)
export const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Enables smooth inertia when dragging
controls.dampingFactor = 0.05;
controls.enablePan = false;    // Disable panning to keep the globe centered
controls.minDistance = 1.5;    // Prevent zooming too far into the globe
controls.maxDistance = 10;     // Prevent zooming too far out
controls.target.set(0, 0, 0);

// ==========================================
// 1. Lighting Configuration
// ==========================================

// Directional light acts as the "Sun", casting light on one side of the globe
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(5, 0, 0);
scene.add(sunLight);

// Ambient light ensures the dark side of the globe isn't pitch black
const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
scene.add(ambientLight);

// ==========================================
// 2. Background Starfield
// ==========================================

const starsGeometry = new THREE.BufferGeometry();
const starsCount = 5000;
const posArray = new Float32Array(starsCount * 3);

// Randomly scatter 5000 points across the background
for(let i = 0; i < starsCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 20;
}
starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

const starsMaterial = new THREE.PointsMaterial({
    size: 0.02,
    color: 0xffffff,
    transparent: true,
    opacity: 1
});

export const stars = new THREE.Points(starsGeometry, starsMaterial);
scene.add(stars);
