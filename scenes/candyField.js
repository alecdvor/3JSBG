import * as THREE from 'three';
import { createSlider, addSliderListeners } from '../utils.js'; 

export const candyField = {
    title: "Candy Field",
    scene: null,

    config: {
        candyCount: 75,
        maxSpeed: 0.01,
        maxSpin: 0.01,
        fieldSize: 10,
    },

    objects: {},

    init(scene) {
        this.scene = scene;
        
        this.objects.candyGroup = new THREE.Group();
        this.scene.add(this.objects.candyGroup);

        // --- Create a variety of candy geometries ---
        const geometries = [
            new THREE.SphereGeometry(0.5, 16, 16),      // Gumball
            new THREE.CapsuleGeometry(0.3, 0.8, 4, 8), // Pill-shaped candy
            new THREE.TorusGeometry(0.4, 0.15, 8, 24),   // Gummy ring
            new THREE.BoxGeometry(1, 1, 1).twist(Math.PI / 4), // Wrapped candy
        ];

        const candyColors = [0xff80ab, 0x80d8ff, 0xa5d6a7, 0xffd54f, 0xb39ddb];

        for (let i = 0; i < this.config.candyCount; i++) {
            const geometry = geometries[Math.floor(Math.random() * geometries.length)];
            const material = new THREE.MeshStandardMaterial({
                color: candyColors[Math.floor(Math.random() * candyColors.length)],
                metalness: 0.1,
                roughness: 0.6,
            });

            const candy = new THREE.Mesh(geometry, material);
            
            // Randomize scale and orientation
            const scale = Math.random() * 0.5 + 0.3;
            candy.scale.set(scale, scale, scale);
            candy.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);

            // Set random position within the field
            candy.position.set(
                (Math.random() - 0.5) * this.config.fieldSize,
                (Math.random() - 0.5) * this.config.fieldSize,
                (Math.random() - 0.5) * this.config.fieldSize
            );

            // Add physics properties
            candy.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * this.config.maxSpeed,
                (Math.random() - 0.5) * this.config.maxSpeed,
                (Math.random() - 0.5) * this.config.maxSpeed
            );
            candy.userData.angularVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * this.config.maxSpin,
                (Math.random() - 0.5) * this.config.maxSpin,
                (Math.random() - 0.5) * this.config.maxSpin
            );
            
            this.objects.candyGroup.add(candy);
        }

        // --- Lighting ---
        this.objects.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(this.objects.ambientLight);
        this.objects.dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.objects.dirLight.position.set(5, 10, 7.5);
        this.scene.add(this.objects.dirLight);
    },

    update(clock) {
        const bounds = this.config.fieldSize / 2;

        this.objects.candyGroup.children.forEach(candy => {
            // Apply movement and rotation
            candy.position.add(candy.userData.velocity);
            candy.rotation.x += candy.userData.angularVelocity.x;
            candy.rotation.y += candy.userData.angularVelocity.y;
            candy.rotation.z += candy.userData.angularVelocity.z;

            // Simple bounds check to wrap around the field
            ['x', 'y', 'z'].forEach(axis => {
                if (candy.position[axis] > bounds) candy.position[axis] = -bounds;
                if (candy.position[axis] < -bounds) candy.position[axis] = bounds;
            });
        });
    },

    destroy() {
        if (!this.scene) return;
        
        this.objects.candyGroup.children.forEach(candy => {
            candy.geometry.dispose();
            candy.material.dispose();
        });

        this.scene.remove(this.objects.candyGroup);
        this.scene.remove(this.objects.ambientLight);
        this.scene.remove(this.objects.dirLight);
        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            <h3>Candy</h3>
            ${createSlider('candyCount', 'Count', 20, 300, this.config.candyCount, '5')}
            ${createSlider('maxSpeed', 'Max Speed', 0.005, 0.05, this.config.maxSpeed, '0.001')}
            ${createSlider('maxSpin', 'Max Spin', 0, 0.05, this.config.maxSpin, '0.001')}
        `;

        addSliderListeners(this.config, (event) => {
            if (event && event.target.id === 'candyCount') {
                this.destroy();
                this.init(this.scene);
            }
        });
    }
};
