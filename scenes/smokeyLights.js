import * as THREE from 'three';
import { createSlider, createColorPicker, addSliderListeners, addColorListeners } from '../utils.js';

export const smokeyLights = {
    title: "Smokey Lights",
    scene: null,

    config: {
        particleCount: 500,
        particleSize: 4.5,
        particleSpeed: 0.05,
        noiseStrength: 0.1,
        light1Color: '#ff4081',
        light1Intensity: 1.5,
        light2Color: '#3f51b5',
        light2Intensity: 1.5,
    },

    objects: {},

    init(scene) {
        this.scene = scene;

        // --- Create Particle System ---
        this.objects.particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.config.particleCount * 3);
        const velocities = new Float32Array(this.config.particleCount * 3);
        const colors = new Float32Array(this.config.particleCount * 3);

        for (let i = 0; i < this.config.particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 20;      // x
            positions[i3 + 1] = Math.random() * 10 - 5;      // y
            positions[i3 + 2] = (Math.random() - 0.5) * 10; // z

            velocities[i3] = (Math.random() - 0.5) * 0.1;   // x-drift
            velocities[i3 + 1] = Math.random() * 0.5 + 0.2; // base upward speed
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;   // z-drift
        }

        this.objects.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.objects.particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        this.objects.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // The material now uses vertexColors to allow us to "paint" the particles
        this.objects.particleMaterial = new THREE.PointsMaterial({
            size: this.config.particleSize,
            map: this.createSmokeTexture(),
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            vertexColors: true // This is the crucial change
        });

        this.objects.smokeParticles = new THREE.Points(this.objects.particleGeometry, this.objects.particleMaterial);
        this.scene.add(this.objects.smokeParticles);

        // --- Create Light representations ---
        // These are now just invisible objects to track position
        this.objects.light1 = new THREE.Object3D();
        this.objects.light2 = new THREE.Object3D();
        this.objects.color1 = new THREE.Color(this.config.light1Color);
        this.objects.color2 = new THREE.Color(this.config.light2Color);
    },

    update(clock) {
        const elapsedTime = clock.getElapsedTime();

        // Animate Light Positions
        this.objects.light1.position.set(
            Math.sin(elapsedTime * 0.6) * 7,
            Math.cos(elapsedTime * 0.4) * 4,
            Math.cos(elapsedTime * 0.5) * 7
        );
        this.objects.light2.position.set(
            Math.cos(elapsedTime * 0.3) * 7,
            Math.sin(elapsedTime * 0.5) * 4,
            Math.sin(elapsedTime * 0.2) * 7
        );

        // Animate Particles and update their colors based on light proximity
        const positions = this.objects.particleGeometry.attributes.position.array;
        const velocities = this.objects.particleGeometry.attributes.velocity.array;
        const colors = this.objects.particleGeometry.attributes.color.array;
        const noise = this.config.noiseStrength;

        for (let i = 0; i < this.config.particleCount; i++) {
            const i3 = i * 3;

            // Update position
            positions[i3] += velocities[i3] * this.config.particleSpeed;
            positions[i3 + 1] += velocities[i3 + 1] * this.config.particleSpeed;
            positions[i3 + 2] += velocities[i3 + 2] * this.config.particleSpeed;

            // Add some noise for a more "smokey" feel
            positions[i3] += (Math.random() - 0.5) * noise;
            positions[i3 + 2] += (Math.random() - 0.5) * noise;

            // If particle goes off-screen, reset it to the bottom
            if (positions[i3 + 1] > 10) {
                positions[i3] = (Math.random() - 0.5) * 20;
                positions[i3 + 1] = -5;
                positions[i3 + 2] = (Math.random() - 0.5) * 10;
            }

            // --- Color Calculation ---
            const particlePosition = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);
            
            // Calculate inverse-square distance to each light
            const dist1 = Math.max(1, particlePosition.distanceToSquared(this.objects.light1.position));
            const dist2 = Math.max(1, particlePosition.distanceToSquared(this.objects.light2.position));

            const totalInfluence = (1 / dist1) + (1 / dist2);
            
            // Mix colors based on distance and apply intensity
            const finalColor = new THREE.Color(0x000000);
            finalColor.addScaledColor(this.objects.color1, (1 / dist1 / totalInfluence) * this.config.light1Intensity);
            finalColor.addScaledColor(this.objects.color2, (1 / dist2 / totalInfluence) * this.config.light2Intensity);
            
            colors[i3] = finalColor.r;
            colors[i3 + 1] = finalColor.g;
            colors[i3 + 2] = finalColor.b;
        }
        
        this.objects.particleGeometry.attributes.position.needsUpdate = true;
        this.objects.particleGeometry.attributes.color.needsUpdate = true;
    },

    destroy() {
        if (!this.scene) return;
        this.scene.remove(this.objects.smokeParticles);
        this.objects.particleGeometry?.dispose();
        this.objects.particleMaterial?.map?.dispose();
        this.objects.particleMaterial?.dispose();
        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            <h3>Smoke</h3>
            ${createSlider('particleCount', 'Count', 100, 2000, this.config.particleCount, 50)}
            ${createSlider('particleSize', 'Size', 0.5, 15, this.config.particleSize, 0.1)}
            ${createSlider('particleSpeed', 'Speed', 0.01, 0.5, this.config.particleSpeed, 0.01)}
            ${createSlider('noiseStrength', 'Noise', 0, 0.5, this.config.noiseStrength, 0.01)}
            <h3>Light 1</h3>
            ${createSlider('light1Intensity', 'Intensity', 0, 5, this.config.light1Intensity, 0.1)}
            ${createColorPicker('light1Color', 'Color', this.config.light1Color)}
            <h3>Light 2</h3>
            ${createSlider('light2Intensity', 'Intensity', 0, 5, this.config.light2Intensity, 0.1)}
            ${createColorPicker('light2Color', 'Color', this.config.light2Color)}
        `;

        // Add listeners for sliders that require a full scene reset
        addSliderListeners(this.config, () => {
            if (event.target.id === 'particleCount') {
                this.destroy();
                this.init(this.scene);
            }
        });

        // Add listeners for color pickers
        addColorListeners(this.config, (key, value) => {
            if (key === 'light1Color') this.objects.color1.set(value);
            if (key === 'light2Color') this.objects.color2.set(value);
        });
        
        // Direct listener for particle size so it updates in real-time
        document.getElementById('particleSize').addEventListener('input', (e) => {
            this.config.particleSize = parseFloat(e.target.value);
            if (this.objects.particleMaterial) {
                this.objects.particleMaterial.size = this.config.particleSize;
            }
        });
    },

    // Utility to create the particle texture
    createSmokeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255,255,255,0.5)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(canvas);
    }
};
