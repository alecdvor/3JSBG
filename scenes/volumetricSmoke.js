import * as THREE from 'three';
import { createSlider, createColorPicker, addSliderListeners, addColorListeners } from '../utils.js';

// --- ImprovedNoise Utility (from Three.js examples) ---
class ImprovedNoise {
    constructor() {
        const p = new Uint8Array(512);
        const permutation = [ 151,160,137,91,90,15,
        131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
        190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
        88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
        77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
        102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
        135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
        5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
        223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
        129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
        251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
        49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
        138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180 ];
        for (let i=0; i < 256 ; i++) p[i] = p[i+256] = permutation[i];
        
        const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
        const lerp = (a, b, t) => (1 - t) * a + t * b;
        
        this.noise = (x, y, z) => {
            let X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
            x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
            let u = fade(x), v = fade(y), w = fade(z);
            let A = p[X]+Y, AA = p[A]+Z, AB = p[A+1]+Z, B = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;
            return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x-1, y, z)), lerp(u, grad(p[AB], x, y-1, z), grad(p[BB], x-1, y-1, z))),
                           lerp(v, lerp(u, grad(p[AA+1], x, y, z-1), grad(p[BA+1], x-1, y, z-1)), lerp(u, grad(p[AB+1], x, y-1, z-1), grad(p[BB+1], x-1, y-1, z-1))));
        };
        const grad = (hash, x, y, z) => {
            let h = hash & 15;
            let u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z;
            return ((h&1) === 0 ? u : -u) + ((h&2) === 0 ? v : -v);
        };
    }
}

export const volumetricSmoke = {
    title: "Volumetric Smoke",
    scene: null,

    config: {
        density: 1.2,
        noiseScale: 1.5,
        noiseSpeed: 0.1,
        octaves: 4,         // New: Number of noise layers for detail
        lacunarity: 2.0,    // New: How much detail is added each layer
        gain: 0.5,          // New: How much each layer contributes
        light1Speed: 0.5,
        light2Speed: 0.3,
        light1Color: '#ff80ab',
        light1Intensity: 2.0,
        light2Color: '#80d8ff',
        light2Intensity: 2.0,
    },

    objects: {},

    init(scene) {
        this.scene = scene;

        const size = 128; // Increased texture size for more detail
        const data = new Uint8Array(size * size * size);
        const perlin = new ImprovedNoise();
        let i = 0;
        for (let z = 0; z < size; z++) {
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const noise = perlin.noise(x/32, y/32, z/32);
                    data[i++] = noise * 128 + 128;
                }
            }
        }
        this.objects.noiseTexture = new THREE.Data3DTexture(data, size, size, size);
        this.objects.noiseTexture.format = THREE.RedFormat;
        this.objects.noiseTexture.minFilter = THREE.LinearFilter;
        this.objects.noiseTexture.magFilter = THREE.LinearFilter;
        this.objects.noiseTexture.unpackAlignment = 1;
        this.objects.noiseTexture.needsUpdate = true;

        const geometry = new THREE.BoxGeometry(10, 10, 10);
        this.objects.material = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            transparent: true,
            uniforms: {
                uTime: { value: 0 },
                uDensity: { value: this.config.density },
                uNoiseScale: { value: this.config.noiseScale },
                uNoiseSpeed: { value: this.config.noiseSpeed },
                uOctaves: { value: this.config.octaves },
                uLacunarity: { value: this.config.lacunarity },
                uGain: { value: this.config.gain },
                uLight1Color: { value: new THREE.Color(this.config.light1Color) },
                uLight1Intensity: { value: this.config.light1Intensity },
                uLight1Pos: { value: new THREE.Vector3() },
                uLight2Color: { value: new THREE.Color(this.config.light2Color) },
                uLight2Intensity: { value: this.config.light2Intensity },
                uLight2Pos: { value: new THREE.Vector3() },
                uNoiseTex: { value: this.objects.noiseTexture },
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                precision highp sampler3D;

                varying vec3 vWorldPosition;
                uniform float uTime;
                uniform float uDensity;
                uniform float uNoiseScale;
                uniform float uNoiseSpeed;
                uniform int uOctaves;
                uniform float uLacunarity;
                uniform float uGain;
                uniform vec3 uLight1Color;
                uniform float uLight1Intensity;
                uniform vec3 uLight1Pos;
                uniform vec3 uLight2Color;
                uniform float uLight2Intensity;
                uniform vec3 uLight2Pos;
                uniform sampler3D uNoiseTex;

                // --- NEW: FBM (Fractal Brownian Motion) function ---
                // This layers multiple noise samples to create detail.
                float fbm(vec3 p) {
                    float value = 0.0;
                    float amplitude = 1.0;
                    float frequency = 1.0;
                    for (int i = 0; i < 10; i++) {
                        if (i >= uOctaves) break;
                        value += amplitude * texture(uNoiseTex, p * frequency).r;
                        frequency *= uLacunarity;
                        amplitude *= uGain;
                    }
                    return value;
                }

                void main() {
                    vec3 rayDir = normalize(vWorldPosition - cameraPosition);
                    vec3 rayPos = cameraPosition;
                    vec3 accumulatedColor = vec3(0.0);
                    float accumulatedAlpha = 0.0;

                    for (int i = 0; i < 48; i++) {
                        if (accumulatedAlpha > 0.99) break;

                        vec3 p = rayPos * uNoiseScale + vec3(uTime * uNoiseSpeed, uTime * uNoiseSpeed * 0.5, 0.0);
                        float noise = fbm(p);
                        float density = pow(max(0.0, noise), 2.0) * uDensity;

                        if (density > 0.01) {
                            float dist1 = max(0.1, distance(rayPos, uLight1Pos));
                            float dist2 = max(0.1, distance(rayPos, uLight2Pos));
                            
                            vec3 light1 = (uLight1Color * uLight1Intensity) / (dist1 * dist1);
                            vec3 light2 = (uLight2Color * uLight2Intensity) / (dist2 * dist2);
                            
                            vec3 lightedColor = (light1 + light2) * density;
                            
                            // Blend colors based on transparency
                            accumulatedColor += lightedColor * (1.0 - accumulatedAlpha);
                            accumulatedAlpha += density * 0.1;
                        }
                        rayPos += rayDir * 0.15; // Step through the volume
                    }
                    gl_FragColor = vec4(accumulatedColor, accumulatedAlpha);
                }
            `,
        });

        this.objects.mesh = new THREE.Mesh(geometry, this.objects.material);
        this.scene.add(this.objects.mesh);

        this.objects.light1 = new THREE.Object3D();
        this.objects.light2 = new THREE.Object3D();
    },

    update(clock) {
        const elapsedTime = clock.getElapsedTime();
        this.objects.material.uniforms.uTime.value = elapsedTime;

        const time1 = elapsedTime * this.config.light1Speed;
        const time2 = elapsedTime * this.config.light2Speed;

        this.objects.light1.position.set(Math.sin(time1 * 0.8) * 4, Math.cos(time1 * 0.6) * 2, Math.cos(time1 * 1.0) * 4);
        this.objects.light2.position.set(Math.cos(time2 * 0.4) * 4, Math.sin(time2 * 1.0) * 2, Math.sin(time2 * 0.6) * 4);
        this.objects.material.uniforms.uLight1Pos.value.copy(this.objects.light1.position);
        this.objects.material.uniforms.uLight2Pos.value.copy(this.objects.light2.position);
    },

    destroy() {
        if (!this.scene) return;
        this.scene.remove(this.objects.mesh);
        this.objects.mesh?.geometry.dispose();
        this.objects.mesh?.material.dispose();
        this.objects.noiseTexture?.dispose();
        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            <h3>Smoke</h3>
            ${createSlider('density', 'Density', 0.1, 5, this.config.density, '0.1')}
            ${createSlider('noiseScale', 'Scale', 0.1, 5, this.config.noiseScale, '0.1')}
            ${createSlider('noiseSpeed', 'Speed', 0, 0.5, this.config.noiseSpeed, '0.01')}
            <h3>Smoke Detail</h3>
            ${createSlider('octaves', 'Octaves', 1, 8, this.config.octaves, '1')}
            ${createSlider('lacunarity', 'Frequency', 1.0, 3.0, this.config.lacunarity, '0.1')}
            ${createSlider('gain', 'Contribution', 0.1, 1.0, this.config.gain, '0.1')}
            <h3>Light 1</h3>
            ${createSlider('light1Speed', 'Speed', 0, 2, this.config.light1Speed, '0.1')}
            ${createSlider('light1Intensity', 'Intensity', 0, 10, this.config.light1Intensity, '0.1')}
            ${createColorPicker('light1Color', 'Color', this.config.light1Color)}
            <h3>Light 2</h3>
            ${createSlider('light2Speed', 'Speed', 0, 2, this.config.light2Speed, '0.1')}
            ${createSlider('light2Intensity', 'Intensity', 0, 10, this.config.light2Intensity, '0.1')}
            ${createColorPicker('light2Color', 'Color', this.config.light2Color)}
        `;

        addSliderListeners(this.config, null);
        addColorListeners(this.config, (key, value) => {
            if (key === 'light1Color') this.objects.material.uniforms.uLight1Color.value.set(value);
            if (key === 'light2Color') this.objects.material.uniforms.uLight2Color.value.set(value);
        });
        
        // Add direct listeners for uniform updates
        const uniformControls = ['density', 'noiseScale', 'noiseSpeed', 'octaves', 'lacunarity', 'gain', 'light1Intensity', 'light2Intensity'];
        uniformControls.forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                const uniformName = `u${id.charAt(0).toUpperCase() + id.slice(1)}`;
                if (this.objects.material.uniforms[uniformName]) {
                    const value = id === 'octaves' ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
                    this.objects.material.uniforms[uniformName].value = value;
                }
            });
        });
    }
};
