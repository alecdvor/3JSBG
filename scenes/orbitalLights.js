import * as THREE from 'three';
// --- Import Addons for Node Materials ---
// Make sure your import map or build process can resolve these 'three/tsl' imports
import { color, lights } from 'three/tsl';
import { createSlider, createColorPicker, addSliderListeners, addColorListeners } from '../utils.js';

export const orbitalScene = {
    title: "Orbital Lights",
    scene: null,

    config: {
        particleCount: 500000,
        particleSize: 1.5,
        cloudRadius: 1.5,
        lightSpeed: 0.2,
        light1Color: '#ffaa00',
        light2Color: '#0040ff',
        light3Color: '#80ff80',
    },

    objects: {},

    init(scene, renderer) { // Added renderer to match the required format, though it's not used here
        this.scene = scene;
        this.scene.background = new THREE.Color(0x000000);

        // --- Lights ---
        // We create helper meshes to visualize the light positions, just like the oceanView scene.
        const sphereGeometry = new THREE.SphereGeometry(0.025, 16, 8);

        const addLight = (hexColor) => {
            const material = new THREE.NodeMaterial();
            material.colorNode = color(hexColor);
            material.lightsNode = lights(); // This mesh ignores other scene lights

            const mesh = new THREE.Mesh(sphereGeometry, material);
            const light = new THREE.PointLight(hexColor, 1); // Intensity set to 1
            light.add(mesh);
            this.scene.add(light);
            return light;
        };

        this.objects.light1 = addLight(this.config.light1Color);
        this.objects.light2 = addLight(this.config.light2Color);
        this.objects.light3 = addLight(this.config.light3Color);

        // This object will hold the small sphere meshes for cleanup
        this.objects.lightMeshes = [
            this.objects.light1.children[0],
            this.objects.light2.children[0],
            this.objects.light3.children[0]
        ];

        this.regenerateParticles();
    },

    regenerateParticles() {
        if (this.objects.particles) {
            this.scene.remove(this.objects.particles);
            this.objects.particles.geometry.dispose();
            this.objects.particles.material.dispose();
        }

        // --- Define the Custom Lighting Model *inside* this function ---
        // This keeps it within the scope of the exported object, matching the required format.
        class CustomLightingModel extends THREE.LightingModel {
            direct({ lightColor, reflectedLight }) {
                reflectedLight.directDiffuse.addAssign(lightColor);
            }
        }

        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const cloudRadius = this.config.cloudRadius;

        for (let i = 0; i < this.config.particleCount; i++) {
            const point = new THREE.Vector3().random().subScalar(0.5).multiplyScalar(cloudRadius * 2);
            positions.push(point);
        }
        geometry.setFromPoints(positions);

        // --- PointsNodeMaterial Setup ---
        const material = new THREE.PointsNodeMaterial();
        const allLightsNode = lights([this.objects.light1, this.objects.light2, this.objects.light3]);
        const lightingModel = new CustomLightingModel();
        const lightingModelContext = allLightsNode.context({ lightingModel });

        material.lightsNode = lightingModelContext;
        material.sizeNode = this.config.particleSize;

        this.objects.particles = new THREE.Points(geometry, material);
        this.scene.add(this.objects.particles);
    },

    update(clock, mouse, camera) { // Matched signature, though mouse/camera aren't used
        if (!this.objects.light1) return;

        const time = clock.getElapsedTime() * this.config.lightSpeed;
        const scale = 0.5;

        // Animate lights
        this.objects.light1.position.set(Math.sin(time * 0.7) * scale, Math.cos(time * 0.5) * scale, Math.cos(time * 0.3) * scale);
        this.objects.light2.position.set(Math.cos(time * 0.3) * scale, Math.sin(time * 0.5) * scale, Math.sin(time * 0.7) * scale);
        this.objects.light3.position.set(Math.sin(time * 0.7) * scale, Math.cos(time * 0.3) * scale, Math.sin(time * 0.5) * scale);

        // Gently rotate the whole scene
        this.scene.rotation.y = time * 0.1;
    },

    destroy() {
        if (!this.scene) return;

        // Dispose of geometries and materials explicitly, like in oceanView.js
        this.objects.particles?.geometry.dispose();
        this.objects.particles?.material.dispose();
        this.objects.lightMeshes?.forEach(mesh => {
            mesh.geometry.dispose();
            mesh.material.dispose();
        });

        // The scene clear() method will handle removing the objects
        this.scene.clear();
        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            <h3>Particles</h3>
            ${createSlider('particleCount', 'Count', 10000, 1000000, this.config.particleCount, '1000')}
            ${createSlider('particleSize', 'Size', 0.5, 5, this.config.particleSize, '0.1')}
            ${createSlider('cloudRadius', 'Cloud Radius', 0.5, 5, this.config.cloudRadius, '0.1')}
            <h3>Lights</h3>
            ${createSlider('lightSpeed', 'Speed', 0, 1, this.config.lightSpeed, '0.01')}
            ${createColorPicker('light1Color', 'Light 1', this.config.light1Color)}
            ${createColorPicker('light2Color', 'Light 2', this.config.light2Color)}
            ${createColorPicker('light3Color', 'Light 3', this.config.light3Color)}
        `;

        addSliderListeners(this.config, (event) => {
            if (event && ['particleCount', 'cloudRadius'].includes(event.target.id)) {
                this.regenerateParticles();
            }
        });
        
        addColorListeners(this.config, (key, value) => {
            if (key === 'light1Color') this.objects.light1.color.set(value);
            if (key === 'light2Color') this.objects.light2.color.set(value);
            if (key === 'light3Color') this.objects.light3.color.set(value);
        });
        
        document.getElementById('particleSize').addEventListener('input', (e) => {
            this.config.particleSize = parseFloat(e.target.value);
            if (this.objects.particles) this.objects.particles.material.sizeNode = this.config.particleSize;
        });
    }
};
