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
        mouseInfluenceRadius: 3,
        mousePushStrength: 0.2,
        light1Color: '#ff4081',
        light1Intensity: 1.5,
        light2Color: '#3f51b5',
        light2Intensity: 1.5,
    },

    objects: {},

    init(scene) {
        this.scene = scene;

        this.objects.particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.config.particleCount * 3);
        const velocities = new Float32Array(this.config.particleCount * 3);
        const colors = new Float32Array(this.config.particleCount * 3);

        for (let i = 0; i < this.config.particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 20;
            positions[i3 + 1] = Math.random() * 10 - 5;
            positions[i3 + 2] = (Math.random() - 0.5) * 10;
            velocities[i3] = (Math.random() - 0.5) * 0.1;
            velocities[i3 + 1] = Math.random() * 0.5 + 0.2;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;
        }

        this.objects.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.objects.particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        this.objects.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        this.objects.particleMaterial = new THREE.PointsMaterial({
            size: this.config.particleSize,
            map: this.createSmokeTexture(),
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });

        this.objects.smokeParticles = new THREE.Points(this.objects.particleGeometry, this.objects.particleMaterial);
        this.scene.add(this.objects.smokeParticles);

        this.objects.light1 = new THREE.Object3D();
        this.objects.light2 = new THREE.Object3D();
        this.objects.color1 = new THREE.Color(this.config.light1Color);
        this.objects.color2 = new THREE.Color(this.config.light2Color);
        
        // Vectors for tracking mouse movement
        this.objects.mousePosition3D = new THREE.Vector3();
        this.objects.lastMousePosition = new THREE.Vector2();
        this.objects.mouseVelocity = new THREE.Vector2();
    },

    update(clock, mouse, camera) {
        const elapsedTime = clock.getElapsedTime();

        // --- Calculate Mouse Velocity ---
        this.objects.mouseVelocity.subVectors(mouse, this.objects.lastMousePosition);
        this.objects.lastMousePosition.copy(mouse);

        // Project the 2D mouse position into the 3D scene
        this.objects.mousePosition3D.set(mouse.x, mouse.y, 0.5);
        this.objects.mousePosition3D.unproject(camera);
        this.objects.mousePosition3D.sub(camera.position).normalize();
        const distance = -camera.position.z / this.objects.mousePosition3D.z;
        this.objects.mousePosition3D.multiplyScalar(distance).add(camera.position);

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

        const positions = this.objects.particleGeometry.attributes.position.array;
        const velocities = this.objects.particleGeometry.attributes.velocity.array;
        const colors = this.objects.particleGeometry.attributes.color.array;
        
        const tempColor = new THREE.Color();
        const particlePosition = new THREE.Vector3();

        for (let i = 0; i < this.config.particleCount; i++) {
            const i3 = i * 3;
            particlePosition.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);

            // --- Mouse Push Logic ---
            const pushDist = particlePosition.distanceTo(this.objects.mousePosition3D);
            if (pushDist < this.config.mouseInfluenceRadius) {
                // Apply the mouse's velocity to the particle's velocity
                const pushForce = (1 - pushDist / this.config.mouseInfluenceRadius) * this.config.mousePushStrength;
                velocities[i3] += this.objects.mouseVelocity.x * pushForce;
                velocities[i3 + 1] += this.objects.mouseVelocity.y * pushForce;
            }

            // Update position based on velocity
            positions[i3] += velocities[i3] * this.config.particleSpeed;
            positions[i3 + 1] += velocities[i3 + 1] * this.config.particleSpeed;
            positions[i3 + 2] += velocities[i3 + 2] * this.config.particleSpeed;
            
            // Add noise
            positions[i3] += (Math.random() - 0.5) * this.config.noiseStrength;
            positions[i3 + 2] += (Math.random() - 0.5) * this.config.noiseStrength;

            // Reset particle
            if (positions[i3 + 1] > 10) {
                positions[i3] = (Math.random() - 0.5) * 20;
                positions[i3 + 1] = -5;
                positions[i3 + 2] = (Math.random() - 0.5) * 10;
            }

            // --- Color Calculation ---
            const dist1Sq = Math.max(1, particlePosition.distanceToSquared(this.objects.light1.position));
            const dist2Sq = Math.max(1, particlePosition.distanceToSquared(this.objects.light2.position));
            const influence1 = (1 / dist1Sq) * this.config.light1Intensity;
            const influence2 = (1 / dist2Sq) * this.config.light2Intensity;
            const totalInfluence = influence1 + influence2;
            const mixRatio = totalInfluence > 0 ? influence1 / totalInfluence : 0;

            tempColor.lerpColors(this.objects.color2, this.objects.color1, mixRatio);
            tempColor.multiplyScalar(totalInfluence);
            
            colors[i3] = tempColor.r;
            colors[i3 + 1] = tempColor.g;
            colors[i3 + 2] = tempColor.b;
        }
        
        this.objects.particleGeometry.attributes.position.needsUpdate = true;
        this.objects.particleGeometry.attributes.velocity.needsUpdate = true;
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
            ${createSlider('particleCount', 'Count', 100, 2000, this.config.particleCount, '50')}
            ${createSlider('particleSize', 'Size', 0.5, 15, this.config.particleSize, '0.1')}
            ${createSlider('particleSpeed', 'Speed', 0.01, 0.5, this.config.particleSpeed, '0.01')}
            ${createSlider('noiseStrength', 'Noise', 0, 0.5, this.config.noiseStrength, '0.01')}
            <h3>Mouse Interaction</h3>
            ${createSlider('mouseInfluenceRadius', 'Radius', 0, 10, this.config.mouseInfluenceRadius, '0.1')}
            ${createSlider('mousePushStrength', 'Strength', 0, 1, this.config.mousePushStrength, '0.01')}
            <h3>Light 1</h3>
            ${createSlider('light1Intensity', 'Intensity', 0, 5, this.config.light1Intensity, '0.1')}
            ${createColorPicker('light1Color', 'Color', this.config.light1Color)}
            <h3>Light 2</h3>
            ${createSlider('light2Intensity', 'Intensity', 0, 5, this.config.light2Intensity, '0.1')}
            ${createColorPicker('light2Color', 'Color', this.config.light2Color)}
        `;

        addSliderListeners(this.config, (event) => {
            if (event && event.target && event.target.id === 'particleCount') {
                this.destroy();
                this.init(this.scene);
            }
        });

        addColorListeners(this.config, (key, value) => {
            if (key === 'light1Color') this.objects.color1.set(value);
            if (key === 'light2Color') this.objects.color2.set(value);
        });
        
        document.getElementById('particleSize').addEventListener('input', (e) => {
            this.config.particleSize = parseFloat(e.target.value);
            if (this.objects.particleMaterial) {
                this.objects.particleMaterial.size = this.config.particleSize;
            }
        });
    },

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
