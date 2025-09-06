import * as THREE from 'three';

// ... (createSoftCircleTexture, createStars, createNebulas, createSlider, createColorPicker functions remain the same) ...

function addSliderListeners(config, recreateCallback) {
    document.querySelectorAll('#scene-controls-container input[type="range"]').forEach(slider => {
        const textInput = document.getElementById(`${slider.id}Value`);
        const isFloat = slider.step.includes('.');

        // --- Event Listener for the Slider ---
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
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);

            // Validate the input value
            if (isNaN(value)) {
                value = config[slider.id]; // Reset if invalid
            }
            
            // The following line, which clamps the value, has been removed.
            // value = Math.max(min, Math.min(max, value));

            // Update the config and the text field
            config[slider.id] = value;
            textInput.value = isFloat ? value.toFixed(2) : value;
            
            // Update the slider's position. It will automatically cap at its min/max.
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
