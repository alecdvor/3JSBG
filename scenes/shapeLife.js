import * as THREE from 'three'; 
import { createSlider, addSliderListeners } from '../utils.js';

export const shapeLife = {
    title: "Shape Life",
    scene: null,

    config: {
        cubeCount: 5,
        sphereCount: 10,
        pyramidCount: 8,
        
        cubeGrowthRate: 0.05,
        cubeSplitSize: 2.0,
        cubeSpeed: 0.5,

        sphereGrowthRate: 0.002,
        sphereSplitSize: 1.5,
        
        pyramidSpeed: 2.0,
        pyramidFuseTime: 3.0, // Seconds
        
        bounds: 15,
    },

    objects: {},

    init(scene) {
        this.scene = scene;
        
        this.objects.shapes = new THREE.Group();
        this.scene.add(this.objects.shapes);

        // Geometries
        const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
        const sphereGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const pyramidGeo = new THREE.ConeGeometry(0.5, 1, 4); // Cone as a pyramid

        // Materials
        const cubeMat = new THREE.MeshStandardMaterial({ color: 0x4A90E2, roughness: 0.6 });
        const sphereMat = new THREE.MeshStandardMaterial({ color: 0x50E3C2, roughness: 0.4 });
        const pyramidMat = new THREE.MeshStandardMaterial({ color: 0xE35050, roughness: 0.8 });

        // Create initial shapes
        for (let i = 0; i < this.config.cubeCount; i++) this.addShape('cube', null, cubeGeo, cubeMat);
        for (let i = 0; i < this.config.sphereCount; i++) this.addShape('sphere', null, sphereGeo, sphereMat);
        for (let i = 0; i < this.config.pyramidCount; i++) this.addShape('pyramid', null, pyramidGeo, pyramidMat);

        // Lighting
        this.objects.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.objects.ambientLight);
        this.objects.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.objects.dirLight.position.set(10, 20, 15);
        this.scene.add(this.objects.dirLight);
    },

    // Helper to add new shapes
    addShape(type, position, geo, mat) {
        const shape = new THREE.Mesh(geo, mat);
        shape.userData.type = type;
        shape.position.copy(position || new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * this.config.bounds / 2));
        
        switch (type) {
            case 'cube':
                shape.userData.velocity = new THREE.Vector3();
                break;
            case 'sphere':
                shape.userData.velocity = new THREE.Vector3().randomDirection().multiplyScalar(0.2);
                break;
            case 'pyramid':
                shape.userData.velocity = new THREE.Vector3();
                break;
        }

        this.objects.shapes.add(shape);
        return shape;
    },

    update(clock) {
        const delta = clock.getDelta();
        const allShapes = this.objects.shapes.children;
        const shapesToRemove = [];
        const shapesToAdd = [];

        // Main simulation loop
        allShapes.forEach(shape => {
            if (shapesToRemove.includes(shape)) return;

            // --- Behavior by Type ---
            if (shape.userData.type === 'cube') {
                this.updateCube(shape, allShapes, shapesToRemove, shapesToAdd, delta);
            } else if (shape.userData.type === 'sphere') {
                this.updateSphere(shape, shapesToAdd, delta);
            } else if (shape.userData.type === 'pyramid') {
                this.updatePyramid(shape, allShapes, shapesToRemove, shapesToAdd, delta);
            }
            
            // Apply velocity and boundary checks
            shape.position.addScaledVector(shape.userData.velocity, delta);
            this.checkBounds(shape);
        });

        // --- Process Removals and Additions ---
        shapesToRemove.forEach(shape => {
            shape.geometry.dispose();
            shape.material.dispose();
            this.objects.shapes.remove(shape);
        });

        shapesToAdd.forEach(s => this.addShape(s.type, s.position, s.geo, s.mat));
    },

    updateCube(cube, allShapes, shapesToRemove, shapesToAdd, delta) {
        let closestTarget = null;
        let minDistance = Infinity;

        // Find closest non-cube shape
        allShapes.forEach(target => {
            if (target === cube || target.userData.type === 'cube') return;
            const dist = cube.position.distanceTo(target.position);
            if (dist < minDistance) {
                minDistance = dist;
                closestTarget = target;
            }
        });

        // Move towards target
        if (closestTarget) {
            const direction = new THREE.Vector3().subVectors(closestTarget.position, cube.position).normalize();
            cube.userData.velocity.addScaledVector(direction, this.config.cubeSpeed * delta);
        }

        // Absorb and grow
        if (closestTarget && minDistance < (cube.scale.x / 2 + closestTarget.scale.x / 2)) {
            cube.scale.multiplyScalar(1 + this.config.cubeGrowthRate * delta);
            shapesToRemove.push(closestTarget);
        }
        
        // Split if too large
        if (cube.scale.x > this.config.cubeSplitSize) {
            shapesToRemove.push(cube);
            for (let i = 0; i < 2; i++) {
                shapesToAdd.push({ type: 'cube', position: cube.position.clone(), geo: cube.geometry, mat: cube.material });
            }
        }
    },

    updateSphere(sphere, shapesToAdd, delta) {
        // Grow at a constant rate
        sphere.scale.multiplyScalar(1 + this.config.sphereGrowthRate * delta);
        
        // Split when large enough
        if (sphere.scale.x > this.config.sphereSplitSize) {
            sphere.scale.set(0.1, 0.1, 0.1); // Reset size
            shapesToAdd.push({ type: 'sphere', position: sphere.position.clone(), geo: sphere.geometry, mat: sphere.material });
        }
    },

    updatePyramid(pyramid, allShapes, shapesToRemove, shapesToAdd, delta) {
        if (pyramid.userData.fusedTo) {
            pyramid.position.copy(pyramid.userData.fusedTo.position); // Stick to the target
            pyramid.userData.fuseTimer += delta;
            
            if (pyramid.userData.fuseTimer > this.config.pyramidFuseTime) {
                shapesToRemove.push(pyramid.userData.fusedTo, pyramid);
                for (let i = 0; i < 4; i++) {
                    shapesToAdd.push({ type: 'pyramid', position: pyramid.position.clone(), geo: pyramid.geometry, mat: pyramid.material });
                }
            }
            return;
        }

        let closestTarget = null;
        let minDistance = Infinity;
        
        // Find closest non-pyramid shape
        allShapes.forEach(target => {
            if (target === pyramid || target.userData.type === 'pyramid' || shapesToRemove.includes(target)) return;
            const dist = pyramid.position.distanceTo(target.position);
            if (dist < minDistance) {
                minDistance = dist;
                closestTarget = target;
            }
        });

        // Move towards target
        if (closestTarget) {
            const direction = new THREE.Vector3().subVectors(closestTarget.position, pyramid.position).normalize();
            pyramid.userData.velocity.copy(direction.multiplyScalar(this.config.pyramidSpeed));
            
            // Fuse on contact
            if (minDistance < (pyramid.scale.x / 2 + closestTarget.scale.x / 2)) {
                pyramid.userData.fusedTo = closestTarget;
                pyramid.userData.fuseTimer = 0;
            }
        }
    },

    checkBounds(shape) {
        ['x', 'y', 'z'].forEach(axis => {
            if (Math.abs(shape.position[axis]) > this.config.bounds / 2) {
                shape.userData.velocity[axis] *= -1;
            }
        });
    },

    destroy() {
        if (!this.scene) return;
        this.scene.traverse(child => {
            if (child.isMesh) {
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
            <h3>Cubes</h3>
            ${createSlider('cubeCount', 'Initial Count', 1, 20, this.config.cubeCount, '1')}
            ${createSlider('cubeGrowthRate', 'Growth Rate', 0.01, 0.2, this.config.cubeGrowthRate, '0.01')}
            ${createSlider('cubeSplitSize', 'Split Size', 1.5, 4, this.config.cubeSplitSize, '0.1')}
            ${createSlider('cubeSpeed', 'Speed', 0.1, 2, this.config.cubeSpeed, '0.1')}
            <h3>Spheres</h3>
            ${createSlider('sphereCount', 'Initial Count', 1, 30, this.config.sphereCount, '1')}
            ${createSlider('sphereGrowthRate', 'Growth Rate', 0.001, 0.01, this.config.sphereGrowthRate, '0.001')}
            ${createSlider('sphereSplitSize', 'Split Size', 1, 3, this.config.sphereSplitSize, '0.1')}
            <h3>Pyramids</h3>
            ${createSlider('pyramidCount', 'Initial Count', 1, 25, this.config.pyramidCount, '1')}
            ${createSlider('pyramidSpeed', 'Speed', 0.5, 5, this.config.pyramidSpeed, '0.1')}
            ${createSlider('pyramidFuseTime', 'Fuse Time (s)', 1, 10, this.config.pyramidFuseTime, '0.5')}
        `;

        addSliderListeners(this.config, () => {
            // Any change requires a full restart of the simulation
            this.destroy();
            this.init(this.scene);
        });
    }
};
