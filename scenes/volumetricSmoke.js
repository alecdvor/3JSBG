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
        noiseScale: 2.5,
        noiseSpeed: 0.1,
        lightSpeed: 0.5, // New property for light speed
        light1Color: '#ff80ab',
        light1Intensity: 2.0,
        light2Color: '#80d8ff',
        light2Intensity: 2.0,
    },

    objects: {},

    init(scene) {
        this.scene = scene;

        const size = 64;
        const data = new Uint8Array(size * size * size);
        const perlin = new ImprovedNoise();
        let i = 0;
        for (let z = 0; z < size; z++) {
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const noise = perlin.noise(x / size * 5, y / size * 5, z / size * 5);
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
                precision mediump float;
                precision highp sampler3D;
                varying vec3 vWorldPosition;
                uniform float uTime;
                uniform float uDensity;
                uniform float uNoiseScale;
                uniform float uNoiseSpeed;
                uniform vec3 uLight1Color;
                uniform float uLight1Intensity;
                uniform vec3 uLight1Pos;
                uniform vec3 uLight2Color;
                uniform float uLight2Intensity;
                uniform vec3 uLight2Pos;
                uniform sampler3D uNoiseTex;

                float getNoise(vec3 pos) {
                    return texture(uNoiseTex, pos * uNoiseScale + vec3(uTime * uNoiseSpeed, 0.0, 0.0)).r;
                }

                void main() {
                    vec3 rayDir = normalize(vWorldPosition - cameraPosition);
                    vec3 rayPos = cameraPosition;
                    vec3 accumulatedColor = vec3(0.0);
                    for (int i = 0; i < 32; i++) {
                        rayPos += rayDir * 0.2;
                        float noise = getNoise(rayPos);
                        float density = smoothstep(0.4, 0.6, noise) * uDensity;
                        if (density > 0.01) {
                            float dist1 = max(0.1, distance(rayPos, uLight1Pos));
                            float dist2 = max(0.1, distance(rayPos, uLight2Pos));
                            vec3 light1 = (uLight1Color * uLight1Intensity) / (dist1 * dist1);
                            vec3 light2 = (uLight2Color * uLight2Intensity) / (dist2 * dist2);
                            accumulatedColor += (light1 + light2) * density * 0.1;
                        }
                    }
                    gl_FragColor = vec4(accumulatedColor, 1.0);
                }
            `,
        });

        this.objects.mesh = new THREE.Mesh(geometry, this.objects.material);
        this.scene.add(this.objects.mesh);

        this.objects.light1 = new THREE.Object3D();
        this.objects.light2 = new THREE.Object3D();
    },

    update(clock) {
        const elapsedTime = clock.getElapsedTime() * this.config.lightSpeed; // Use the lightSpeed config
        this.objects.material.uniforms.uTime.value = clock.getElapsedTime(); // Keep noise speed independent

        this.objects.light1.position.set(
            Math.sin(elapsedTime * 0.4) * 4,
            Math.cos(elapsedTime * 0.3) * 2,
            Math.cos(elapsedTime * 0.5) * 4
        );
        this.objects.light2.position.set(
            Math.cos(elapsedTime * 0.2) * 4,
            Math.sin(elapsedTime * 0.5) * 2,
            Math.sin(elapsedTime * 0.3) * 4
        );
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
            ${createSlider('noiseScale', 'Scale', 0.1, 10, this.config.noiseScale, '0.1')}
            ${createSlider('noiseSpeed', 'Noise Speed', 0, 0.5, this.config.noiseSpeed, '0.01')}
            <h3>Lights</h3>
            ${createSlider('lightSpeed', 'Light Speed', 0, 2, this.config.lightSpeed, '0.1')}
            ${createSlider('light1Intensity', 'Light 1 Intensity', 0, 10, this.config.light1Intensity, '0.1')}
            ${createColorPicker('light1Color', 'Light 1 Color', this.config.light1Color)}
            ${createSlider('light2Intensity', 'Light 2 Intensity', 0, 10, this.config.light2Intensity, '0.1')}
            ${createColorPicker('light2Color', 'Light 2 Color', this.config.light2Color)}
        `;

        addSliderListeners(this.config, null);
        addColorListeners(this.config, (key, value) => {
            if (key === 'light1Color') this.objects.material.uniforms.uLight1Color.value.set(value);
            if (key === 'light2Color') this.objects.material.uniforms.uLight2Color.value.set(value);
        });
        
        ['density', 'noiseScale', 'noiseSpeed', 'light1Intensity', 'light2Intensity'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                const uniformName = `u${id.charAt(0).toUpperCase() + id.slice(1)}`;
                if (this.objects.material.uniforms[uniformName]) {
                    this.objects.material.uniforms[uniformName].value = parseFloat(e.target.value);
                }
            });
        });
    }
};
