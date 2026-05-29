/**
 * @file Moon.js
 * @description Constructs the 3D Moon model using the provided BTC moon texture.
 * Implements a dull regolith material with bump mapping for realism.
 */

const MOON_MAP = 'assets/textures/btc_moon.jpg';

export const moonGroup = new THREE.Group();
export let moonMesh;

/**
 * Initializes the Moon mesh and adds it to the moonGroup.
 * @returns {THREE.Group} The assembled Moon group.
 */
export function initMoon() {
    const textureLoader = new THREE.TextureLoader();
    
    // The real Moon is roughly 27% the radius of Earth.
    const moonGeometry = new THREE.SphereGeometry(0.27, 64, 64);
    
    const moonTexture = textureLoader.load(MOON_MAP);
    
    const moonMaterial = new THREE.MeshPhongMaterial({
        map: moonTexture,
        bumpMap: moonTexture, // Use the diffuse map to fake crater depth shadows
        bumpScale: 0.005,
        shininess: 0, // Moon dust is dull and not shiny
        emissive: 0xffffff,
        emissiveMap: moonTexture,
        emissiveIntensity: 0.20 // Brightens the dark side by exactly 20%
    });

    moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMesh.name = "MoonMesh";
    
    moonGroup.add(moonMesh);
    
    return moonGroup;
}
