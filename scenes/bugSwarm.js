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
        wingFlapSpeed: 15,
        wingFlapAngle: 1.2, // New: Controls the range of the wing flap
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
        const wingVertices = new Float32Array([
            0, 0, -0.1,  // A: attachment point
            0, 0, 0.2,   // B: wing tip 1
            0.15, 0, 0.1, // C: wing tip 2
        ]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
        wingGeo.computeVertexNormals();
        const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });

        // --- Create Fireflies ---
        const fireflyBodyGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const fireflyBodyMat = new THREE.MeshBasicMaterial({ color: this.config.fireflyColor });

        for (let i = 0; i < this.config.fireflyCount; i++) {
            const firefly = new THREE.Group();
            
            const body = new THREE.Mesh(fireflyBodyGeo, fireflyBodyMat);
            firefly.add(body);

            const light = new THREE.PointLight(this.config.fireflyColor, this.config.fireflyLightIntensity, 2);
            firefly.add(light);
            
            const leftWing = new THREE.Mesh(wingGeo, wingMat);
            leftWing.position.set(0.05, 0, 0);
            firefly.add(leftWing);

            const rightWing = new THREE.Mesh(wingGeo, wingMat);
            rightWing.position.set(-0.05, 0, 0);
            rightWing.rotation.y = Math.PI; // Flip the wing
            firefly.add(rightWing);
            
            firefly.userData.wings = [leftWing, rightWing];
            
            firefly.position.set(
                (Math.random() - 0.5) * this.config.bounds,
                (Math.random() - 0.5) * this.config.bounds,
                (Math.random() - 0.5) * this.config.bounds
            );

            firefly.userData.velocity = new THREE.Vector3().randomDirection().multiplyScalar(this.config.fireflySpeed);
            firefly.userData.blinkOffset = Math.random() * Math.PI * 2;
            
            this.objects.fireflies.add(firefly);
        }

        // --- Create Roaches ---
        const roachBodyGeo = new THREE.CapsuleGeometry(0.1, 0.2, 4, 8);
        const roachBodyMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.4, metalness: 0.1 });
        
        for (let i = 0; i < this.config.roachCount; i++) {
            const roach = new THREE.Group();
            
            const body = new THREE.Mesh(roachBodyGeo, roachBodyMat);
            body.scale.z = 0.5;
            body.rotation.x = Math.PI / 2;
            roach.add(body);

            const leftWing = new THREE.Mesh(wingGeo, wingMat);
            leftWing.scale.set(1.5, 1.5, 1.5);
            leftWing.position.set(0.1, 0.05, 0); 
            roach.add(leftWing);

            const rightWing = new THREE.Mesh(wingGeo, wingMat);
            rightWing.scale.set(1.5, 1.5, 1.5);
            rightWing.position.set(-0.1, 0.05, 0);
            rightWing.rotation.y = Math.PI;
            roach.add(rightWing);

            roach.userData.wings = [leftWing, rightWing];
            
            roach.position.set(
                (Math.random() - 0.5) * this.config.bounds,
                (-this.config.bounds / 2) + 0.1,
                (Math.random() - 0.5) * this.config.bounds
            );

            roach.userData.velocity = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize().multiplyScalar(this.config.roachSpeed);
            
            this.objects.roaches.add(roach);
        }
        
        this.objects.ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(this.objects.ambientLight);
    },

    update(clock) {
        const elapsedTime = clock.getElapsedTime();
        const bounds = this.config.bounds / 2;

        // --- Animate Bugs ---
        this.objects.fireflies.children.forEach(bug => this.animateBug(bug, elapsedTime, true));
        this.objects.roaches.children.forEach(bug => this.animateBug(bug, elapsedTime, false));
    },

    animateBug(bug, elapsedTime, isFirefly) {
        const bounds = this.config.bounds / 2;

        bug.position.add(bug.userData.velocity);

        // --- NEW: Butterfly Flap Animation ---
        const flapCycle = Math.sin(elapsedTime * this.config.wingFlapSpeed + bug.userData.blinkOffset);
        const flapAngle = (flapCycle * 0.5 + 0.5) * this.config.wingFlapAngle; // Flap from 0 to max angle
        const oscillation = Math.cos(elapsedTime * this.config.wingFlapSpeed * 0.5 + bug.userData.blinkOffset) * 0.2; // Slower side-to-side rotation

        bug.userData.wings[0].rotation.x = flapAngle;
        bug.userData.wings[1].rotation.x = flapAngle;
        bug.userData.wings[0].rotation.z = oscillation;
        bug.userData.wings[1].rotation.z = -oscillation;

        // Bounce off walls
        if (Math.abs(bug.position.x) > bounds) bug.userData.velocity.x *= -1;
        if (isFirefly && Math.abs(bug.position.y) > bounds) bug.userData.velocity.y *= -1;
        if (Math.abs(bug.position.z) > bounds) bug.userData.velocity.z *= -1;
        
        // Orient bug to its direction of travel
        bug.lookAt(bug.position.clone().add(bug.userData.velocity));

        if (isFirefly) {
            // Blink the light
            bug.children[1].intensity = (Math.sin(elapsedTime * 3 + bug.userData.blinkOffset) * 0.5 + 0.5) * this.config.fireflyLightIntensity;
        } else {
            // Keep roaches on the floor
            bug.position.y = (-bounds) + 0.1;
        }
    },

    destroy() {
        if (!this.scene) return;
        
        // Simplified disposal
        this.scene.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
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
            ${createSlider('wingFlapSpeed', 'Wing Speed', 1, 50, this.config.wingFlapSpeed, '1')}
            ${createSlider('wingFlapAngle', 'Flap Angle', 0.1, 2.5, this.config.wingFlapAngle, '0.1')}
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
        
        // Add direct listeners for properties that don't require a scene rebuild
        ['fireflyLightIntensity', 'wingFlapSpeed', 'wingFlapAngle'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                this.config[id] = parseFloat(e.target.value);
            });
        });
    }
};
