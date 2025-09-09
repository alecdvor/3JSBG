import * as THREE from 'three';

let scene, camera, renderer;
let activeSceneUpdater = null;
let activeSceneName = '';
const mouse = new THREE.Vector2();
const clock = new THREE.Clock();
const loadedScenes = {};
const defaultConfigs = {};

const sceneFiles = ['deepSpace.js', 'lavaLamp.js', 'smokeyLights.js', 'volumetricSmoke.js', 'bouncingCubes.js', 'triangleField.js', 
                    'candyField.js', 'bugSwarm.js', 'oceanView.js', 'colorCloud.js', 'gravityParticles.js', 'fluidParticles.js', 
                    'rainyDay3D.js', 'orbitalLights.js', 'shapeLife.js'];

async function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 4000);
    camera.position.z = 1;

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    await loadScenesAndBuildUI();

    if (sceneFiles.length > 0) {
        const firstSceneName = sceneFiles[0].replace('.js', '');
        switchScene(firstSceneName);
    } else {
         document.getElementById('page-title').textContent = "No Scenes Found";
    }

    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    
    document.getElementById('toggleContentBtn').addEventListener('click', () => {
        document.querySelector('.content').classList.toggle('hidden');
    });
    
    const controlsPanel = document.getElementById('controls');
    const hideControlsBtn = document.getElementById('hideControlsBtn');
    const showControlsBtn = document.getElementById('showControlsBtn');
    hideControlsBtn.addEventListener('click', () => { controlsPanel.classList.add('hidden'); showControlsBtn.classList.add('visible'); });
    showControlsBtn.addEventListener('click', () => { controlsPanel.classList.remove('hidden'); showControlsBtn.classList.remove('visible'); });

    const selectorPanel = document.getElementById('scene-selector-modal');
    document.getElementById('open-scene-modal-btn').addEventListener('click', () => selectorPanel.classList.add('visible'));
    document.getElementById('close-scene-modal-btn').addEventListener('click', () => selectorPanel.classList.remove('visible'));
    
    document.getElementById('generateCodeBtn').addEventListener('click', generateEmbedCode);

    const codeModal = document.getElementById('code-modal');
    document.getElementById('close-code-modal-btn').addEventListener('click', () => codeModal.classList.remove('visible'));
    document.getElementById('copy-code-btn').addEventListener('click', copyEmbedCode);
}

async function loadScenesAndBuildUI() {
    const container = document.getElementById('scene-buttons-container');
    const sceneModal = document.getElementById('scene-selector-modal');

    for (const fileName of sceneFiles) {
        const sceneName = fileName.replace('.js', '');
        try {
            const module = await import(`./scenes/${fileName}`);
            
            if (module[sceneName]) {
                loadedScenes[sceneName] = module[sceneName];
                defaultConfigs[sceneName] = JSON.parse(JSON.stringify(module[sceneName].config));
                
                const btn = document.createElement('button');
                btn.className = 'scene-btn';
                btn.dataset.scene = sceneName;
                btn.textContent = module[sceneName].title || sceneName;
                btn.onclick = () => {
                    switchScene(sceneName);
                    sceneModal.classList.remove('visible');
                };
                container.appendChild(btn);
            }
        } catch (error) {
            console.error(`Failed to load scene: ${fileName}`, error);
        }
    }
}

function switchScene(sceneName) {
    if (activeSceneUpdater) {
        activeSceneUpdater.destroy(scene);
    }

    loadedScenes[sceneName].config = JSON.parse(JSON.stringify(defaultConfigs[sceneName]));
    
    scene.rotation.set(0,0,0);

    activeSceneUpdater = loadedScenes[sceneName];
    activeSceneName = sceneName;
    
    document.getElementById('page-title').textContent = `Welcome to ${activeSceneUpdater.title || 'the Void'}`;
    
    activeSceneUpdater.init(scene, renderer);
    activeSceneUpdater.createControls(scene, renderer);

    document.querySelectorAll('#scene-buttons-container .scene-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`#scene-buttons-container .scene-btn[data-scene="${sceneName}"]`).classList.add('active');
    document.getElementById('controls-title').textContent = `Customize ${activeSceneUpdater.title}`;
}

function generateEmbedCode() {
    if (!activeSceneUpdater) return;
    const currentConfig = activeSceneUpdater.config;
    const configString = Object.keys(currentConfig).length > 0 
        ? `\n  config: ${JSON.stringify(currentConfig, null, 2)}\n` 
        : '';
    const embedCode = `<div id="my-background"></div>

<script type="module">
  import { embed } from 'https://alecdvor.github.io/3JSBG/embed.js';

  embed({
    scene: '${activeSceneName}',
    target: '#my-background',${configString}});
<\/script>`;
    document.getElementById('embed-code').value = embedCode;
    document.getElementById('code-modal').classList.add('visible');
}

function copyEmbedCode() {
    const codeTextarea = document.getElementById('embed-code');
    const copyButton = document.getElementById('copy-code-btn');
    
    navigator.clipboard.writeText(codeTextarea.value).then(() => {
        copyButton.textContent = 'Copied!';
        setTimeout(() => { copyButton.textContent = 'Copy to Clipboard'; }, 2000);
    }).catch(err => {
        copyButton.textContent = 'Failed to copy';
        console.error('Failed to copy code: ', err);
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (activeSceneUpdater && activeSceneUpdater.onWindowResize) {
        activeSceneUpdater.onWindowResize(window.innerWidth, window.innerHeight);
    }
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function animate() {
    requestAnimationFrame(animate);
    if (activeSceneUpdater) {
        // --- FIX: Pass the renderer to the update function ---
        activeSceneUpdater.update(clock, mouse, camera, renderer);
    }
    renderer.render(scene, camera);
}

init();
animate();
