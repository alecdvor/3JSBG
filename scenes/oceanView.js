import * as THREE from 'three';
// --- Import Addons from a CDN ---
import { Water } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/objects/Water.js';
import { Sky } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/objects/Sky.js';
import { createSlider, createColorPicker, addSliderListeners, addColorListeners } from '../utils.js';

export const oceanView = {
    title: "Ocean View",
    scene: null,
    pmremGenerator: null, // For sky environment mapping

    config: {
        distortionScale: 3.7,
        waveSize: 1.0,
        waterColor: '#001e0f',
        sunElevation: 4,
        sunAzimuth: 180,
        skyTurbidity: 10,
        skyRayleigh: 2,
    },

    objects: {},

    init(scene, renderer) { // This scene needs the renderer for the PMREMGenerator
        this.scene = scene;
        this.pmremGenerator = new THREE.PMREMGenerator(renderer);

        // --- Sun Vector ---
        this.objects.sun = new THREE.Vector3();

        // --- Water ---
        const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
        const waterNormals = new THREE.TextureLoader().load(
            'https://threejs.org/examples/textures/waternormals.jpg', 
            (texture) => { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; }
        );
        
        this.objects.water = new Water(waterGeometry, {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: waterNormals,
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: this.config.waterColor,
            distortionScale: this.config.distortionScale,
            fog: scene.fog !== undefined
        });
        this.objects.water.rotation.x = -Math.PI / 2;
        this.scene.add(this.objects.water);
        this.objects.water.material.uniforms['size'].value = this.config.waveSize;

        // --- Sky ---
        this.objects.sky = new Sky();
        this.objects.sky.scale.setScalar(10000);
        this.scene.add(this.objects.sky);

        this.updateSunAndSky();
    },

    // Helper function to update sun position and sky environment
    updateSunAndSky() {
        if (!this.objects.sky || !this.objects.water) return;
        
        const skyUniforms = this.objects.sky.material.uniforms;
        skyUniforms['turbidity'].value = this.config.skyTurbidity;
        skyUniforms['rayleigh'].value = this.config.skyRayleigh;
        
        const phi = THREE.MathUtils.degToRad(90 - this.config.sunElevation);
        const theta = THREE.MathUtils.degToRad(this.config.sunAzimuth);

        this.objects.sun.setFromSphericalCoords(1, phi, theta);
        
        skyUniforms['sunPosition'].value.copy(this.objects.sun);
        this.objects.water.material.uniforms['sunDirection'].value.copy(this.objects.sun).normalize();
        
        // Update environment map
        if (this.objects.renderTarget) this.objects.renderTarget.dispose();
        this.objects.renderTarget = this.pmremGenerator.fromScene(this.objects.sky);
        this.scene.environment = this.objects.renderTarget.texture;
    },

    update(clock, mouse, camera) {
        if (!this.objects.water) return;

        // Animate water time
        this.objects.water.material.uniforms['time'].value += 1.0 / 60.0;
        
        // Gentle camera animation
        camera.position.set(
            Math.cos(clock.getElapsedTime() * 0.1) * 80,
            30 + Math.sin(clock.getElapsedTime() * 0.2) * 5,
            100
        );
        camera.lookAt(0, 0, 0);
    },

    destroy() {
        if (!this.scene) return;
        
        this.scene.remove(this.objects.water);
        this.scene.remove(this.objects.sky);
        
        this.objects.water?.geometry.dispose();
        this.objects.water?.material.dispose();
        this.objects.sky?.geometry.dispose();
        this.objects.sky?.material.dispose();
        
        this.scene.environment = null;
        this.pmremGenerator?.dispose();
        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            <h3>Water</h3>
            ${createSlider('distortionScale', 'Distortion', 0, 8, this.config.distortionScale, '0.1')}
            ${createSlider('waveSize', 'Wave Size', 0.1, 10, this.config.waveSize, '0.1')}
            ${createColorPicker('waterColor', 'Color', this.config.waterColor)}
            <h3>Sky & Sun</h3>
            ${createSlider('sunElevation', 'Sun Elevation', 0, 90, this.config.sunElevation, '0.1')}
            ${createSlider('sunAzimuth', 'Sun Azimuth', -180, 180, this.config.sunAzimuth, '0.1')}
            ${createSlider('skyTurbidity', 'Turbidity', 1, 20, this.config.skyTurbidity, '0.1')}
            ${createSlider('skyRayleigh', 'Rayleigh', 0, 4, this.config.skyRayleigh, '0.1')}
        `;

        addSliderListeners(this.config, null); // No recreate needed
        
        addColorListeners(this.config, (key, value) => {
            if (key === 'waterColor') {
                this.objects.water.material.uniforms.waterColor.value.set(value);
            }
        });

        // Add direct listeners for properties that need to call updateSunAndSky
        ['sunElevation', 'sunAzimuth', 'skyTurbidity', 'skyRayleigh'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.updateSunAndSky());
        });

        // Add direct listeners for water uniforms
        ['distortionScale', 'waveSize'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                const uniformName = (id === 'waveSize') ? 'size' : id;
                this.objects.water.material.uniforms[uniformName].value = parseFloat(e.target.value);
            });
        });
    }
};
