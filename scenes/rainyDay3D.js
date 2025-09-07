import * as THREE from 'three';
import { createSlider, addSliderListeners, createColorPicker, addColorListeners } from '../utils.js';

export const rainyDay3D = {
    title: "3D Rainy Day",
    scene: null,

    config: {
        rainCount: 5000,
        fallSpeed: 25,
        rainSize: 1.0,
        rippleSpeed: 8,
        rippleSize: 3,
        rainColor: '#aaddff',
        rippleColor: '#ffffff',
        boxHeight: 2,
    },

    objects: {},

    init(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer; // Store renderer reference
        this.scene.fog = new THREE.Fog(0x000000, 10, 50);

        // --- Collision Detection Setup ---
        const rtWidth = 256, rtHeight = 256;
        this.objects.collisionCamera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 40);
        this.objects.collisionCamera.position.y = 20;
        this.objects.collisionCamera.lookAt(0, 0, 0);

        this.objects.collisionRT = new THREE.WebGLRenderTarget(rtWidth, rtHeight, {
            type: THREE.FloatType,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
        });
        
        // This buffer will store the collision data read from the GPU
        this.objects.pixelBuffer = new Float32Array(rtWidth * rtHeight * 4);

        this.objects.positionMaterial = new THREE.ShaderMaterial({
            vertexShader: `varying vec3 vWorldPosition; void main() { vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `varying vec3 vWorldPosition; void main() { gl_FragColor = vec4(vWorldPosition, 1.0); }`
        });

        // --- Rain Particles (Instanced Mesh) ---
        const rainGeo = new THREE.CylinderGeometry(0.02, 0.02, this.config.rainSize, 5);
        const rainMat = new THREE.MeshBasicMaterial({ color: this.config.rainColor });
        this.objects.rain = new THREE.InstancedMesh(rainGeo, rainMat, this.config.rainCount);
        this.scene.add(this.objects.rain);

        // --- Ripples (Instanced Mesh) ---
        const rippleGeo = new THREE.RingGeometry(0.1, 0.2, 32);
        const rippleMat = new THREE.MeshBasicMaterial({
            color: this.config.rippleColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        this.objects.ripples = new THREE.InstancedMesh(rippleGeo.rotateX(-Math.PI/2), rippleMat, 100);
        this.scene.add(this.objects.ripples);
        
        // --- Scene Objects for Collision ---
        this.objects.floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
        this.objects.floor.rotation.x = -Math.PI / 2;
        this.scene.add(this.objects.floor);
        
        this.objects.box = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 5), new THREE.MeshStandardMaterial({ color: 0x444444 }));
        this.objects.box.scale.y = this.config.boxHeight;
        this.objects.box.position.y = this.config.boxHeight / 2;
        this.scene.add(this.objects.box);
        
        // --- Lighting ---
        this.objects.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.objects.ambientLight);
        this.objects.dirLight = new THREE.DirectionalLight(0xffffff, 1);
        this.objects.dirLight.position.set(5, 10, 5);
        this.scene.add(this.objects.dirLight);
        
        // Initialize particle positions and velocities
        this.objects.velocities = [];
        this.objects.rippleData = [];
        const dummy = new THREE.Object3D();
        for (let i = 0; i < this.config.rainCount; i++) {
            dummy.position.set((Math.random() - 0.5) * 40, Math.random() * 20, (Math.random() - 0.5) * 40);
            dummy.updateMatrix();
            this.objects.rain.setMatrixAt(i, dummy.matrix);
            this.objects.velocities.push(new THREE.Vector3(0, -this.config.fallSpeed - Math.random() * 5, 0));
        }
        for (let i = 0; i < 100; i++) {
            this.objects.rippleData.push({ time: 1000 });
        }
    },

    update(clock, mouse, camera) {
        if (!this.objects.rain || !this.renderer) return;

        // --- 1. Render Collision Map ---
        this.scene.overrideMaterial = this.objects.positionMaterial;
        this.renderer.setRenderTarget(this.objects.collisionRT);
        this.renderer.clear();
        this.renderer.render(this.scene, this.objects.collisionCamera);
        this.renderer.readRenderTargetPixels(this.objects.collisionRT, 0, 0, 256, 256, this.objects.pixelBuffer);
        this.renderer.setRenderTarget(null);
        this.scene.overrideMaterial = null;

        // --- 2. Update Rain and Check for Collisions ---
        const dummy = new THREE.Object3D();
        const delta = 1 / 60; // Assume 60fps for consistent speed

        for (let i = 0; i < this.config.rainCount; i++) {
            this.objects.rain.getMatrixAt(i, dummy.matrix);
            dummy.position.addScaledVector(this.objects.velocities[i], delta);

            const u = Math.floor(((dummy.position.x + 20) / 40) * 256);
            const v = Math.floor(((dummy.position.z + 20) / 40) * 256);
            const pixelIndex = (v * 256 + u) * 4;

            if (pixelIndex >= 0 && pixelIndex < this.objects.pixelBuffer.length) {
                const hitHeight = this.objects.pixelBuffer[pixelIndex + 1];

                if (dummy.position.y < hitHeight) {
                    this.triggerRipple(new THREE.Vector3(dummy.position.x, hitHeight + 0.01, dummy.position.z));
                    dummy.position.x = (Math.random() - 0.5) * 40; // Reset with random X/Z
                    dummy.position.y = 20;
                    dummy.position.z = (Math.random() - 0.5) * 40;
                }
            } else if (dummy.position.y < -5) {
                dummy.position.y = 20;
            }

            dummy.updateMatrix();
            this.objects.rain.setMatrixAt(i, dummy.matrix);
        }
        this.objects.rain.instanceMatrix.needsUpdate = true;

        // --- 3. Animate Ripples ---
        const rippleDummy = new THREE.Object3D();
        this.objects.rippleData.forEach((data, i) => {
            if (data.time < this.config.rippleSize) {
                data.time += delta * this.config.rippleSpeed;
                rippleDummy.position.copy(data.position);
                rippleDummy.scale.setScalar(data.time);
                rippleDummy.updateMatrix();
                this.objects.ripples.setMatrixAt(i, rippleDummy.matrix);
            }
        });
        this.objects.ripples.instanceMatrix.needsUpdate = true;
        
        // --- 4. Animate Camera ---
        const time = clock.getElapsedTime() * 0.2;
        camera.position.set(Math.cos(time) * 20, 15, Math.sin(time) * 20);
        camera.lookAt(0, 0, 0);
    },

    triggerRipple(position) {
        if (!this.objects.ripples) return;
        const index = this.objects.nextRippleIndex || 0;
        this.objects.rippleData[index] = { time: 0, position: position };
        this.objects.nextRippleIndex = (index + 1) % 100;
    },

    destroy() {
        if (!this.scene) return;
        this.scene.traverse(child => {
            if (child.isMesh || child.isPoints || child.isInstancedMesh) {
                child.geometry.dispose();
                if (child.material) {
                    if(Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            }
        });
        this.objects.collisionRT?.dispose();
        this.scene.clear();
        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            <h3>Rain</h3>
            ${createSlider('rainCount', 'Count', 500, 10000, this.config.rainCount, '100')}
            ${createSlider('fallSpeed', 'Fall Speed', 5, 50, this.config.fallSpeed, '1')}
            ${createSlider('rainSize', 'Drop Size', 0.2, 2, this.config.rainSize, '0.1')}
            ${createColorPicker('rainColor', 'Color', this.config.rainColor)}
            <h3>Ripples</h3>
            ${createSlider('rippleSpeed', 'Speed', 1, 20, this.config.rippleSpeed, '0.5')}
            ${createSlider('rippleSize', 'Max Size', 1, 10, this.config.rippleSize, '0.1')}
            ${createColorPicker('rippleColor', 'Color', this.config.rippleColor)}
            <h3>Object</h3>
            ${createSlider('boxHeight', 'Box Height', 0.5, 10, this.config.boxHeight, '0.1')}
        `;

        addSliderListeners(this.config, (event) => {
            if (event && (event.target.id === 'rainCount' || event.target.id === 'fallSpeed')) {
                this.destroy();
                this.init(this.scene, this.renderer);
            }
        });
        
        addColorListeners(this.config, (key, value) => {
            if (key === 'rainColor' && this.objects.rain) this.objects.rain.material.color.set(value);
            if (key === 'rippleColor' && this.objects.ripples) this.objects.ripples.material.color.set(value);
        });

        // Add direct listeners for properties that can be updated in real-time
        document.getElementById('boxHeight').addEventListener('input', (e) => {
            this.config.boxHeight = parseFloat(e.target.value);
            if (this.objects.box) {
                this.objects.box.scale.y = this.config.boxHeight;
                this.objects.box.position.y = this.config.boxHeight / 2;
            }
        });
         document.getElementById('rainSize').addEventListener('input', (e) => {
            this.config.rainSize = parseFloat(e.target.value);
             if (this.objects.rain) {
                this.objects.rain.geometry.dispose();
                this.objects.rain.geometry = new THREE.CylinderGeometry(0.02, 0.02, this.config.rainSize, 5);
             }
        });
    }
};
