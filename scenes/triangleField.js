import * as THREE from 'three';
import { createSlider, addSliderListeners } from '../utils.js';

export const triangleField = {
    title: "Triangle Field",
    scene: null,

    config: {
        triangleCount: 5000,
        fieldSize: 800,     // How spread out the triangles are
        triangleSize: 120,   // The size of individual triangles
        rotationSpeedX: 0.15,
        rotationSpeedY: 0.25,
    },

    objects: {},

    init(scene) {
        this.scene = scene;

        // --- Scene Setup ---
        this.scene.background = new THREE.Color(0x050505);
        this.scene.fog = new THREE.Fog(0x050505, 2000, 3500);

        // --- Lighting ---
        this.objects.ambientLight = new THREE.AmbientLight(0x444444, 3);
        this.scene.add(this.objects.ambientLight);
        this.objects.light1 = new THREE.DirectionalLight(0xffffff, 1.5);
        this.objects.light1.position.set(1, 1, 1);
        this.scene.add(this.objects.light1);
        this.objects.light2 = new THREE.DirectionalLight(0xffffff, 4.5);
        this.objects.light2.position.set(0, -1, 0);
        this.scene.add(this.objects.light2);

        // --- Triangle Geometry ---
        this.regenerateMesh();

        // --- Raycaster for mouse interaction ---
        this.objects.raycaster = new THREE.Raycaster();
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 3), 3));
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true });
        this.objects.highlightLine = new THREE.Line(lineGeometry, lineMaterial);
        this.objects.highlightLine.visible = false;
        this.scene.add(this.objects.highlightLine);
    },
    
    // Moved mesh generation to its own function to call it when settings change
    regenerateMesh() {
        if (this.objects.mesh) {
            this.scene.remove(this.objects.mesh);
            this.objects.mesh.geometry.dispose();
            this.objects.mesh.material.dispose();
        }

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.config.triangleCount * 3 * 3);
        const normals = new Float32Array(this.config.triangleCount * 3 * 3);
        const colors = new Float32Array(this.config.triangleCount * 3 * 3);

        const color = new THREE.Color();
        const n = this.config.fieldSize, n2 = n / 2;
        const d = this.config.triangleSize, d2 = d / 2;
        const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3();
        const cb = new THREE.Vector3(), ab = new THREE.Vector3();

        for (let i = 0; i < positions.length; i += 9) {
            const x = Math.random() * n - n2;
            const y = Math.random() * n - n2;
            const z = Math.random() * n - n2;

            const ax = x + Math.random() * d - d2, ay = y + Math.random() * d - d2, az = z + Math.random() * d - d2;
            const bx = x + Math.random() * d - d2, by = y + Math.random() * d - d2, bz = z + Math.random() * d - d2;
            const cx = x + Math.random() * d - d2, cy = y + Math.random() * d - d2, cz = z + Math.random() * d - d2;

            positions[i] = ax; positions[i + 1] = ay; positions[i + 2] = az;
            positions[i + 3] = bx; positions[i + 4] = by; positions[i + 5] = bz;
            positions[i + 6] = cx; positions[i + 7] = cy; positions[i + 8] = cz;

            pA.set(ax, ay, az); pB.set(bx, by, bz); pC.set(cx, cy, cz);
            cb.subVectors(pC, pB); ab.subVectors(pA, pB);
            cb.cross(ab).normalize();

            for (let j = 0; j < 9; j += 3) {
                normals[i + j] = cb.x;
                normals[i + j + 1] = cb.y;
                normals[i + j + 2] = cb.z;
            }

            color.setRGB((x / n) + 0.5, (y / n) + 0.5, (z / n) + 0.5);
            for (let j = 0; j < 9; j += 3) {
                colors[i + j] = color.r;
                colors[i + j + 1] = color.g;
                colors[i + j + 2] = color.b;
            }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeBoundingSphere();

        const material = new THREE.MeshPhongMaterial({
            color: 0xaaaaaa, specular: 0xffffff, shininess: 250,
            side: THREE.DoubleSide, vertexColors: true
        });
        
        this.objects.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.objects.mesh);
    },

    update(clock, mouse, camera) {
        if (!this.objects.mesh) return;

        // Adjust camera position to be further away, as the scale is large
        camera.position.z = 2750;

        const time = clock.getElapsedTime();
        this.objects.mesh.rotation.x = time * this.config.rotationSpeedX;
        this.objects.mesh.rotation.y = time * this.config.rotationSpeedY;

        this.objects.raycaster.setFromCamera(mouse, camera);
        const intersects = this.objects.raycaster.intersectObject(this.objects.mesh);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            const face = intersect.face;
            const linePosition = this.objects.highlightLine.geometry.attributes.position;
            const meshPosition = this.objects.mesh.geometry.attributes.position;

            linePosition.copyAt(0, meshPosition, face.a);
            linePosition.copyAt(1, meshPosition, face.b);
            linePosition.copyAt(2, meshPosition, face.c);
            linePosition.copyAt(3, meshPosition, face.a);

            this.objects.mesh.updateMatrixWorld();
            this.objects.highlightLine.geometry.applyMatrix4(this.objects.mesh.matrixWorld);
            this.objects.highlightLine.visible = true;
        } else {
            this.objects.highlightLine.visible = false;
        }
    },

    destroy() {
        if (!this.scene) return;
        this.scene.remove(this.objects.mesh);
        this.scene.remove(this.objects.highlightLine);
        this.scene.remove(this.objects.ambientLight);
        this.scene.remove(this.objects.light1);
        this.scene.remove(this.objects.light2);
        
        this.objects.mesh?.geometry.dispose();
        this.objects.mesh?.material.dispose();
        this.objects.highlightLine?.geometry.dispose();
        this.objects.highlightLine?.material.dispose();
        
        // Reset scene properties
        this.scene.background = null;
        this.scene.fog = null;
        this.objects = {};
    },

    createControls() {
        const container = document.getElementById('scene-controls-container');
        container.innerHTML = `
            ${createSlider('triangleCount', 'Count', 100, 10000, this.config.triangleCount, '100')}
            ${createSlider('fieldSize', 'Field Size', 100, 2000, this.config.fieldSize, '50')}
            ${createSlider('triangleSize', 'Triangle Size', 10, 300, this.config.triangleSize, '10')}
            ${createSlider('rotationSpeedX', 'X Rotation', 0, 1, this.config.rotationSpeedX, '0.01')}
            ${createSlider('rotationSpeedY', 'Y Rotation', 0, 1, this.config.rotationSpeedY, '0.01')}
        `;

        addSliderListeners(this.config, (event) => {
            if (event && ['triangleCount', 'fieldSize', 'triangleSize'].includes(event.target.id)) {
                this.regenerateMesh();
            }
        });
    }
};
