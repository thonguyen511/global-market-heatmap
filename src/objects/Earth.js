/**
 * @file Earth.js
 * @description Constructs the 3D Earth model using Three.js. 
 * This module handles the day/night cycle shaders, cloud layers, and dynamically 
 * draws country borders on a separate sphere layer using D3 and GeoJSON data.
 */

const DAY_MAP = 'assets/textures/2k_earth_daymap.jpg';
const NIGHT_MAP = 'assets/textures/2k_earth_nightmap.jpg';
const CLOUDS_MAP = 'assets/textures/2k_earth_clouds.jpg';
const NORMAL_MAP = 'assets/textures/2k_earth_normal_map.jpg';
const SPECULAR_MAP = 'assets/textures/2k_earth_specular_map.jpg';
const GEOJSON_URL = 'assets/geo/custom.geo.json';

// Group containing the Earth mesh, clouds, borders, and market dots
export const earthGroup = new THREE.Group();

/**
 * Initializes and assembles all layers of the Earth.
 * @param {THREE.WebGLRenderer} renderer - The active WebGL renderer (used for texture anisotropy).
 * @returns {THREE.Group} The assembled Earth group.
 */
export function initEarth(renderer) {
    const textureLoader = new THREE.TextureLoader();

    // ==========================================
    // 1. Base Earth Sphere (Day/Night & Topography)
    // ==========================================

    const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
        map: textureLoader.load(DAY_MAP),
        normalMap: textureLoader.load(NORMAL_MAP), // Adds 3D bump details for mountains
        specularMap: textureLoader.load(SPECULAR_MAP), // Makes oceans shiny, land dull
        specular: new THREE.Color(0x222222),
        shininess: 15
    });

    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.name = "EarthMesh";
    earthGroup.add(earth);

    // Inject custom GLSL shaders to dynamically blend the night texture 
    // onto the dark side of the Earth based on the sun's direction.
    const nightTexture = textureLoader.load(NIGHT_MAP);
    earthMaterial.onBeforeCompile = function(shader) {
        shader.uniforms.tNight = { value: nightTexture };
        shader.uniforms.sunDirection = { value: new THREE.Vector3(1, 0, 0) };

        shader.vertexShader = `
            varying vec3 vWorldNormal;
            ${shader.vertexShader}
        `.replace(
            '#include <worldpos_vertex>',
            `
            #include <worldpos_vertex>
            vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
            `
        );

        shader.fragmentShader = `
            uniform sampler2D tNight;
            uniform vec3 sunDirection;
            varying vec3 vWorldNormal;
            ${shader.fragmentShader}
        `.replace(
            '#include <tonemapping_fragment>',
            `
            float sunIntensity = dot(vWorldNormal, sunDirection);
            float nightMix = smoothstep(0.2, -0.2, sunIntensity); // Smooth transition at terminator line
            vec3 nightColor = texture2D(tNight, vUv).rgb;
            gl_FragColor.rgb += nightColor * nightMix;
            #include <tonemapping_fragment>
            `
        );
    };

    // ==========================================
    // 2. Cloud Layer
    // ==========================================

    textureLoader.load(CLOUDS_MAP, (cloudsTexture) => {
        const cloudsGeometry = new THREE.SphereGeometry(1.006, 64, 64); // Slightly larger than Earth
        const cloudsMaterial = new THREE.MeshPhongMaterial({
            map: cloudsTexture,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
        earthGroup.add(clouds);
        
        // Slowly animate the clouds independently of the Earth's rotation
        (function animateClouds() {
            clouds.rotation.y += 0.0002;
            requestAnimationFrame(animateClouds);
        })();
    });

    // ==========================================
    // 3. Dynamic Country Borders (GeoJSON + D3)
    // ==========================================

    fetch(GEOJSON_URL)
        .then(res => res.json())
        .then(data => {
            // Draw the GeoJSON onto a massive high-res HTML canvas using D3
            const canvasWidth = 8192;
            const canvasHeight = 4096;
            const canvas = document.createElement('canvas');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const context = canvas.getContext('2d');

            const projection = d3.geoEquirectangular()
                .translate([canvasWidth / 2, canvasHeight / 2])
                .scale(canvasWidth / (2 * Math.PI));

            const path = d3.geoPath().projection(projection).context(context);

            context.strokeStyle = 'rgba(0, 0, 0, 0.8)'; // Black borders
            context.lineWidth = 4;
            context.beginPath();
            path(data);
            context.stroke();
            
            // Convert the 2D canvas into a spherical 3D texture
            const borderTexture = new THREE.CanvasTexture(canvas);
            borderTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            
            const borderGeometry = new THREE.SphereGeometry(1.002, 64, 64);
            
            // Custom shader to invert border colors (white on the night side, black on the day side)
            const borderMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    tBorders: { value: borderTexture },
                    sunDirection: { value: new THREE.Vector3(1, 0, 0) }
                },
                vertexShader: `
                    varying vec3 vWorldNormal;
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D tBorders;
                    uniform vec3 sunDirection;
                    varying vec3 vWorldNormal;
                    varying vec2 vUv;
                    void main() {
                        vec4 texColor = texture2D(tBorders, vUv);
                        if (texColor.a < 0.1) discard; // Ignore empty canvas space
                        
                        float sunIntensity = dot(vWorldNormal, sunDirection);
                        float nightMix = smoothstep(0.2, -0.2, sunIntensity);
                        vec3 finalColor = mix(vec3(0.0), vec3(1.0), nightMix); // Black day, white night
                        
                        gl_FragColor = vec4(finalColor, texColor.a);
                    }
                `,
                transparent: true,
                depthWrite: false
            });

            const borderSphere = new THREE.Mesh(borderGeometry, borderMaterial);
            earthGroup.add(borderSphere);
        });

    return earthGroup;
}
