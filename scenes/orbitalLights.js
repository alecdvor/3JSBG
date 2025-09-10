import * as THREE from 'three';
import { createSlider, createColorPicker, addSliderListeners, addColorListeners } from '../utils.js';

export const orbitalLights = {
    title: "Orbital Lights",
    scene: null,

    config: {
        particleCount: 200000, // Lowered for better performance
        particleSize: 1.5,
        cloudRadius: 1.5,
        lightSpeed: 0.2,
        intensity: 0.5, // Added intensity to config
        light1Color: '#ffaa00',
        light2Color: '#0040ff',
        light3Color: '#80ff80',
    },

    objects: {},

    init(scene, renderer) {
        this.scene = scene;
        this.scene.background = new THREE.Color(0x000000);

        this.objects.light1 = new THREE.Object3D();
        this.scene.add(this.objects.light1);
        this.objects.light2 = new THREE.Object3D();
        this.scene.add(this.objects.light2);
        this.objects.light3 = new THREE.Object3D();
        this.scene.add(this.objects.light3);

        this.regenerateParticles();
    },

    regenerateParticles() {
        if (this.objects.particles) {
            this.scene.remove(this.objects.particles);
            this.objects.particles.geometry.dispose();
            this.objects.particles.material.dispose();
        }

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.config.particleCount * 3);

        for (let i = 0; i < this.config.particleCount; i++) {
            const i3 = i * 3;
            const pos = new THREE.Vector3().random().subScalar(0.5).multiplyScalar(this.config.cloudRadius * 2);
            positions[i3] = pos.x;
            positions[i3 + 1] = pos.y;
            positions[i3 + 2] = pos.z;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uSize: { value: this.config.particleSize },
                uIntensity: { value: this.config.intensity },
                uLight1Pos: { value: new THREE.Vector3() },
                uLight1Color: { value: new THREE.Color(this.config.light1Color) },
                uLight2Pos: { value: new THREE.Vector3() },
                uLight2Color: { value: new THREE.Color(this.config.light2Color) },
                uLight3Pos: { value: new THREE.Vector3() },
                uLight3Color: { value: new THREE.Color(this.config.light3Color) },
            },
            vertexShader: `
                uniform float uSize;
                uniform float uIntensity;
                uniform vec3 uLight1Pos;
                uniform vec3 uLight1Color;
                uniform vec3 uLight2Pos;
                uniform vec3 uLight2Color;
                uniform vec3 uLight3Pos;
                uniform vec3 uLight3Color;

                varying vec3 vColor;

                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = uSize * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;

                    float dist1 = distance(position, uLight1Pos);
                    float dist2 = distance(position, uLight2Pos);
                    float dist3 = distance(position, uLight3Pos);

                    // UPDATED, smoother lighting falloff formula
                    vec3 color1 = uIntensity * uLight1Color / (1.0 + dist1 * dist1);
                    vec3 color2 = uIntensity * uLight2Color / (1.0 + dist2 * dist2);
                    vec3 color3 = uIntensity * uLight3Color / (1.0 + dist3 * dist3);

                    vColor = color1 + color2 + color3;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                void main() {
                    if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
                    gl_FragColor = vec4(vColor, 1.0);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
        });

        this.objects.particles = new THREE.Points(geometry, material);
        this.scene.add(this.objects.particles);
    },

    update(clock, mouse, camera) {
        if (!this.objects.particles) return;

        const time = clock.getElapsedTime() * this.config.lightSpeed;
        const scale = 0.5;

        this.objects.light1.position.set(Math.sin(time * 0.7) * scale, Math.cos(time * 0.5) * scale, Math.cos(time * 0.3) * scale);
        this.objects.light2.position.set(Math.cos(time * 0.3) * scale, Math.sin(time * 0.5) * scale, Math.sin(time * 0.7) * scale);
        this.objects.light3.position.set(Math.sin(time * 0.7) * scale, Math.cos(time * 0.3) * scale, Math.sin(time * 0.5) * scale);

        const material = this.objects.particles.material;
        material.uniforms.uLight1Pos.value.copy(this.objects.light1.position);
        material.uniforms.uLight2Pos.value.copy(this.objects.light2.position);
        material.uniforms.uLight3Pos.value.copy(this.objects.light3.position);

        this.scene.rotation.y = time * 0.1;
    },

    destroy() {
        if (!this.scene) return;
        this.scene.traverse(child => {
            if (child.isPoints) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
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
            ${createSlider('intensity', 'Intensity', 0, 2, this.config.intensity, '0.01')}
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
            if (!this.objects.particles) return;
            const material = this.objects.particles.material;
            if (key === 'light1Color') material.uniforms.uLight1Color.value.set(value);
            if (key === 'light2Color') material.uniforms.uLight2Color.value.set(value);
            if (key === 'light3Color') material.uniforms.uLight3Color.value.set(value);
        });
        
        document.getElementById('particleSize').addEventListener('input', (e) => {
            this.config.particleSize = parseFloat(e.target.value);
            if (this.objects.particles) this.objects.particles.material.uniforms.uSize.value = this.config.particleSize;
        });

        // Add event listener for the new intensity slider
        document.getElementById('intensity').addEventListener('input', (e) => {
            this.config.intensity = parseFloat(e.target.value);
            if (this.objects.particles) this.objects.particles.material.uniforms.uIntensity.value = this.config.intensity;
        });
    }
};
