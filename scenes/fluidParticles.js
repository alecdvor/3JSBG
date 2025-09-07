import * as THREE from 'three';
import { createSlider, addSliderListeners, createColorPicker, addColorListeners } from '../utils.js';

export const fluidParticles = {
    title: "Fluid Particles",
    scene: null,

    config: {
        particleCount: 2000,
        particleSize: 0.1,
        particleColor: '#80deea',
        viscosity: 0.01,
        gravity: -0.0001,
        mouseInfluence: 0.1,
        bounds: 4,
    },

    objects: {},

    init(scene) {
        this.scene = scene;
        
        this.objects.raycaster = new THREE.Raycaster();
        this.objects.mousePosition3D = new THREE.Vector3();
        
        // Invisible sphere for mouse raycasting
        this.objects.interactionSphere = new THREE.Mesh(
            new THREE.SphereGeometry(this.config.bounds, 32, 32),
            new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
        );
        this.scene.add(this.objects.interactionSphere);
        
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
        const velocities = new Float32Array(this.config.particleCount * 3);

        for (let i = 0; i < this.config.particleCount; i++) {
            const i3 = i * 3;
            const pos = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * this.config.bounds * 0.9);
            positions[i3] = pos.x;
            positions[i3 + 1] = pos.y;
            positions[i3 + 2] = pos.z;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        const sprite = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png');
        this.objects.material = new THREE.PointsMaterial({
            size: this.config.particleSize,
            map: sprite,
            color: this.config.particleColor,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
        });

        this.objects.particles = new THREE.Points(geometry, this.objects.material);
        this.scene.add(this.objects.particles);
    },

    update(clock, mouse, camera) {
        if (!this.objects.particles) return;

        // Update mouse position
        this.objects.raycaster.setFromCamera(mouse, camera);
        const intersects = this.objects.raycaster.intersectObject(this.objects.interactionSphere);
        if (intersects.length > 0) {
            this.objects.mousePosition3D.copy(intersects[0].point);
        }

        const positions = this.objects.particles.geometry.attributes.position.array;
        const velocities = this.objects.particles.geometry.attributes.velocity.array;
        
        const particlePos = new THREE.Vector3();
        const force = new THREE.Vector3();

        for (let i = 0; i < this.config.particleCount; i++) {
            const i3 = i * 3;
            particlePos.fromArray(positions, i3);
            
            // --- Physics ---
            // Mouse interaction
            force.subVectors(this.objects.mousePosition3D, particlePos);
            const dist = force.length();
            if (dist < 2) {
                force.multiplyScalar((1 - dist / 2) * this.config.mouseInfluence);
                velocities[i3] += force.x;
                velocities[i3 + 1] += force.y;
                velocities[i3 + 2] += force.z;
            }
            
            // Gravity towards the center
            force.copy(particlePos).normalize().multiplyScalar(this.config.gravity);
            velocities[i3] += force.x;
            velocities[i3 + 1] += force.y;
            velocities[i3 + 2] += force.z;
            
            // Update position
            positions[i3] += velocities[i3];
            positions[i3 + 1] += velocities[i3 + 1];
            positions[i3 + 2] += velocities[i3 + 2];

            // Apply viscosity (drag)
            velocities[i3] *= (1 - this.config.viscosity);
            velocities[i3 + 1] *= (1 - this.config.viscosity);
            velocities[i3 + 2] *= (1 - this.config.viscosity);

            // Boundary condition (contain within a sphere)
            const len = particlePos.length();
            if (len > this.config.bounds) {
                particlePos.normalize().multiplyScalar(this.config.bounds);
                positions[i3] = particlePos.x;
                positions[i3 + 1] = particlePos.y;
                positions[i3 + 2] = particlePos.z;
            }
        }
        this.objects.particles.geometry.attributes.position.needsUpdate = true;
    },

    destroy() {
        if (!this.scene) return;
        this.scene.remove(this.objects.particles);
        this.scene.remove(this.objects.interactionSphere);
        this.objects.particles?.geometry.dispose();
        this.objects.particles?.material.map?.dispose();
        this.objects.particles?.material.dispose();
        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            <h3>Simulation</h3>
            ${createSlider('particleCount', 'Count', 1000, 10000, this.config.particleCount, '100')}
            ${createSlider('gravity', 'Gravity', -0.001, 0, this.config.gravity, '0.00001')}
            ${createSlider('viscosity', 'Viscosity', 0.001, 0.1, this.config.viscosity, '0.001')}
            <h3>Appearance</h3>
            ${createSlider('particleSize', 'Size', 0.02, 0.5, this.config.particleSize, '0.01')}
            ${createColorPicker('particleColor', 'Color', this.config.particleColor)}
            <h3>Interaction</h3>
            ${createSlider('mouseInfluence', 'Strength', 0.01, 0.3, this.config.mouseInfluence, '0.01')}
        `;

        addSliderListeners(this.config, (event) => {
            if (event && event.target.id === 'particleCount') {
                this.regenerateParticles();
            }
        });
        
        addColorListeners(this.config, (key, value) => {
            if (key === 'particleColor' && this.objects.material) {
                this.objects.material.color.set(value);
            }
        });

        document.getElementById('particleSize').addEventListener('input', (e) => {
            this.config.particleSize = parseFloat(e.target.value);
            if (this.objects.material) this.objects.material.size = this.config.particleSize;
        });
    }
};
