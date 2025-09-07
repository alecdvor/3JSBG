import * as THREE from 'three';
import { createSlider, addSliderListeners, createColorPicker, addColorListeners } from '../utils.js';

export const gravityParticles = {
    title: "Gravity Particles",
    scene: null,

    config: {
        particleCount: 20000,
        particleSize: 0.2,
        particleColor: '#ffffff',
        gravity: -0.001,
        bounce: 0.8,
        friction: 0.98,
        mouseRepelRadius: 4,
        mouseRepelStrength: 0.2,
    },

    objects: {},

    init(scene) {
        this.scene = scene;
        
        // --- Invisible Plane for Mouse Interaction ---
        // This plane is used by the raycaster to determine the 3D position of the mouse.
        this.objects.interactionPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
        );
        this.objects.interactionPlane.rotation.x = -Math.PI / 2;
        this.scene.add(this.objects.interactionPlane);
        
        this.objects.raycaster = new THREE.Raycaster();
        this.objects.mousePosition3D = new THREE.Vector3();

        this.regenerateParticles();
    },

    regenerateParticles() {
        if (this.objects.particles) {
            this.scene.remove(this.objects.particles);
            this.objects.particles.geometry.dispose();
            this.objects.particles.material.map?.dispose();
            this.objects.particles.material.dispose();
        }

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.config.particleCount * 3);
        const velocities = new Float32Array(this.config.particleCount * 3);

        const amount = Math.sqrt(this.config.particleCount);
        const separation = 0.2;
        const offset = (amount / 2) * separation;

        for (let i = 0; i < this.config.particleCount; i++) {
            const i3 = i * 3;
            
            // Arrange particles in a grid, similar to the example
            const x = (i % amount) * separation - offset;
            const z = Math.floor(i / amount) * separation - offset;

            positions[i3] = x;
            positions[i3 + 1] = Math.random() * 5 + 2; // Start above the floor
            positions[i3 + 2] = z;

            velocities[i3] = 0;
            velocities[i3 + 1] = 0;
            velocities[i3 + 2] = 0;
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
        this.objects.particles.frustumCulled = false;
        this.scene.add(this.objects.particles);
    },

    update(clock, mouse, camera) {
        if (!this.objects.particles) return;

        // --- Update Mouse Position in 3D ---
        this.objects.raycaster.setFromCamera(mouse, camera);
        const intersects = this.objects.raycaster.intersectObject(this.objects.interactionPlane);
        if (intersects.length > 0) {
            this.objects.mousePosition3D.copy(intersects[0].point);
        }

        // --- Physics Simulation (on the CPU) ---
        const positions = this.objects.particles.geometry.attributes.position.array;
        const velocities = this.objects.particles.geometry.attributes.velocity.array;
        const particlePosition = new THREE.Vector3();
        const repelDirection = new THREE.Vector3();

        for (let i = 0; i < this.config.particleCount; i++) {
            const i3 = i * 3;
            
            // Mouse Repulsion
            particlePosition.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
            const dist = particlePosition.distanceTo(this.objects.mousePosition3D);
            if (dist < this.config.mouseRepelRadius) {
                const repelForce = (1 - dist / this.config.mouseRepelRadius) * this.config.mouseRepelStrength;
                repelDirection.subVectors(particlePosition, this.objects.mousePosition3D).normalize();
                
                velocities[i3] += repelDirection.x * repelForce;
                velocities[i3 + 1] += repelDirection.y * repelForce;
                velocities[i3 + 2] += repelDirection.z * repelForce;
            }

            // Apply gravity
            velocities[i3 + 1] += this.config.gravity;

            // Update position
            positions[i3] += velocities[i3];
            positions[i3 + 1] += velocities[i3 + 1];
            positions[i3 + 2] += velocities[i3 + 2];
            
            // Apply friction
            velocities[i3] *= this.config.friction;
            velocities[i3 + 1] *= this.config.friction;
            velocities[i3 + 2] *= this.config.friction;

            // Floor bounce
            if (positions[i3 + 1] < 0) {
                positions[i3 + 1] = 0;
                velocities[i3 + 1] *= -this.config.bounce;
                // Floor friction
                velocities[i3] *= 0.9;
                velocities[i3 + 2] *= 0.9;
            }
        }
        
        this.objects.particles.geometry.attributes.position.needsUpdate = true;
    },

    destroy() {
        if (!this.scene) return;
        this.scene.remove(this.objects.particles);
        this.scene.remove(this.objects.interactionPlane);
        this.objects.particles?.geometry.dispose();
        this.objects.particles?.material.map?.dispose();
        this.objects.particles?.material.dispose();
        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            <h3>Simulation</h3>
            ${createSlider('particleCount', 'Count', 1000, 50000, this.config.particleCount, '1000')}
            ${createSlider('gravity', 'Gravity', -0.01, 0, '0.0001')}
            ${createSlider('bounce', 'Bounce', 0.1, 1, this.config.bounce, '0.01')}
            ${createSlider('friction', 'Air Friction', 0.9, 1, this.config.friction, '0.001')}
            <h3>Appearance</h3>
            ${createSlider('particleSize', 'Size', 0.05, 1, this.config.particleSize, '0.01')}
            ${createColorPicker('particleColor', 'Color', this.config.particleColor)}
            <h3>Interaction</h3>
            ${createSlider('mouseRepelRadius', 'Radius', 1, 10, this.config.mouseRepelRadius, '0.1')}
            ${createSlider('mouseRepelStrength', 'Strength', 0.01, 0.5, this.config.mouseRepelStrength, '0.01')}
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
