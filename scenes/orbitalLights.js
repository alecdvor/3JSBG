import * as THREE from 'three'; // Make sure this path points to the webgpu version
import { color, lights } from 'three/tsl'; // You need to import from the TSL module

// 1. Define the Custom Lighting Model (from the example)
// This class tells the node material how to calculate the final color from the lights.
class CustomLightingModel extends THREE.LightingModel {
    direct({ lightColor, reflectedLight }) {
        // This is the core logic: it simply adds the light's color
        // to the diffuse color of the point.
        reflectedLight.directDiffuse.addAssign(lightColor);
    }
}

export const orbitalLights = {
    title: "Orbital Lights",
    scene: null,

    config: {
        particleCount: 500000, // Increased to match the example
        cloudRadius: 1.5,
        lightSpeed: 0.2,
        light1Color: '#ffaa00',
        light2Color: '#0040ff',
        light3Color: '#80ff80',
    },

    objects: {},

    init(scene) {
        this.scene = scene;
        this.scene.background = new THREE.Color(0x000000);

        // --- Lights ---
        // We create helper meshes to visualize the light positions, just like the example.
        const sphereGeometry = new THREE.SphereGeometry(0.02, 16, 8);

        const addLight = (hexColor) => {
            const material = new THREE.NodeMaterial();
            material.colorNode = color(hexColor);
            material.lightsNode = lights(); // This light's mesh ignores other scene lights

            const mesh = new THREE.Mesh(sphereGeometry, material);
            const light = new THREE.PointLight(hexColor, 0.1, 1); // Intensity and distance can be adjusted
            light.add(mesh);
            this.scene.add(light);
            return light;
        };

        this.objects.light1 = addLight(this.config.light1Color);
        this.objects.light2 = addLight(this.config.light2Color);
        this.objects.light3 = addLight(this.config.light3Color);

        this.regenerateParticles();
    },

    regenerateParticles() {
        if (this.objects.particles) {
            this.scene.remove(this.objects.particles);
            this.objects.particles.geometry.dispose();
            this.objects.particles.material.dispose();
        }

        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const cloudRadius = this.config.cloudRadius;

        for (let i = 0; i < this.config.particleCount; i++) {
            const point = new THREE.Vector3().random().subScalar(0.5).multiplyScalar(cloudRadius * 2);
            positions.push(point);
        }
        geometry.setFromPoints(positions);

        // --- NEW: PointsNodeMaterial Setup ---
        // This replaces your entire ShaderMaterial block.
        this.objects.material = new THREE.PointsNodeMaterial();

        // Create a special node that references our three specific lights.
        const allLightsNode = lights([this.objects.light1, this.objects.light2, this.objects.light3]);

        // Instantiate our custom lighting logic.
        const lightingModel = new CustomLightingModel();

        // Combine the lights with our custom logic.
        const lightingModelContext = allLightsNode.context({ lightingModel });

        // Assign the result to the material's lightsNode.
        this.objects.material.lightsNode = lightingModelContext;
        
        // This material doesn't need custom uniforms for size, it has a built-in property
        this.objects.material.sizeNode = 1.5; // You can still make this configurable

        this.objects.particles = new THREE.Points(geometry, this.objects.material);
        this.scene.add(this.objects.particles);
    },

    update(clock) {
        if (!this.objects.light1) return;

        const time = clock.getElapsedTime() * this.config.lightSpeed;
        const scale = 0.5;

        // Animate lights (this logic is similar)
        this.objects.light1.position.set(Math.sin(time * 0.7) * scale, Math.cos(time * 0.5) * scale, Math.cos(time * 0.3) * scale);
        this.objects.light2.position.set(Math.cos(time * 0.3) * scale, Math.sin(time * 0.5) * scale, Math.sin(time * 0.7) * scale);
        this.objects.light3.position.set(Math.sin(time * 0.7) * scale, Math.cos(time * 0.3) * scale, Math.sin(time * 0.5) * scale);

        // NO MORE UNIFORM UPDATES!
        // The NodeMaterial system automatically tracks the light positions for you. ✨

        // Gently rotate the whole scene
        this.scene.rotation.y = time * 0.1;
    },

    destroy() {
        // ... your destroy code is fine ...
    },

    createControls() {
        // ... your controls code will need slight modifications to update
        // the PointLight colors instead of shader uniforms ...
    }
};
