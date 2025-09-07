import * as THREE from 'three';
import { createSlider, addSliderListeners, createColorPicker, addColorListeners } from '../utils.js';

export const rainyDay = {
    title: "Rainy Day",
    scene: null,

    config: {
        rainCount: 5000,
        fallSpeed: 10,
        rainHeight: 20,
        rippleSpeed: 5,
        rippleSize: 2,
        rainColor: '#ffffff',
        rippleColor: '#ffffff',
    },

    objects: {},

    init(scene) {
        this.scene = scene;
        this.scene.fog = new THREE.Fog(0x000000, 1, 30);

        // --- Rain Particles ---
        this.objects.rainGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.config.rainCount * 3);
        const velocities = new Float32Array(this.config.rainCount * 3);

        for (let i = 0; i < this.config.rainCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 40;
            positions[i3 + 1] = Math.random() * this.config.rainHeight;
            positions[i3 + 2] = (Math.random() - 0.5) * 40;
            velocities[i3 + 1] = -this.config.fallSpeed - (Math.random() * 5);
        }
        this.objects.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.objects.rainGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        this.objects.rainMaterial = new THREE.PointsMaterial({
            color: this.config.rainColor,
            size: 0.1,
            transparent: true,
            opacity: 0.7
        });
        this.objects.rain = new THREE.Points(this.objects.rainGeometry, this.objects.rainMaterial);
        this.scene.add(this.objects.rain);

        // --- Ripple Effect ---
        this.objects.ripples = [];
        const rippleGeo = new THREE.RingGeometry(0.1, 0.2, 32);
        const rippleMat = new THREE.MeshBasicMaterial({
            color: this.config.rippleColor,
            side: THREE.DoubleSide,
            transparent: true,
        });

        for (let i = 0; i < 50; i++) { // Pool of 50 ripple objects
            const ripple = new THREE.Mesh(rippleGeo, rippleMat.clone());
            ripple.rotation.x = -Math.PI / 2;
            ripple.visible = false;
            this.scene.add(ripple);
            this.objects.ripples.push(ripple);
        }
        this.objects.nextRippleIndex = 0;
        
        // --- Floor ---
        this.objects.floor = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, metalness: 0.2 })
        );
        this.objects.floor.rotation.x = -Math.PI / 2;
        this.scene.add(this.objects.floor);

        // --- Lighting ---
        this.objects.ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(this.objects.ambientLight);
        this.objects.pointLight = new THREE.PointLight(0x80d8ff, 2, 50);
        this.objects.pointLight.position.set(0, 15, 0);
        this.scene.add(this.objects.pointLight);
    },

    update(clock, mouse, camera) {
        if (!this.objects.rain) return;

        // Set a fixed, angled camera for this scene
        camera.position.set(15, 15, 15);
        camera.lookAt(0, 0, 0);

        const positions = this.objects.rainGeometry.attributes.position.array;
        const velocities = this.objects.rainGeometry.attributes.velocity.array;

        for (let i = 0; i < this.config.rainCount; i++) {
            const i3 = i * 3;
            positions[i3 + 1] += velocities[i3 + 1] * (1/60); // Apply velocity based on a 60fps frame delta

            // If rain hits the floor (y=0)
            if (positions[i3 + 1] < 0) {
                this.triggerRipple(new THREE.Vector3(positions[i3], 0, positions[i3 + 2]));
                // Reset rain to the top
                positions[i3 + 1] = this.config.rainHeight;
            }
        }
        this.objects.rainGeometry.attributes.position.needsUpdate = true;

        // Animate ripples
        this.objects.ripples.forEach(ripple => {
            if (ripple.visible) {
                ripple.scale.x += this.config.rippleSpeed * (1/60);
                ripple.scale.y += this.config.rippleSpeed * (1/60);
                ripple.material.opacity = 1.0 - (ripple.scale.x / this.config.rippleSize);

                if (ripple.material.opacity <= 0) {
                    ripple.visible = false;
                }
            }
        });
    },

    triggerRipple(position) {
        const ripple = this.objects.ripples[this.objects.nextRippleIndex];
        ripple.position.copy(position);
        ripple.scale.set(0.1, 0.1, 0.1);
        ripple.material.opacity = 1.0;
        ripple.visible = true;
        this.objects.nextRippleIndex = (this.objects.nextRippleIndex + 1) % this.objects.ripples.length;
    },

    destroy() {
        if (!this.scene) return;
        this.scene.traverse(child => {
            if (child.isMesh || child.isPoints) {
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
            <h3>Rain</h3>
            ${createSlider('rainCount', 'Count', 1000, 15000, this.config.rainCount, '500')}
            ${createSlider('fallSpeed', 'Fall Speed', 1, 30, this.config.fallSpeed, '0.5')}
            ${createSlider('rainHeight', 'Rain Height', 10, 50, this.config.rainHeight, '1')}
            ${createColorPicker('rainColor', 'Color', this.config.rainColor)}
            <h3>Ripples</h3>
            ${createSlider('rippleSpeed', 'Speed', 1, 15, this.config.rippleSpeed, '0.5')}
            ${createSlider('rippleSize', 'Max Size', 1, 5, this.config.rippleSize, '0.1')}
            ${createColorPicker('rippleColor', 'Color', this.config.rippleColor)}
        `;

        addSliderListeners(this.config, (event) => {
            if (event && event.target.id === 'rainCount') {
                this.destroy();
                this.init(this.scene);
            } else if (event) {
                this.destroy(); // A simple way to apply speed changes is to just restart
                this.init(this.scene);
            }
        });
        
        addColorListeners(this.config, (key, value) => {
            if (key === 'rainColor' && this.objects.rainMaterial) {
                this.objects.rainMaterial.color.set(value);
            }
            if (key === 'rippleColor' && this.objects.ripples) {
                this.objects.ripples.forEach(r => r.material.color.set(value));
            }
        });
    }
};
