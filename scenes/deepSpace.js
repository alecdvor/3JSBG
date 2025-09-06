import * as THREE from 'three';

const deepSpace = {
    title: "Deep Space",
    config: { starCount: 6000, starSize: 6.0, speedMultiplier: 1.0, nebulaCount: 50, nebulaSize: 350 },
    objects: {}, // To hold stars, nebulas etc.

    init(scene) {
        this.regenerate(scene);
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
        camera.lookAt(scene.position);
    },

    destroy(scene) {
        if (this.objects.stars) scene.remove(this.objects.stars);
        if (this.objects.nebulas) scene.remove(this.objects.nebulas);
        // Proper disposal of geometries and materials
        Object.values(this.objects).forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                 if (obj.material.map) obj.material.map.dispose();
                 obj.material.dispose();
            }
        });
        this.objects = {};
    },

    regenerate(scene) {
        this.destroy(scene);
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
        scene.add(this.objects.stars);

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
        scene.add(this.objects.nebulas);
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

    createControls(scene) {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            <div class="control-row"><label for="starCount">Star Count</label><input type="range" id="starCount" min="500" max="20000" value="${this.config.starCount}" step="100"><span id="starCountValue">${this.config.starCount}</span></div>
            <div class="control-row"><label for="starSize">Star Size</label><input type="range" id="starSize" min="1" max="20" value="${this.config.starSize}" step="0.5"><span id="starSizeValue">${this.config.starSize.toFixed(1)}</span></div>
            <div class="control-row"><label for="speedMultiplier">Speed</label><input type="range" id="speedMultiplier" min="0.1" max="5" value="${this.config.speedMultiplier}" step="0.1"><span id="speedMultiplierValue">${this.config.speedMultiplier.toFixed(1)}</span></div>
            <div class="control-row"><label for="nebulaCount">Nebula Count</label><input type="range" id="nebulaCount" min="0" max="200" value="${this.config.nebulaCount}" step="1"><span id="nebulaCountValue">${this.config.nebulaCount}</span></div>
            <div class="control-row"><label for="nebulaSize">Nebula Size</label><input type="range" id="nebulaSize" min="50" max="1000" value="${this.config.nebulaSize}" step="10"><span id="nebulaSizeValue">${this.config.nebulaSize}</span></div>
        `;
         Object.keys(this.config).forEach(key => {
            document.getElementById(key).addEventListener('input', (e) => {
                const isFloat = e.target.step.includes('.');
                const value = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value);
                this.config[key] = value;
                const valueEl = document.getElementById(`${key}Value`);
                if(valueEl) valueEl.textContent = isFloat ? value.toFixed(1) : value;

                if (key === 'starSize' && this.objects.stars) this.objects.stars.material.size = value;
                else if (key === 'nebulaSize' && this.objects.nebulas) this.objects.nebulas.material.size = value;
                else if (key !== 'speedMultiplier') this.regenerate(scene);
            });
        });
    }
};

export { deepSpace };
