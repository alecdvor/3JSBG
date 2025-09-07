import * as THREE from 'three';
import { createSlider, addSliderListeners, createColorPicker, addColorListeners } from '../utils.js';

export const rainyDay3D = {
    title: "3D Rainy Day",
    scene: null,

    config: {
        rainCount: 2000,
        fallSpeed: 15,
        rainSize: 0.8,
        rippleSpeed: 8,
        rippleSize: 3,
        rainColor: '#aaddff',
        rippleColor: '#ffffff',
        boxHeight: 2,
    },

    objects: {},

    init(scene, renderer) {
        this.scene = scene;
        this.scene.fog = new THREE.Fog(0x000000, 10, 50);

        // --- Collision Detection Setup ---
        // We render the scene from a top-down view to a texture.
        // The color of each pixel in the texture will store the 3D world position of the surface below it.
        this.objects.collisionCamera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 40);
        this.objects.collisionCamera.position.y = 20;
        this.objects.collisionCamera.lookAt(0, 0, 0);

        this.objects.collisionRT = new THREE.WebGLRenderTarget(512, 512, {
            type: THREE.FloatType,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
        });

        // This special material encodes world position into the RGBA color channels.
        this.objects.positionMaterial = new THREE.ShaderMaterial({
            vertexShader: `varying vec3 vWorldPosition; void main() { vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `varying vec3 vWorldPosition; void main() { gl_FragColor = vec4(vWorldPosition, 1.0); }`
        });

        // --- Rain Particles (as 3D meshes) ---
        const rainGeo = new THREE.CapsuleGeometry(0.03, 0.5, 4, 8);
        const rainMat = new THREE.MeshBasicMaterial({ color: this.config.rainColor });
        this.objects.rain = new THREE.InstancedMesh(rainGeo, rainMat, this.config.rainCount);
        this.scene.add(this.objects.rain);

        // --- Ripples (with a custom shader) ---
        const rippleGeo = new THREE.PlaneGeometry(1, 1);
        const rippleMat = new THREE.ShaderMaterial({
            transparent: true,
            uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(this.config.rippleColor) } },
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColor;
                varying vec2 vUv;
                void main() {
                    float dist = distance(vUv, vec2(0.5));
                    float wave = sin(dist * 20.0 - uTime * 20.0);
                    float strength = smoothstep(0.5, 0.0, dist);
                    gl_FragColor = vec4(uColor, wave * strength);
                }
            `,
        });
        this.objects.ripples = new THREE.InstancedMesh(rippleGeo, rippleMat, 50); // Pool of 50 ripples
        this.scene.add(this.objects.ripples);
        
        // --- Scene Objects for Collision ---
        this.objects.floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
        this.objects.floor.rotation.x = -Math.PI / 2;
        this.scene.add(this.objects.floor);
        
        this.objects.box = new THREE.Mesh(new THREE.BoxGeometry(5, this.config.boxHeight, 5), new THREE.MeshStandardMaterial({ color: 0x444444 }));
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
        const dummy = new THREE.Object3D();
        for (let i = 0; i < this.config.rainCount; i++) {
            dummy.position.set((Math.random() - 0.5) * 40, Math.random() * 20, (Math.random() - 0.5) * 40);
            dummy.updateMatrix();
            this.objects.rain.setMatrixAt(i, dummy.matrix);
            this.objects.velocities.push(new THREE.Vector3(0, -this.config.fallSpeed - Math.random() * 5, 0));
        }
    },

    update(clock, mouse, camera, renderer) {
        if (!this.objects.rain) return;

        // --- 1. Render Collision Map ---
        this.scene.overrideMaterial = this.objects.positionMaterial;
        renderer.setRenderTarget(this.objects.collisionRT);
        renderer.clear();
        renderer.render(this.scene, this.objects.collisionCamera);
        renderer.setRenderTarget(null);
        this.scene.overrideMaterial = null;

        // --- 2. Update Rain and Check for Collisions ---
        const dummy = new THREE.Object3D();
        const pixelBuffer = new Float32Array(4);

        for (let i = 0; i < this.config.rainCount; i++) {
            this.objects.rain.getMatrixAt(i, dummy.matrix);
            dummy.position.addScaledVector(this.objects.velocities[i], 1 / 60);

            // Calculate where the raindrop is on our collision texture
            const u = (dummy.position.x + 20) / 40;
            const v = (dummy.position.z + 20) / 40;

            if (u > 0 && u < 1 && v > 0 && v < 1) {
                renderer.readRenderTargetPixels(this.objects.collisionRT, u * 512, v * 512, 1, 1, pixelBuffer);
                const hitHeight = pixelBuffer[1];

                if (dummy.position.y < hitHeight) {
                    this.triggerRipple(new THREE.Vector3(dummy.position.x, hitHeight + 0.01, dummy.position.z));
                    dummy.position.y = 20; // Reset to top
                }
            } else if (dummy.position.y < -5) {
                dummy.position.y = 20; // Reset if it goes way off screen
            }

            dummy.updateMatrix();
            this.objects.rain.setMatrixAt(i, dummy.matrix);
        }
        this.objects.rain.instanceMatrix.needsUpdate = true;

        // --- 3. Animate Ripples ---
        this.objects.ripples.material.uniforms.uTime.value = clock.getElapsedTime();

        // --- 4. Animate Camera ---
        const time = clock.getElapsedTime() * 0.2;
        camera.position.set(Math.cos(time) * 20, 15, Math.sin(time) * 20);
        camera.lookAt(0, 0, 0);
    },

    triggerRipple(position) {
        if (!this.objects.ripples) return;
        const dummy = new THREE.Object3D();
        const index = this.objects.nextRippleIndex || 0;
        
        dummy.position.copy(position);
        dummy.scale.set(this.config.rippleSize, this.config.rippleSize, this.config.rippleSize);
        dummy.updateMatrix();
        this.objects.ripples.setMatrixAt(index, dummy.matrix);
        this.objects.ripples.instanceMatrix.needsUpdate = true;
        
        this.objects.nextRippleIndex = (index + 1) % 50;
    },

    destroy() {
        if (!this.scene) return;
        this.scene.traverse(child => {
            if (child.isMesh || child.isPoints) {
                child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
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
            if (event && ['rainCount'].includes(event.target.id)) {
                this.destroy();
                this.init(this.scene, this.renderer);
            }
        });

        addColorListeners(this.config, (key, value) => {
            if (key === 'rainColor' && this.objects.rain) this.objects.rain.material.color.set(value);
            if (key === 'rippleColor' && this.objects.ripples) this.objects.ripples.material.uniforms.uColor.value.set(value);
        });

        // Add direct listeners for properties that can be updated in real-time
        document.getElementById('boxHeight').addEventListener('input', (e) => {
            this.config.boxHeight = parseFloat(e.target.value);
            if (this.objects.box) {
                this.objects.box.scale.y = this.config.boxHeight;
                this.objects.box.position.y = this.config.boxHeight / 2;
            }
        });
    }
};
