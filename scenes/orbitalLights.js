// Inside the orbitalLights object...

regenerateParticles() {
    if (this.objects.particles) {
        this.scene.remove(this.objects.particles);
        this.objects.particles.geometry.dispose();
        this.objects.particles.material.dispose();
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.config.particleCount * 3);

    for (let i = 0; i < this.config.particleCount; i++) {
        const i3 = i * 3;
        const pos = new THREE.Vector3().random().subScalar(0.5).multiplyScalar(this.config.cloudRadius * 2);
        positions[i3] = pos.x;
        positions[i3 + 1] = pos.y;
        positions[i3 + 2] = pos.z;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // --- Custom Shader Material ---
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uSize: { value: this.config.particleSize },
            // 1. ADD a new uniform for master intensity
            uIntensity: { value: 0.15 }, // Start with a small value
            uLight1Pos: { value: new THREE.Vector3() },
            uLight1Color: { value: new THREE.Color(this.config.light1Color) },
            uLight2Pos: { value: new THREE.Vector3() },
            uLight2Color: { value: new THREE.Color(this.config.light2Color) },
            uLight3Pos: { value: new THREE.Vector3() },
            uLight3Color: { value: new THREE.Color(this.config.light3Color) },
        },
        vertexShader: `
            uniform float uSize;
            uniform float uIntensity; // Make the uniform available in the shader
            uniform vec3 uLight1Pos;
            uniform vec3 uLight1Color;
            uniform vec3 uLight2Pos;
            uniform vec3 uLight2Color;
            uniform vec3 uLight3Pos;
            uniform vec3 uLight3Color;

            varying vec3 vColor;

            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = uSize * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;

                float dist1 = max(0.01, distance(position, uLight1Pos));
                float dist2 = max(0.01, distance(position, uLight2Pos));
                float dist3 = max(0.01, distance(position, uLight3Pos));

                // 2. MULTIPLY the color by the intensity to tone it down
                vec3 color1 = uIntensity * uLight1Color / (dist1 * dist1);
                vec3 color2 = uIntensity * uLight2Color / (dist2 * dist2);
                vec3 color3 = uIntensity * uLight3Color / (dist3 * dist3);

                vColor = color1 + color2 + color3;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
                gl_FragColor = vec4(vColor, 1.0);
            }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
    });

    this.objects.particles = new THREE.Points(geometry, material);
    this.scene.add(this.objects.particles);
},
