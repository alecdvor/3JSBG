import * as THREE from 'three';
import { createSlider, addSliderListeners } from '../utils.js';

const deepSpace = {
    title: "Deep Space",
    config: { starCount: 6000, starSize: 6.0, speedMultiplier: 1.0, nebulaCount: 50, nebulaSize: 350 },
    objects: {},
    scene: null,

    init(scene) {
        this.scene = scene;
        this.regenerate();
    },

    update(clock, mouse, camera) {
        const elapsedTime = clock.getElapsedTime();
        if (this.objects.stars) {
            const positions = this.objects.stars.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                const speed = 10 + (i % 9) * 10;
                positions[i + 2] += speed * 0.01 * this.config.speedMultiplier;
                if (positions[i + 2] > camera.position.z) positions[i + 2] = -2000;
            }
            this.objects.stars.geometry.attributes.position.needsUpdate = true;
        }
        if (this.objects.nebulas) {
            this.objects.nebulas.rotation.z = elapsedTime * 0.01;
        }
        camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.02;
        camera.position.y += (mouse.y * 0.5 - camera.position.y) * 0.02;
        camera.lookAt(this.scene.position);
    },

    destroy() {
        if (!this.scene) return;
        if (this.objects.stars) this.scene.remove(this.objects.stars);
        if (this.objects.nebulas) this.scene.remove(this.objects.nebulas);
        
        Object.values(this.objects).forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                 if (obj.material.map) obj.material.map.dispose();
                 obj.material.dispose();
            }
        });
        this.objects = {};
    },

    regenerate() {
        if (!this.scene) return;
        this.destroy();
        
        // Star Creation
        const starVertices = [];
        for (let i = 0; i < this.config.starCount; i++) {
            starVertices.push((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000, -Math.random() * 2000);
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const starMaterial = new THREE.PointsMaterial({
            map: this.generateTexture('star'), size: this.config.starSize,
            blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
        });
        this.objects.stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.objects.stars);

        // Nebula Creation
        const nebulaVertices = [];
        for(let i = 0; i < this.config.nebulaCount; i++) {
            nebulaVertices.push((Math.random() - 0.5) * 3000, (Math.random() - 0.5) * 3000, -Math.random() * 3000 - 1000);
        }
        const nebulaGeometry = new THREE.BufferGeometry();
        nebulaGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nebulaVertices, 3));
        const nebulaMaterial = new THREE.PointsMaterial({
            map: this.generateTexture('nebula'), size: this.config.nebulaSize,
            blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.2 + Math.random() * 0.2
        });
        this.objects.nebulas = new THREE.Points(nebulaGeometry, nebulaMaterial);
        this.scene.add(this.objects.nebulas);
    },

    generateTexture(type) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if(type === 'star') {
            canvas.width = 32; canvas.height = 32;
            const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(0.2, 'rgba(255,255,255,0.7)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            context.fillStyle = gradient; context.fillRect(0, 0, 32, 32);
        } else { // nebula
            canvas.width = 256; canvas.height = 256;
            const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
            const r=Math.floor(Math.random()*100+155), g=Math.floor(Math.random()*100+50), b=Math.floor(Math.random()*155+100);
            gradient.addColorStop(0, `rgba(${r},${g},${b},0.3)`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            context.fillStyle = gradient; context.fillRect(0, 0, 256, 256);
        }
        return new THREE.CanvasTexture(canvas);
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            ${createSlider('starCount', 'Star Count', 500, 20000, this.config.starCount, '100')}
            ${createSlider('starSize', 'Star Size', 1, 20, this.config.starSize, '0.5')}
            ${createSlider('speedMultiplier', 'Speed', 0.1, 5, this.config.speedMultiplier, '0.1')}
            ${createSlider('nebulaCount', 'Nebula Count', 0, 200, this.config.nebulaCount, '1')}
            ${createSlider('nebulaSize', 'Nebula Size', 50, 1000, this.config.nebulaSize, '10')}
        `;
        
        // This single function call now sets up all the complex event listeners.
        addSliderListeners(this.config, () => this.regenerate());

        // We still need separate listeners for non-recreating properties.
        document.getElementById('starSize').addEventListener('input', (e) => {
            if (this.objects.stars) this.objects.stars.material.size = parseFloat(e.target.value);
        });
        document.getElementById('nebulaSize').addEventListener('input', (e) => {
            if (this.objects.nebulas) this.objects.nebulas.material.size = parseFloat(e.target.value);
        });
    }
};

export { deepSpace };
