import * as THREE from 'three';
import { createSlider, addSliderListeners } from '../utils.js';

export const colorCloud = {
    title: "Color Cloud",
    scene: null,

    config: {
        particleCount: 15000,
        particleSize: 35,
        fieldSize: 1000, // The radius of the sphere in which particles are generated
        colorSpeed: 0.1,
        colorSaturation: 0.5,
        colorLightness: 0.5,
        mouseInfluence: 0.05,
    },

    objects: {},

    init(scene) {
        this.scene = scene;
        this.scene.fog = new THREE.FogExp2(0x000000, 0.001);

        // A helper to track the smoothed mouse position
        this.objects.mouseTarget = new THREE.Vector2();
        
        this.regenerateParticles();
    },

    regenerateParticles() {
        if (this.objects.particles) {
            this.scene.remove(this.objects.particles);
            this.objects.particles.geometry.dispose();
            this.objects.particles.material.map?.dispose(); // Dispose texture
            this.objects.particles.material.dispose();
        }

        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        for (let i = 0; i < this.config.particleCount; i++) {
            const x = (Math.random() * 2 - 1) * this.config.fieldSize;
            const y = (Math.random() * 2 - 1) * this.config.fieldSize;
            const z = (Math.random() * 2 - 1) * this.config.fieldSize;
            vertices.push(x, y, z);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const sprite = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png');
        sprite.colorSpace = THREE.SRGBColorSpace;

        this.objects.material = new THREE.PointsMaterial({
            size: this.config.particleSize,
            sizeAttenuation: true,
            map: sprite,
            alphaTest: 0.5,
            transparent: true
        });
        
        this.objects.particles = new THREE.Points(geometry, this.objects.material);
        this.scene.add(this.objects.particles);
    },

    update(clock, mouse, camera) {
        if (!this.objects.particles) return;

        // Set camera starting position
        camera.position.z = 1000;

        // Smoothly move the camera target towards the actual mouse position
        this.objects.mouseTarget.x += (mouse.x - this.objects.mouseTarget.x) * this.config.mouseInfluence;
        this.objects.mouseTarget.y += (mouse.y - this.objects.mouseTarget.y) * this.config.mouseInfluence;
        
        // Animate the camera's position
        camera.position.x = this.objects.mouseTarget.x * 500;
        camera.position.y = -this.objects.mouseTarget.y * 500;
        camera.lookAt(this.scene.position);

        // Animate the particle colors
        const time = clock.getElapsedTime() * this.config.colorSpeed;
        const hue = (360 * (1.0 + time) % 360) / 360;
        this.objects.material.color.setHSL(hue, this.config.colorSaturation, this.config.colorLightness);
    },

    destroy() {
        if (!this.scene) return;
        this.scene.remove(this.objects.particles);
        this.objects.particles?.geometry.dispose();
        this.objects.particles?.material.map?.dispose();
        this.objects.particles?.material.dispose();
        this.scene.fog = null;
        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            <h3>Particles</h3>
            ${createSlider('particleCount', 'Count', 1000, 50000, this.config.particleCount, '1000')}
            ${createSlider('particleSize', 'Size', 5, 100, this.config.particleSize, '1')}
            ${createSlider('fieldSize', 'Field Size', 200, 2000, this.config.fieldSize, '50')}
            <h3>Animation</h3>
            ${createSlider('colorSpeed', 'Color Speed', 0, 1, this.config.colorSpeed, '0.01')}
            ${createSlider('colorSaturation', 'Saturation', 0, 1, this.config.colorSaturation, '0.01')}
            ${createSlider('colorLightness', 'Lightness', 0, 1, this.config.colorLightness, '0.01')}
            <h3>Interaction</h3>
            ${createSlider('mouseInfluence', 'Mouse Speed', 0.01, 0.2, this.config.mouseInfluence, '0.01')}
        `;

        addSliderListeners(this.config, (event) => {
            if (event && ['particleCount', 'fieldSize'].includes(event.target.id)) {
                this.regenerateParticles();
            }
        });

        // Add direct listeners for properties that can be updated in real-time
        ['particleSize', 'colorSaturation', 'colorLightness'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                this.config[id] = parseFloat(e.target.value);
                if (id === 'particleSize' && this.objects.material) {
                    this.objects.material.size = this.config.particleSize;
                }
            });
        });
    }
};
