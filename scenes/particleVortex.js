import * as THREE from 'three';
import { createSlider, addSliderListeners, createColorPicker, addColorListeners } from '../utils.js';

export const particleVortex = {
    title: "Particle Vortex",
    scene: null,

    config: {
        particleCount: 15000,
        particleSize: 25,
        vortexStrength: 0.5,
        flowSpeed: 0.1,
        color1: '#ff4081',
        color2: '#00bcd4',
        mouseInfluence: 0.1,
        fieldSize: 1000,
    },

    objects: {},

    init(scene) {
        this.scene = scene;
        this.scene.fog = new THREE.FogExp2(0x000000, 0.001);

        this.regenerateParticles();

        // Used to track mouse position for interaction
        this.objects.mouseTarget = new THREE.Vector2();
    },

    regenerateParticles() {
        if (this.objects.particles) {
            this.scene.remove(this.objects.particles);
            this.objects.particles.geometry.dispose();
            this.objects.particles.material.dispose();
        }

        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];

        const color1 = new THREE.Color(this.config.color1);
        const color2 = new THREE.Color(this.config.color2);

        for (let i = 0; i < this.config.particleCount; i++) {
            const x = (Math.random() - 0.5) * 2 * this.config.fieldSize;
            const y = (Math.random() - 0.5) * 2 * this.config.fieldSize;
            const z = (Math.random() - 0.5) * 2 * this.config.fieldSize;
            vertices.push(x, y, z);
            
            // Assign a color based on its position, blending between the two chosen colors
            const mixRatio = (y / (this.config.fieldSize * 2)) + 0.5;
            const mixedColor = color1.clone().lerp(color2, mixRatio);
            colors.push(mixedColor.r, mixedColor.g, mixedColor.b);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        // Create a texture for the particles
        const sprite = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png');
        sprite.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.PointsMaterial({
            size: this.config.particleSize,
            map: sprite,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
        });

        this.objects.particles = new THREE.Points(geometry, material);
        this.scene.add(this.objects.particles);
    },

    update(clock, mouse, camera) {
        if (!this.objects.particles) return;

        camera.position.z = 1200; // Keep camera at a good distance

        // Smoothly update the mouse target for a softer interaction
        this.objects.mouseTarget.x += (mouse.x - this.objects.mouseTarget.x) * 0.05;
        this.objects.mouseTarget.y += (mouse.y - this.objects.mouseTarget.y) * 0.05;

        // Animate the camera's position based on the mouse
        camera.position.x = this.objects.mouseTarget.x * 200;
        camera.position.y = -this.objects.mouseTarget.y * 200;
        camera.lookAt(this.scene.position);
        
        const elapsedTime = clock.getElapsedTime();
        const positions = this.objects.particles.geometry.attributes.position.array;

        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            
            // Vortex animation
            const angle = Math.atan2(y, x) + elapsedTime * this.config.flowSpeed;
            const radius = Math.sqrt(x*x + y*y);

            positions[i] = Math.cos(angle) * radius - y * this.config.vortexStrength * 0.01;
            positions[i+1] = Math.sin(angle) * radius + x * this.config.vortexStrength * 0.01;
            
            // Mouse interaction: push particles on the z-axis
            const mouseInfluence = Math.exp(-0.001 * (Math.pow(x - this.objects.mouseTarget.x * 1000, 2) + Math.pow(y + this.objects.mouseTarget.y * 1000, 2)));
            positions[i+2] += (Math.sin(elapsedTime * 5 + y * 0.01) * 10) * mouseInfluence * this.config.mouseInfluence;
        }

        this.objects.particles.geometry.attributes.position.needsUpdate = true;
    },

    destroy() {
        if (!this.scene) return;
        this.scene.remove(this.objects.particles);
        this.objects.particles?.geometry.dispose();
        this.objects.particles?.material.dispose();
        this.scene.fog = null;
        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            <h3>Particles</h3>
            ${createSlider('particleCount', 'Count', 1000, 30000, this.config.particleCount, '500')}
            ${createSlider('particleSize', 'Size', 5, 100, this.config.particleSize, '1')}
            ${createSlider('fieldSize', 'Field Size', 200, 2000, this.config.fieldSize, '50')}
            <h3>Animation</h3>
            ${createSlider('vortexStrength', 'Vortex Strength', 0, 2, this.config.vortexStrength, '0.1')}
            ${createSlider('flowSpeed', 'Flow Speed', 0, 0.5, this.config.flowSpeed, '0.01')}
            <h3>Interaction</h3>
            ${createSlider('mouseInfluence', 'Mouse Influence', 0, 1, this.config.mouseInfluence, '0.05')}
            <h3>Colors</h3>
            ${createColorPicker('color1', 'Color 1', this.config.color1)}
            ${createColorPicker('color2', 'Color 2', this.config.color2)}
        `;

        addSliderListeners(this.config, (event) => {
            if (event && ['particleCount', 'fieldSize'].includes(event.target.id)) {
                this.regenerateParticles();
            }
        });

        addColorListeners(this.config, () => {
             this.regenerateParticles(); // Regenerate to apply new colors
        });
        
        document.getElementById('particleSize').addEventListener('input', (e) => {
            this.config.particleSize = parseFloat(e.target.value);
            if (this.objects.particles) {
                this.objects.particles.material.size = this.config.particleSize;
            }
        });
    }
};
