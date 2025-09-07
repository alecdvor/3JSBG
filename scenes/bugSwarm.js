import * as THREE from 'three';
import { createSlider, addSliderListeners, createColorPicker, addColorListeners } from '../utils.js';

export const bugSwarm = {
    title: "Bug Swarm",
    scene: null,

    config: {
        fireflyCount: 50,
        roachCount: 30,
        fireflySpeed: 0.03,
        roachSpeed: 0.05,
        fireflyLightIntensity: 2.0,
        fireflyColor: '#ffffaa',
        bounds: 10,
    },

    objects: {},

    init(scene) {
        this.scene = scene;
        
        this.objects.fireflies = new THREE.Group();
        this.scene.add(this.objects.fireflies);
        
        this.objects.roaches = new THREE.Group();
        this.scene.add(this.objects.roaches);

        // --- Create Fireflies ---
        const fireflyGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const fireflyMat = new THREE.MeshBasicMaterial({ color: this.config.fireflyColor });

        for (let i = 0; i < this.config.fireflyCount; i++) {
            const firefly = new THREE.Mesh(fireflyGeo, fireflyMat);
            const light = new THREE.PointLight(this.config.fireflyColor, this.config.fireflyLightIntensity, 2);
            firefly.add(light);
            
            firefly.position.set(
                (Math.random() - 0.5) * this.config.bounds,
                (Math.random() - 0.5) * this.config.bounds,
                (Math.random() - 0.5) * this.config.bounds
            );

            firefly.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5),
                (Math.random() - 0.5),
                (Math.random() - 0.5)
            ).normalize().multiplyScalar(this.config.fireflySpeed);
            
            // For the blinking effect
            firefly.userData.blinkOffset = Math.random() * Math.PI * 2;
            
            this.objects.fireflies.add(firefly);
        }

        // --- Create Roaches ---
        const roachGeo = new THREE.CapsuleGeometry(0.1, 0.2, 4, 8);
        const roachMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.4, metalness: 0.1 });
        
        for (let i = 0; i < this.config.roachCount; i++) {
            const roach = new THREE.Mesh(roachGeo, roachMat);
            roach.scale.z = 0.5; // Flatten the capsule
            roach.rotation.x = Math.PI / 2; // Lay it flat

            roach.position.set(
                (Math.random() - 0.5) * this.config.bounds,
                (-this.config.bounds / 2) + 0.1, // On the "floor"
                (Math.random() - 0.5) * this.config.bounds
            );

            roach.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5),
                0,
                (Math.random() - 0.5)
            ).normalize().multiplyScalar(this.config.roachSpeed);

            this.objects.roaches.add(roach);
        }
        
        // --- Lighting ---
        this.objects.ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(this.objects.ambientLight);
    },

    update(clock) {
        const elapsedTime = clock.getElapsedTime();
        const bounds = this.config.bounds / 2;

        // Update Fireflies
        this.objects.fireflies.children.forEach(firefly => {
            firefly.position.add(firefly.userData.velocity);

            // Blink the light
            firefly.children[0].intensity = (Math.sin(elapsedTime * 3 + firefly.userData.blinkOffset) * 0.5 + 0.5) * this.config.fireflyLightIntensity;

            // Bounce off walls
            if (Math.abs(firefly.position.x) > bounds) firefly.userData.velocity.x *= -1;
            if (Math.abs(firefly.position.y) > bounds) firefly.userData.velocity.y *= -1;
            if (Math.abs(firefly.position.z) > bounds) firefly.userData.velocity.z *= -1;
        });

        // Update Roaches
        this.objects.roaches.children.forEach(roach => {
            roach.position.add(roach.userData.velocity);

            // Roaches turn and scuttle when they hit a wall
            if (Math.abs(roach.position.x) > bounds) {
                roach.userData.velocity.x *= -1;
                roach.rotation.y = Math.atan2(roach.userData.velocity.x, roach.userData.velocity.z);
            }
            if (Math.abs(roach.position.z) > bounds) {
                roach.userData.velocity.z *= -1;
                roach.rotation.y = Math.atan2(roach.userData.velocity.x, roach.userData.velocity.z);
            }
        });
    },

    destroy() {
        if (!this.scene) return;
        
        this.objects.fireflies.children.forEach(bug => {
            bug.geometry.dispose();
            bug.material.dispose();
        });
        this.objects.roaches.children.forEach(bug => {
            bug.geometry.dispose();
            bug.material.dispose();
        });

        this.scene.remove(this.objects.fireflies);
        this.scene.remove(this.objects.roaches);
        this.scene.remove(this.objects.ambientLight);
        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            <h3>Fireflies</h3>
            ${createSlider('fireflyCount', 'Count', 10, 200, this.config.fireflyCount, '1')}
            ${createSlider('fireflySpeed', 'Speed', 0.01, 0.1, this.config.fireflySpeed, '0.001')}
            ${createSlider('fireflyLightIntensity', 'Intensity', 0.5, 10, this.config.fireflyLightIntensity, '0.1')}
            ${createColorPicker('fireflyColor', 'Color', this.config.fireflyColor)}
            <h3>Cockroaches</h3>
            ${createSlider('roachCount', 'Count', 5, 100, this.config.roachCount, '1')}
            ${createSlider('roachSpeed', 'Speed', 0.01, 0.2, this.config.roachSpeed, '0.005')}
        `;

        addSliderListeners(this.config, (event) => {
            if (event && ['fireflyCount', 'roachCount'].includes(event.target.id)) {
                this.destroy();
                this.init(this.scene);
            }
        });

        addColorListeners(this.config, (key, value) => {
            if (key === 'fireflyColor') {
                this.objects.fireflies.children.forEach(firefly => {
                    firefly.material.color.set(value);
                    firefly.children[0].color.set(value);
                });
            }
        });
        
        document.getElementById('fireflyLightIntensity').addEventListener('input', (e) => {
            this.config.fireflyLightIntensity = parseFloat(e.target.value);
        });
    }
};
