import * as THREE from 'three';

// ... (createSoftCircleTexture, createStars, createNebulas functions remain the same) ...

function createSlider(id, label, min, max, value, step = '') {
    const isFloat = step.includes('.');
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

        /**
         * NEW: Syncs the values when the user clicks the slider.
         * This ensures that the user's out-of-range text value is only
         * overridden when they explicitly start a slider interaction.
         */
        slider.addEventListener('mousedown', () => {
            const sliderValue = parseFloat(slider.value);
            // If the text input's value is different, sync it to the slider
            if (parseFloat(textInput.value) !== sliderValue) {
                config[slider.id] = sliderValue;
                textInput.value = isFloat ? sliderValue.toFixed(2) : sliderValue;
            }
        });

        // --- Event Listener for the Slider's movement ---
        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            config[slider.id] = value;
            textInput.value = isFloat ? value.toFixed(2) : value;
        });

        // If a recreate callback is needed, add it to the 'change' event (fires when mouse is released)
        if (slider.id === 'blobCount' || slider.id === 'starCount' || slider.id === 'nebulaCount') {
            slider.addEventListener('change', recreateCallback);
        }

        // --- Event Listener for the Text Input ---
        textInput.addEventListener('change', () => {
            let value = isFloat ? parseFloat(textInput.value) : parseInt(textInput.value, 10);

            if (isNaN(value)) {
                value = config[slider.id]; // Reset if invalid
            }

            // Update config and text field with the potentially out-of-range value
            config[slider.id] = value;
            textInput.value = isFloat ? value.toFixed(2) : value;
            
            // Update the slider's position. The browser will visually clamp it, but the config holds the real value.
            slider.value = value;
            
            // Programmatically trigger the slider's change event to run the recreate callback if needed
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
