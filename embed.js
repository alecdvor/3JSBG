/**
 * 3JSBG Embed Script
 * This script dynamically loads and renders a Three.js scene as a background.
 */

import * as THREE from 'three';

/**
 * Initializes and embeds a Three.js scene into a target element.
 * @param {object} options - The configuration options for the embed.
 * @param {string} options.scene - The name of the scene to load (e.g., 'deepSpace').
 * @param {string} options.target - The CSS selector for the container element (e.g., '#my-background').
 * @param {object} [options.config={}] - An object with custom scene parameters to override defaults.
 */
export async function embed({ scene: sceneName, target, config = {} }) {
    const container = document.querySelector(target);
    if (!container) {
        console.error(`[3JSBG] Target element "${target}" not found.`);
        return;
    }

    // --- Basic Three.js Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 1, 4000);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // --- Styling and Appending the Canvas ---
    const canvas = renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-1'; // Place it behind the content
    container.style.position = 'relative'; // Ensure the container can position the canvas
    container.appendChild(canvas);

    const mouse = new THREE.Vector2();
    const clock = new THREE.Clock();
    let activeSceneUpdater = null;

    // --- Dynamically Load the Scene ---
    try {
        // NOTE: The URL must point to your live repository's scenes folder.
        const module = await import(`https://alecdvor.github.io/3JSBG/scenes/${sceneName}.js`);
        if (module[sceneName]) {
            activeSceneUpdater = module[sceneName];
            
            // Merge user's custom config with the scene's default config
            if (activeSceneUpdater.config) {
                Object.assign(activeSceneUpdater.config, config);
            }
            
            activeSceneUpdater.init(scene);
        } else {
            throw new Error(`Scene "${sceneName}" could not be found in the loaded module.`);
        }
    } catch (error) {
        console.error(`[3JSBG] Failed to load scene: ${sceneName}.js`, error);
        return;
    }

    // --- Animation and Resize Handling ---
    function animate() {
        requestAnimationFrame(animate);
        if (activeSceneUpdater) {
            activeSceneUpdater.update(clock, mouse, camera);
        }
        renderer.render(scene, camera);
    }

    function onWindowResize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
        if (activeSceneUpdater.onWindowResize) {
            activeSceneUpdater.onWindowResize(container.clientWidth, container.clientHeight);
        }
    }

    function onMouseMove(event) {
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
    }

    window.addEventListener('resize', onWindowResize);
    container.addEventListener('mousemove', onMouseMove);

    animate();
}
