import * as THREE from 'three';

function createSoftCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    return new THREE.CanvasTexture(canvas);
}

function createStars(count, size, color, range) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < count; i++) {
        positions.push(
            (Math.random() - 0.5) * range * 2,
            (Math.random() - 0.5) * range * 2,
            (Math.random() - 0.5) * range * 2
        );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const pointTexture = createSoftCircleTexture();

    const material = new THREE.PointsMaterial({
        size: size,
        color: color,
        sizeAttenuation: true,
        map: pointTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    return new THREE.Points(geometry, material);
}

function createNebulas(count, size) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const nebulaColors = [new THREE.Color(0xff00ff), new THREE.Color(0x00ffff), new THREE.Color(0xffa500)];
    for (let i = 0; i < count; i++) {
        positions.push(
            (Math.random() - 0.5) * 1500,
            (Math.random() - 0.5) * 500,
            (Math.random() - 0.5) * 1500
        );
        const color = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
        colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const pointTexture = createSoftCircleTexture();

    const material = new THREE.PointsMaterial({
        size: size,
        vertexColors: true,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: pointTexture
    });
    return new THREE.Points(geometry, material);
}

function createSlider(id, label, min, max, value, step = '') {
    const isFloat = String(step).includes('.');
    const displayValue = isFloat ? parseFloat(value).toFixed(2) : value;
    return `
        <div class="control-row" id="row-${id}">
            <label for="${id}">${label}</label>
            <input type="range" id="${id}" min="${min}" max="${max}" value="${value}" ${step ? `step="${step}"` : ''}>
            <input type="text" id="${id}Value" value="${displayValue}" class="value-input">
        </div>`;
}

function createColorPicker(id, label, value) {
    return `
         <div class="control-row" id="row-${id}">
            <label for="${id}">${label}</label>
            <div></div>
            <input type="color" id="${id}" value="${value}">
        </div>
    `;
}

function addSliderListeners(config, recreateCallback) {
    document.querySelectorAll('#scene-controls-container input[type="range"]').forEach(slider => {
        const textInput = document.getElementById(`${slider.id}Value`);
        const isFloat = slider.step.includes('.');

        slider.addEventListener('mousedown', () => {
            const sliderValue = parseFloat(slider.value);
            if (parseFloat(textInput.value) !== sliderValue) {
                config[slider.id] = sliderValue;
                textInput.value = isFloat ? sliderValue.toFixed(2) : sliderValue;
            }
        });

        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            config[slider.id] = value;
            textInput.value = isFloat ? value.toFixed(2) : value;
        });

        if (slider.id === 'blobCount' || slider.id === 'starCount' || slider.id === 'nebulaCount') {
            slider.addEventListener('change', recreateCallback);
        }

        textInput.addEventListener('change', () => {
            let value = isFloat ? parseFloat(textInput.value) : parseInt(textInput.value, 10);

            if (isNaN(value)) {
                value = config[slider.id];
            }

            config[slider.id] = value;
            textInput.value = isFloat ? value.toFixed(2) : value;
            
            slider.value = value;
            
            slider.dispatchEvent(new Event('change'));
        });
    });
}

function addColorListeners(config, updateCallback) {
     document.querySelectorAll('#scene-controls-container input[type="color"]').forEach(picker => {
        picker.addEventListener('input', (e) => {
            config[e.target.id] = e.target.value;
            if (updateCallback) {
                updateCallback(e.target.id, e.target.value);
            }
        });
    });
}

export { createSoftCircleTexture, createStars, createNebulas, createSlider, createColorPicker, addSliderListeners, addColorListeners };
