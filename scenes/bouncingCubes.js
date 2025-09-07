import * as THREE from 'three';
import { createSlider, addSliderListeners } from '../utils.js';

export const bouncingCubes = {
    title: "Bouncing Cubes",
    scene: null,

    config: {
        cubeCount: 50,
        maxSpeed: 0.02,
        maxSize: 0.8,
        spinStrength: 0.05, // New: Controls how fast cubes spin after a bounce
        bounds: 8,
    },

    objects: {},

    init(scene) {
        this.scene = scene;
        
        this.objects.cubeGroup = new THREE.Group();
        this.scene.add(this.objects.cubeGroup);

        const geometry = new THREE.BoxGeometry(1, 1, 1);

        for (let i = 0; i < this.config.cubeCount; i++) {
            const size = Math.random() * this.config.maxSize + 0.1;
            
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(Math.random(), Math.random(), Math.random()),
                metalness: 0.2,
                roughness: 0.5,
            });

            const cube = new THREE.Mesh(geometry, material);
            cube.scale.set(size, size, size);
            
            // --- NEW: Set a random initial rotation ---
            cube.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );

            cube.position.set(
                (Math.random() - 0.5) * this.config.bounds,
                (Math.random() - 0.5) * this.config.bounds,
                (Math.random() - 0.5) * this.config.bounds
            );

            cube.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * this.config.maxSpeed,
                (Math.random() - 0.5) * this.config.maxSpeed,
                (Math.random() - 0.5) * this.config.maxSpeed
            );
            
            // --- NEW: Add a property to store the cube's spin ---
            cube.userData.angularVelocity = new THREE.Vector3(0, 0, 0);
            
            this.objects.cubeGroup.add(cube);
        }

        this.objects.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.objects.ambientLight);

        this.objects.dirLight = new THREE.DirectionalLight(0xffffff, 1);
        this.objects.dirLight.position.set(5, 10, 7.5);
        this.scene.add(this.objects.dirLight);
    },

    update(clock, mouse, camera) {
        this.objects.cubeGroup.rotation.y += 0.0005;
        this.objects.cubeGroup.rotation.x += 0.0002;

        const bounds = this.config.bounds / 2;

        this.objects.cubeGroup.children.forEach(cube => {
            // Apply movement
            cube.position.add(cube.userData.velocity);
            
            // --- NEW: Apply continuous rotation ---
            cube.rotation.x += cube.userData.angularVelocity.x;
            cube.rotation.y += cube.userData.angularVelocity.y;
            cube.rotation.z += cube.userData.angularVelocity.z;

            // Bounce and Color Change Logic
            ['x', 'y', 'z'].forEach(axis => {
                const halfSize = cube.scale[axis] / 2;
                
                if ((cube.position[axis] + halfSize > bounds && cube.userData.velocity[axis] > 0) ||
                    (cube.position[axis] - halfSize < -bounds && cube.userData.velocity[axis] < 0)) {
                    
                    cube.userData.velocity[axis] *= -1;
                    cube.material.color.setRGB(Math.random(), Math.random(), Math.random());

                    // --- NEW: Set a new random angular velocity on bounce ---
                    cube.userData.angularVelocity.set(
                        (Math.random() - 0.5) * this.config.spinStrength,
                        (Math.random() - 0.5) * this.config.spinStrength,
                        (Math.random() - 0.5) * this.config.spinStrength
                    );
                }
            });
        });
    },

    destroy() {
        if (!this.scene) return;
        
        this.objects.cubeGroup.children.forEach(cube => {
            cube.geometry.dispose();
            cube.material.dispose();
        });

        this.scene.remove(this.objects.cubeGroup);
        this.scene.remove(this.objects.ambientLight);
        this.scene.remove(this.objects.dirLight);

        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            <h3>Cubes</h3>
            ${createSlider('cubeCount', 'Count', 10, 200, this.config.cubeCount, '1')}
            ${createSlider('maxSpeed', 'Max Speed', 0.01, 0.1, this.config.maxSpeed, '0.001')}
            ${createSlider('maxSize', 'Max Size', 0.2, 2, this.config.maxSize, '0.1')}
            ${createSlider('spinStrength', 'Spin Strength', 0, 0.2, this.config.spinStrength, '0.01')}
        `;

        addSliderListeners(this.config, (event) => {
            if (event && event.target.id === 'cubeCount') {
                this.destroy();
                this.init(this.scene);
            }
        });
    }
};
