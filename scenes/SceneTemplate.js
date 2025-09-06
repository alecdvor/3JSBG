/*
 * =====================================================================================
 * SCENE TEMPLATE
 * =====================================================================================
 *
 * INSTRUCTIONS:
 * 1. Copy this file and rename it (e.g., `newScene.js`).
 * 2. Place the new file in your `/scenes` directory.
 * 3. Change the exported object name from `sceneTemplate` to your new scene's name
 * (e.g., `export const newScene = { ... }`). The name must match the filename.
 * 4. Add the new filename to the `sceneFiles` array in your `index.html`.
 * 5. Uncomment the code and fill in the logic for your new scene.
 *
 * =====================================================================================
 */

// Import the Three.js library. This is required for any scene.
// import * as THREE from 'three';

// You can also import helper functions from your utils.js file.
// The path '../utils.js' assumes this file is in the '/scenes' directory.
// import { createSlider, createColorPicker, addSliderListeners, addColorListeners } from '../utils.js';


/**
 * @exports sceneTemplate
 *
 * The main scene object. The name of this exported constant MUST match the filename.
 * For example, if the file is `wavyOcean.js`, this should be `export const wavyOcean`.
 */
// export const sceneTemplate = {

    /**
     * @property {string} title
     * The display name for your scene. This text will appear on the button in the scene selector UI.
     */
    // title: "New Scene Title",

    /**
     * @property {object} config
     * An object to hold all the customizable parameters for your scene.
     * These properties will be controlled by the UI panel you create in `createControls`.
     * It's a good practice to define all default values here.
     */
    // config: {
    //     particleCount: 1000,
    //     speed: 1.0,
    //     particleColor: '#ffffff',
    //     isInteractive: true,
    // },

    /**
     * @property {object} objects
     * A container for your Three.js objects (like Meshes, Points, Lines, etc.)
     * that you might need to access later, for example in the `update` or `destroy` functions.
     * Storing them here makes them easy to manage.
     */
    // objects: {
    //     particles: null,
    //     mainMesh: null,
    // },

    /**
     * @property {THREE.Scene | null} scene
     * This property will hold a reference to the main Three.js scene object.
     * It's automatically populated by the `init` function. You don't need to change this part.
     */
    // scene: null,

    /**
     * @method init
     * This function is called once when your scene is first loaded.
     * Its primary job is to set up all the initial objects for your scene.
     *
     * @param {THREE.Scene} scene - The main Three.js scene object from index.html.
     */
    // init(scene) {
        // This line is crucial. It stores a reference to the main scene
        // so other functions in this object can access it using `this.scene`.
        // this.scene = scene;

        // --- SETUP LOGIC HERE ---
        // 1. Create Geometries (the shapes of your objects).
        // const geometry = new THREE.BoxGeometry(1, 1, 1);

        // 2. Create Materials (the appearance of your objects).
        // const material = new THREE.MeshStandardMaterial({ color: this.config.particleColor });

        // 3. Create Meshes or Points by combining Geometries and Materials.
        // this.objects.mainMesh = new THREE.Mesh(geometry, material);

        // 4. Add your created objects to the scene.
        // this.scene.add(this.objects.mainMesh);
    // },

    /**
     * @method destroy
     * This function is called when switching to a different scene.
     * Its purpose is to clean up everything your scene created to prevent memory leaks.
     */
    // destroy() {
        // Check if the scene exists to avoid errors.
        // if (!this.scene) return;

        // --- CLEANUP LOGIC HERE ---
        // 1. Remove all objects from the scene.
        // this.scene.remove(this.objects.mainMesh);

        // 2. Properly dispose of geometries, materials, and textures. This is very important!
        // if (this.objects.mainMesh) {
        //     this.objects.mainMesh.geometry.dispose();
        //     this.objects.mainMesh.material.dispose();
        // }

        // 3. Clear your `objects` container.
        // this.objects = {};
    // },

    /**
     * @method update
     * This is the animation loop. This function is called on every single frame.
     * All movement, rotation, and time-based changes should happen here.
     *
     * @param {THREE.Clock} clock - Provides time information (e.g., `clock.getElapsedTime()`).
     * @param {THREE.Vector2} mouse - Provides mouse coordinates (from -1 to +1 on X and Y).
     * @param {THREE.Camera} camera - A reference to the main camera.
     */
    // update(clock, mouse, camera) {
        // --- ANIMATION LOGIC HERE ---
        // Example: Rotate the main mesh.
        // if (this.objects.mainMesh) {
        //     this.objects.mainMesh.rotation.x = clock.getElapsedTime() * this.config.speed;
        //     this.objects.mainMesh.rotation.y = clock.getElapsedTime() * this.config.speed;
        // }

        // Example: Make an object follow the mouse.
        // if (this.objects.mainMesh && this.config.isInteractive) {
        //     this.objects.mainMesh.position.x = mouse.x * 5;
        //     this.objects.mainMesh.position.y = mouse.y * 5;
        // }
    // },

    /**
     * @method createControls
     * This function generates the HTML for the "Customize Scene" panel.
     * It should create UI elements that control the properties in `this.config`.
     */
    // createControls() {
        // Get the container where the controls will be injected.
        // const container = document.getElementById('scene-controls-container');

        // --- UI CREATION LOGIC HERE ---
        // Use template literals to build the HTML for your controls.
        // container.innerHTML = `
        //     <div class="control-row">
        //         <label for="speed">Speed</label>
        //         <input type="range" id="speed" min="0.1" max="5" step="0.1" value="${this.config.speed}">
        //         <span>${this.config.speed}</span>
        //     </div>
        //     <div class="control-row">
        //         <label for="particleColor">Color</label>
        //         <div></div>
        //         <input type="color" id="particleColor" value="${this.config.particleColor}">
        //     </div>
        // `;

        // --- EVENT LISTENER LOGIC HERE ---
        // Add event listeners to link the HTML controls to your `this.config` object.

        // Example for a range slider.
        // document.getElementById('speed').addEventListener('input', (e) => {
        //     const value = parseFloat(e.target.value);
        //     this.config.speed = value;
        //     e.target.nextElementSibling.textContent = value.toFixed(1);
        // });

        // Example for a color picker.
        // document.getElementById('particleColor').addEventListener('input', (e) => {
        //     this.config.particleColor = e.target.value;
             // You might need to update the material color directly.
        //     if (this.objects.mainMesh) {
        //         this.objects.mainMesh.material.color.set(e.target.value);
        //     }
        // });
    // }
// };
