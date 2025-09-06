/*
 * =====================================================================================
 * SCENE: Smokey Lights
 * =====================================================================================
 *
 * A customizable background of drifting smoke illuminated by two colored lights.
 * This scene uses a particle system for an efficient, animated smoke effect.
 *
 * =====================================================================================
 */

// Import the Three.js library.
import * as THREE from 'three';

/**
 * @exports smokeyLights
 *
 * The main scene object. The name of this exported constant MUST match the filename.
 */
export const smokeyLights = {

    /**
     * @property {string} title
     * The display name for the scene, which appears in the UI.
     */
    title: "Smokey Lights",

    /**
     * @property {object} config
     * Holds all customizable parameters for the scene, with default values.
     */
    config: {
        particleCount: 700,
        particleSize: 3.5,
        particleSpeed: 0.15,
        light1Color: '#ff4081',
        light1Intensity: 300,
        light2Color: '#3f51b5',
        light2Intensity: 300,
    },

    /**
     * @property {object} objects
     * A container for Three.js objects that need to be accessed across different functions.
     */
    objects: {
        smokeParticles: null,
        light1: null,
        light2: null,
        particleMaterial: null,
        particleGeometry: null,
        smokeTexture: null,
    },

    /**
     * @property {THREE.Scene | null} scene
     * A reference to the main Three.js scene object, populated by `init`.
     */
    scene: null,

    /**
     * @private
     * @method _createSmokeTexture
     * Generates a procedural, soft, circular texture for the smoke particles.
     * This avoids the need for external image files.
     * @returns {THREE.CanvasTexture} A texture object.
     */
    _createSmokeTexture() {
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

        this.objects.smokeTexture = new THREE.CanvasTexture(canvas);
        return this.objects.smokeTexture;
    },


    /**
     * @method init
     * Sets up the initial scene objects (particles and lights).
     * @param {THREE.Scene} scene - The main Three.js scene.
     */
    init(scene) {
        this.scene = scene;
        this.scene.fog = new THREE.Fog(0x000000, 1, 25);

        // --- Create Smoke Particles ---
        const particleCount = this.config.particleCount;
        this.objects.particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3); // Store y-velocity and x/z sway factors

        for (let i = 0; i < particleCount; i++) {
            // Position
            positions[i * 3] = (Math.random() - 0.5) * 20; // x
            positions[i * 3 + 1] = Math.random() * 10;      // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5; // z

            // Velocity (y-speed, x-sway frequency, z-sway frequency)
            velocities[i * 3] = (Math.random() * 0.5 + 0.5) * this.config.particleSpeed;
            velocities[i * 3 + 1] = Math.random() * 2;
            velocities[i * 3 + 2] = Math.random() * 2;
        }

        this.objects.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.objects.particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        this.objects.particleMaterial = new THREE.PointsMaterial({
            size: this.config.particleSize,
            map: this._createSmokeTexture(),
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

    /**
     * @method destroy
     * Cleans up scene objects to prevent memory leaks.
     */
    destroy() {
        if (!this.scene) return;

        // Dispose of geometries, materials, and textures
        this.objects.particleGeometry?.dispose();
        this.objects.particleMaterial?.dispose();
        this.objects.smokeTexture?.dispose();

        // Remove all objects from the scene
        this.scene.remove(this.objects.smokeParticles);
        this.scene.remove(this.objects.light1);
        this.scene.remove(this.objects.light2);
        this.scene.fog = null;

        // Clear the objects container
        this.objects = {};
    },

    /**
     * @method update
     * The animation loop, called on every frame.
     * @param {THREE.Clock} clock - Provides time information.
     */
    update(clock) {
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
                // Update Y position
                positions[i3 + 1] += velocities[i3]; // Use stored upward velocity

                // Add gentle horizontal sway
                positions[i3] += Math.sin(elapsedTime * velocities[i3 + 1]) * 0.01;
                positions[i3 + 2] += Math.cos(elapsedTime * velocities[i3 + 2]) * 0.01;


                // If particle goes above the view, reset it to the bottom
                if (positions[i3 + 1] > 10) {
                    positions[i3 + 1] = -5;
                }
            }
            this.objects.particleGeometry.attributes.position.needsUpdate = true;
        }
    },

    /**
     * @method createControls
     * Generates the HTML controls for the scene's `config` parameters.
     */
    createControls() {
        const container = document.getElementById('scene-controls-container');

        container.innerHTML = `
            <div class="control-section">
                <h3>Smoke</h3>
                <div class="control-row">
                    <label for="particleSize">Size</label>
                    <input type="range" id="particleSize" min="0.5" max="10" step="0.1" value="${this.config.particleSize}">
                    <span class="value-label">${this.config.particleSize}</span>
                </div>
                <div class="control-row">
                    <label for="particleSpeed">Speed</label>
                    <input type="range" id="particleSpeed" min="0.01" max="1" step="0.01" value="${this.config.particleSpeed}">
                    <span class="value-label">${this.config.particleSpeed}</span>
                </div>
            </div>

            <div class="control-section">
                <h3>Light 1</h3>
                <div class="control-row">
                    <label for="light1Intensity">Intensity</label>
                    <input type="range" id="light1Intensity" min="0" max="1000" step="10" value="${this.config.light1Intensity}">
                    <span class="value-label">${this.config.light1Intensity}</span>
                </div>
                <div class="control-row">
                    <label for="light1Color">Color</label>
                    <input type="color" id="light1Color" value="${this.config.light1Color}">
                </div>
            </div>

            <div class="control-section">
                <h3>Light 2</h3>
                 <div class="control-row">
                    <label for="light2Intensity">Intensity</label>
                    <input type="range" id="light2Intensity" min="0" max="1000" step="10" value="${this.config.light2Intensity}">
                    <span class="value-label">${this.config.light2Intensity}</span>
                </div>
                <div class="control-row">
                    <label for="light2Color">Color</label>
                    <input type="color" id="light2Color" value="${this.config.light2Color}">
                </div>
            </div>
        `;

        // --- Event Listeners ---

        // Particle Size
        document.getElementById('particleSize').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.config.particleSize = value;
            if (this.objects.particleMaterial) {
                this.objects.particleMaterial.size = value;
            }
            e.target.nextElementSibling.textContent = value.toFixed(1);
        });

        // Particle Speed
        document.getElementById('particleSpeed').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.config.particleSpeed = value;
            // Update the base speed for all particles
            const velocities = this.objects.particleGeometry.attributes.velocity.array;
            for (let i = 0; i < this.config.particleCount; i++) {
                 // Recalculate based on original randomness, preserving variation
                 const originalRandomness = velocities[i*3] / (this.config.particleSpeed / value); // Estimate original random factor
                 velocities[i*3] = (originalRandomness) * value;
            }
            e.target.nextElementSibling.textContent = value.toFixed(2);
        });

        // Light 1 Intensity
        document.getElementById('light1Intensity').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.config.light1Intensity = value;
            if (this.objects.light1) {
                this.objects.light1.intensity = value;
            }
            e.target.nextElementSibling.textContent = value;
        });

        // Light 1 Color
        document.getElementById('light1Color').addEventListener('input', (e) => {
            this.config.light1Color = e.target.value;
            if (this.objects.light1) {
                this.objects.light1.color.set(e.target.value);
            }
        });

        // Light 2 Intensity
        document.getElementById('light2Intensity').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.config.light2Intensity = value;
            if (this.objects.light2) {
                this.objects.light2.intensity = value;
            }
            e.target.nextElementSibling.textContent = value;
        });

        // Light 2 Color
        document.getElementById('light2Color').addEventListener('input', (e) => {
            this.config.light2Color = e.target.value;
            if (this.objects.light2) {
                this.objects.light2.color.set(e.target.value);
            }
        });
    }
};
