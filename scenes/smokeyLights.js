import * as THREE from 'three';
import { createSlider, createColorPicker, addSliderListeners, addColorListeners } from '../utils.js';

/**
 * Creates a procedural, soft, circular texture for the smoke particles.
 * @returns {THREE.CanvasTexture} A texture object.
 */
function createSmokeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');

    const gradient = context.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );

    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    return new THREE.CanvasTexture(canvas);
}

export const smokeyLights = {
    title: "Smokey Lights",
    scene: null,

    config: {
        particleCount: 700,
        particleSize: 3.5,
        particleSpeed: 0.15,
        light1Color: '#ff4081',
        light1Intensity: 300,
        light2Color: '#3f51b5',
        light2Intensity: 300,
    },

    objects: {},

    init(scene) {
        this.scene = scene;
        this.scene.fog = new THREE.Fog(0x000000, 1, 25);

        // --- Create Smoke Particles ---
        const particleCount = this.config.particleCount;
        this.objects.particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20;      // x
            positions[i * 3 + 1] = Math.random() * 10 - 5;      // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5; // z
            velocities[i * 3] = (Math.random() * 0.5 + 0.5); // base upward speed factor
        }

        this.objects.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.objects.particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        this.objects.smokeTexture = createSmokeTexture();
        this.objects.particleMaterial = new THREE.PointsMaterial({
            size: this.config.particleSize,
            map: this.objects.smokeTexture,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            opacity: 0.7,
        });

        this.objects.smokeParticles = new THREE.Points(this.objects.particleGeometry, this.objects.particleMaterial);
        this.scene.add(this.objects.smokeParticles);

        // --- Create Lights ---
        this.objects.light1 = new THREE.PointLight(this.config.light1Color, this.config.light1Intensity, 30, 2);
        this.scene.add(this.objects.light1);

        this.objects.light2 = new THREE.PointLight(this.config.light2Color, this.config.light2Intensity, 30, 2);
        this.scene.add(this.objects.light2);
    },

    update(clock, mouse) {
        const elapsedTime = clock.getElapsedTime();

        // Animate Lights
        if (this.objects.light1) {
            this.objects.light1.position.x = Math.sin(elapsedTime * 0.6) * 6;
            this.objects.light1.position.y = Math.cos(elapsedTime * 0.4) * 4 + 2;
            this.objects.light1.position.z = Math.cos(elapsedTime * 0.5) * 6;
        }

        if (this.objects.light2) {
            this.objects.light2.position.x = Math.cos(elapsedTime * 0.3) * 6;
            this.objects.light2.position.y = Math.sin(elapsedTime * 0.5) * 4 + 2;
            this.objects.light2.position.z = Math.sin(elapsedTime * 0.2) * 6;
        }

        // Animate Particles
        if (this.objects.smokeParticles) {
            const positions = this.objects.particleGeometry.attributes.position.array;
            const velocities = this.objects.particleGeometry.attributes.velocity.array;

            for (let i = 0; i < this.config.particleCount; i++) {
                const i3 = i * 3;
                positions[i3 + 1] += velocities[i3] * this.config.particleSpeed * 0.1;

                if (positions[i3 + 1] > 10) {
                    positions[i3 + 1] = -5;
                }
            }
            this.objects.particleGeometry.attributes.position.needsUpdate = true;
        }
    },

    destroy() {
        if (!this.scene || !this.objects.smokeParticles) return;

        this.scene.remove(this.objects.smokeParticles);
        this.scene.remove(this.objects.light1);
        this.scene.remove(this.objects.light2);
        this.scene.fog = null;

        this.objects.particleGeometry?.dispose();
        this.objects.particleMaterial?.dispose();
        this.objects.smokeTexture?.dispose();

        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            <div class="control-section">
                <h3>Smoke</h3>
                ${createSlider('particleCount', 'Count', 100, 2000, this.config.particleCount, 50)}
                ${createSlider('particleSize', 'Size', 0.5, 10, this.config.particleSize, 0.1)}
                ${createSlider('particleSpeed', 'Speed', 0.01, 1, this.config.particleSpeed, 0.01)}
            </div>
            <div class="control-section">
                <h3>Light 1</h3>
                ${createSlider('light1Intensity', 'Intensity', 0, 1000, this.config.light1Intensity, 10)}
                ${createColorPicker('light1Color', 'Color', this.config.light1Color)}
            </div>
            <div class="control-section">
                <h3>Light 2</h3>
                ${createSlider('light2Intensity', 'Intensity', 0, 1000, this.config.light2Intensity, 10)}
                ${createColorPicker('light2Color', 'Color', this.config.light2Color)}
            </div>
        `;

        // Add listeners for sliders. Note: Changing count requires a full scene reset.
        addSliderListeners(this.config, () => {
            this.destroy();
            this.init(this.scene);
        });

        // Add listeners for color pickers, which can update the scene directly.
        addColorListeners(this.config, (key, value) => {
            if (key === 'light1Color' && this.objects.light1) {
                this.objects.light1.color.set(value);
            } else if (key === 'light2Color' && this.objects.light2) {
                this.objects.light2.color.set(value);
            }
        });
    }
};
