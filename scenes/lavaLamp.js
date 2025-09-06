import * as THREE from 'three';
import { createSlider, createColorPicker, addSliderListeners, addColorListeners } from '../utils.js';

export const lavaLamp = {
    title: "Lava Lamp",
    scene: null,

    config: {
        blobCount: 15,
        speed: 0.5,
        threshold: 0.7,
        heat: 0.0015,
        heatRetention: 0.99,
        mouseRepelRadius: 0.2,
        mouseRepelStrength: 0.005,
        color1: '#ff007f',
        color2: '#00ffff',
        bgColor: '#1a0033'
    },

    objects: {},
    blobs: [],

    init(scene) {
        this.scene = scene;
        this.blobs = [];
        for (let i = 0; i < this.config.blobCount; i++) {
            this.blobs.push({
                pos: new THREE.Vector2(Math.random(), Math.random()),
                vel: new THREE.Vector2((Math.random() - 0.5) * 0.002, (Math.random() - 0.5) * 0.002),
                radius: 0.05 + Math.random() * 0.1,
                heat: Math.random()
            });
        }

        const geometry = new THREE.PlaneGeometry(2, 2);
        this.objects.material = new THREE.ShaderMaterial({
            uniforms: {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                u_blobs: { value: this.blobs.map(b => b.pos) },
                u_radii: { value: this.blobs.map(b => b.radius) },
                u_threshold: { value: this.config.threshold },
                u_color1: { value: new THREE.Color(this.config.color1) },
                u_color2: { value: new THREE.Color(this.config.color2) },
                u_bgColor: { value: new THREE.Color(this.config.bgColor) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                precision mediump float;
                varying vec2 vUv;
                uniform vec2 u_resolution;
                uniform vec2 u_blobs[${this.config.blobCount}];
                uniform float u_radii[${this.config.blobCount}];
                uniform float u_threshold;
                uniform vec3 u_color1;
                uniform vec3 u_color2;
                uniform vec3 u_bgColor;

                void main() {
                    vec2 p = vUv;
                    p.x *= u_resolution.x / u_resolution.y;

                    float sum = 0.0;
                    for (int i = 0; i < ${this.config.blobCount}; i++) {
                        vec2 blob_p = u_blobs[i];
                        blob_p.x *= u_resolution.x / u_resolution.y;
                        float r = u_radii[i];
                        sum += r * r / distance(p, blob_p);
                    }

                    if (sum > u_threshold) {
                        gl_FragColor = vec4(mix(u_color1, u_color2, vUv.y), 1.0);
                    } else {
                        gl_FragColor = vec4(u_bgColor, 1.0);
                    }
                }
            `
        });
        this.objects.mesh = new THREE.Mesh(geometry, this.objects.material);
        this.scene.add(this.objects.mesh);
    },

    update(clock, mouse) {
        if (!this.objects.material) return;
        
        const material = this.objects.material;
        material.uniforms.u_time.value = clock.getElapsedTime();
        
        const mousePos = new THREE.Vector2((mouse.x + 1) / 2, (mouse.y + 1) / 2);

        for (let i = 0; i < this.config.blobCount; i++) {
            const blob = this.blobs[i];

            // --- NEW: Mouse Repulsion Physics ---
            const dist = mousePos.distanceTo(blob.pos);
            if (dist < this.config.mouseRepelRadius) {
                const repelForce = (1 - dist / this.config.mouseRepelRadius) * this.config.mouseRepelStrength;
                const repelVector = new THREE.Vector2().subVectors(blob.pos, mousePos).normalize();
                blob.vel.addScaledVector(repelVector, repelForce);
            }

            // Apply force based on heat (buoyancy)
            blob.vel.y += (blob.heat - 0.5) * 0.0001 * this.config.speed;
            
            blob.pos.add(blob.vel);

            // Heat Exchange Logic
            if (blob.pos.y < 0.1) {
                blob.heat += this.config.heat * (1.0 - blob.heat);
            } else if (blob.pos.y > 0.9) {
                blob.heat -= this.config.heat * blob.heat;
            }

            blob.heat *= this.config.heatRetention;
            blob.heat = Math.max(0.0, Math.min(1.0, blob.heat));

            // Wall collisions and damping
            if (blob.pos.x < 0.01 || blob.pos.x > 0.99) { blob.vel.x *= -0.5; }
            if (blob.pos.y < 0.01 || blob.pos.y > 0.99) { blob.vel.y *= -0.5; }
            
            blob.pos.x = Math.max(0.01, Math.min(0.99, blob.pos.x));
            blob.pos.y = Math.max(0.01, Math.min(0.99, blob.pos.y));

            // Slow down velocity over time (friction)
            blob.vel.multiplyScalar(0.98);

            material.uniforms.u_blobs.value[i] = blob.pos;
        }
    },
    
    destroy() {
        if (!this.scene || !this.objects.mesh) return;
        this.scene.remove(this.objects.mesh);
        this.objects.mesh.geometry.dispose();
        this.objects.material.dispose();
        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            ${createSlider('blobCount', 'Blob Count', 5, 30, this.config.blobCount, '1')}
            ${createSlider('speed', 'Speed', 0.1, 2.0, this.config.speed, '0.1')}
            ${createSlider('threshold', 'Gooeyness', 0.1, 1.5, this.config.threshold, '0.1')}
            ${createSlider('heat', 'Heat/Cool Rate', 0.0005, 0.01, this.config.heat, '0.0001')}
            ${createSlider('heatRetention', 'Heat Retention', 0.95, 0.999, this.config.heatRetention, '0.001')}
            <h3>Mouse Interaction</h3>
            ${createSlider('mouseRepelRadius', 'Repel Radius', 0.01, 0.5, this.config.mouseRepelRadius, '0.01')}
            ${createSlider('mouseRepelStrength', 'Repel Strength', 0.001, 0.02, this.config.mouseRepelStrength, '0.001')}
            <h3>Colors</h3>
            ${createColorPicker('color1', 'Color 1', this.config.color1)}
            ${createColorPicker('color2', 'Color 2', this.config.color2)}
            ${createColorPicker('bgColor', 'Background', this.config.bgColor)}
        `;
        
        addSliderListeners(this.config, (event) => {
            if (event && event.target.id === 'blobCount') {
                this.destroy();
                this.init(this.scene);
            }
        });

        addColorListeners(this.config, (key, value) => {
            const uniformName = 'u_' + key;
            if (this.objects.material && this.objects.material.uniforms[uniformName]) {
                this.objects.material.uniforms[uniformName].value.set(value);
            }
        });

        document.getElementById('threshold').addEventListener('input', (e) => {
            this.config.threshold = parseFloat(e.target.value);
            if (this.objects.material) {
                this.objects.material.uniforms.u_threshold.value = this.config.threshold;
            }
        });
    }
};
