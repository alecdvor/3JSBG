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
        wingFlapSpeed: 10, // New: Speed of wing animation
        bounds: 10,
    },

    objects: {},

    init(scene) {
        this.scene = scene;
        
        this.objects.fireflies = new THREE.Group();
        this.scene.add(this.objects.fireflies);
        
        this.objects.roaches = new THREE.Group();
        this.scene.add(this.objects.roaches);

        // --- Shared Wing Geometry and Material ---
        const wingGeo = new THREE.BufferGeometry();
        // Define vertices for a simple triangle wing
        const wingVertices = new Float32Array([
            0, 0, 0,    // A: attachment point
            0.1, 0, 0.3, // B: wing tip 1
            -0.1, 0, 0.3 // C: wing tip 2
        ]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
        wingGeo.computeVertexNormals();
        const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });

        // --- Create Fireflies ---
        const fireflyBodyGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const fireflyBodyMat = new THREE.MeshBasicMaterial({ color: this.config.fireflyColor });

        for (let i = 0; i < this.config.fireflyCount; i++) {
            const firefly = new THREE.Group(); // Use a Group to hold body, light, and wings
            
            const body = new THREE.Mesh(fireflyBodyGeo, fireflyBodyMat);
            firefly.add(body);

            const light = new THREE.PointLight(this.config.fireflyColor, this.config.fireflyLightIntensity, 2);
            firefly.add(light);
            
            // --- Add Wings to Firefly ---
            const leftWing = new THREE.Mesh(wingGeo, wingMat);
            leftWing.position.set(0.05, 0, 0); // Offset from body
            leftWing.rotation.y = Math.PI / 2; // Orient wing correctly
            firefly.add(leftWing);

            const rightWing = new THREE.Mesh(wingGeo, wingMat);
            rightWing.position.set(-0.05, 0, 0);
            rightWing.rotation.y = -Math.PI / 2;
            firefly.add(rightWing);
            
            firefly.userData.wings = [leftWing, rightWing]; // Store references to wings
            
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
            
            firefly.userData.blinkOffset = Math.random() * Math.PI * 2;
            
            this.objects.fireflies.add(firefly);
        }

        // --- Create Roaches ---
        const roachBodyGeo = new THREE.CapsuleGeometry(0.1, 0.2, 4, 8);
        const roachBodyMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.4, metalness: 0.1 });
        
        for (let i = 0; i < this.config.roachCount; i++) {
            const roach = new THREE.Group(); // Use a Group for body and wings
            
            const body = new THREE.Mesh(roachBodyGeo, roachBodyMat);
            body.scale.z = 0.5; // Flatten the capsule
            body.rotation.x = Math.PI / 2; // Lay it flat
            roach.add(body);

            // --- Add Wings to Roach ---
            const leftWing = new THREE.Mesh(wingGeo, wingMat);
            leftWing.scale.set(1.5, 1.5, 1.5); // Slightly larger wings
            leftWing.position.set(0.1, 0.05, 0); 
            leftWing.rotation.y = Math.PI / 2;
            leftWing.rotation.z = Math.PI / 8; // Angle wings slightly up
            roach.add(leftWing);

            const rightWing = new THREE.Mesh(wingGeo, wingMat);
            rightWing.scale.set(1.5, 1.5, 1.5);
            rightWing.position.set(-0.1, 0.05, 0);
            rightWing.rotation.y = -Math.PI / 2;
            rightWing.rotation.z = -Math.PI / 8;
            roach.add(rightWing);

            roach.userData.wings = [leftWing, rightWing]; // Store references to wings
            
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

            // Blink the light (children[1] is the light, children[0] is the body)
            firefly.children[1].intensity = (Math.sin(elapsedTime * 3 + firefly.userData.blinkOffset) * 0.5 + 0.5) * this.config.fireflyLightIntensity;
            
            // Animate wings
            const wingRotation = Math.sin(elapsedTime * this.config.wingFlapSpeed + firefly.userData.blinkOffset) * Math.PI / 8; // Flap angle
            firefly.userData.wings[0].rotation.z = Math.PI / 8 + wingRotation; // Left wing (adjust initial angle)
            firefly.userData.wings[1].rotation.z = -Math.PI / 8 - wingRotation; // Right wing (adjust initial angle)


            // Bounce off walls
            if (Math.abs(firefly.position.x) > bounds) firefly.userData.velocity.x *= -1;
            if (Math.abs(firefly.position.y) > bounds) firefly.userData.velocity.y *= -1;
            if (Math.abs(firefly.position.z) > bounds) firefly.userData.velocity.z *= -1;

            // Orient firefly to its direction of travel (optional, but makes them look more natural)
            firefly.rotation.y = Math.atan2(firefly.userData.velocity.x, firefly.userData.velocity.z);
        });

        // Update Roaches
        this.objects.roaches.children.forEach(roach => {
            roach.position.add(roach.userData.velocity);

            // Animate wings
            const wingRotation = Math.sin(elapsedTime * this.config.wingFlapSpeed + roach.uuid.charCodeAt(0) / 100) * Math.PI / 8; // Different offset for each roach
            roach.userData.wings[0].rotation.z = Math.PI / 8 + wingRotation;
            roach.userData.wings[1].rotation.z = -Math.PI / 8 - wingRotation;

            // Roaches turn and scuttle when they hit a wall
            if (Math.abs(roach.position.x) > bounds) {
                roach.userData.velocity.x *= -1;
                roach.rotation.y = Math.atan2(roach.userData.velocity.x, roach.userData.velocity.z);
            }
            if (Math.abs(roach.position.z) > bounds) {
                roach.userData.velocity.z *= -1;
                roach.rotation.y = Math.atan2(roach.userData.velocity.x, roach.userData.velocity.z);
            }
            // Keep roaches on the floor
            roach.position.y = (-this.config.bounds / 2) + 0.1;
        });
    },

    destroy() {
        if (!this.scene) return;
        
        // Dispose geometries and materials
        this.objects.fireflies.children.forEach(bug => {
            bug.children[0].geometry.dispose(); // body geometry
            bug.children[0].material.dispose(); // body material
            bug.userData.wings[0].geometry.dispose(); // wing geometry (shared, but dispose once)
            bug.userData.wings[0].material.dispose(); // wing material (shared, but dispose once)
        });
        this.objects.roaches.children.forEach(bug => {
            bug.children[0].geometry.dispose(); // body geometry
            bug.children[0].material.dispose(); // body material
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
            <h3>Global</h3>
            ${createSlider('wingFlapSpeed', 'Wing Flap Speed', 1, 30, this.config.wingFlapSpeed, '1')}
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
                    firefly.children[0].material.color.set(value); // Body
                    firefly.children[1].color.set(value); // Light
                });
            }
        });
        
        document.getElementById('fireflyLightIntensity').addEventListener('input', (e) => {
            this.config.fireflyLightIntensity = parseFloat(e.target.value);
        });

        document.getElementById('wingFlapSpeed').addEventListener('input', (e) => {
            this.config.wingFlapSpeed = parseFloat(e.target.value);
        });
    }
};
