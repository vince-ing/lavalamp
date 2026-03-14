uniform vec2 blobs[30];
uniform float radii[30];
uniform int blobCount;
uniform float threshold;
uniform float time;

varying vec2 vUv;

// Evaluate the metaball field potential at a specific coordinate
float calculateField(vec2 p) {
    float field = 0.0;

    for(int i = 0; i < 30; i++) {
        if(i >= blobCount) break;

        float d = distance(p, blobs[i]);
        
        if (d > 0.0001) {
            field += (radii[i] * radii[i]) / (d * d);
        }
    }

    return field;
}

void main() {
    // Map standard UV [0, 1] to simulation coordinate space:
    // X: [-1, 1] (LAMP_WIDTH = 2)
    // Y: [0, 4]  (LAMP_HEIGHT = 4)
    vec2 simPos = vec2((vUv.x - 0.5) * 2.0, vUv.y * 4.0);

    float field = calculateField(simPos);

    // Surface Test
    if(field < threshold) {
        discard;
    }

    // Lighting Model (Gradient Approximation)
    float e = 0.01;
    float dx = calculateField(simPos + vec2(e, 0.0)) - calculateField(simPos - vec2(e, 0.0));
    float dy = calculateField(simPos + vec2(0.0, e)) - calculateField(simPos - vec2(0.0, e));
    
    vec3 normal = normalize(vec3(dx, dy, 1.0));
    
    // Hardcoded directional light mapping
    vec3 lightDir = normalize(vec3(0.5, 1.0, 1.0));
    float diffuse = max(0.0, dot(normal, lightDir));
    
    // Lava base coloring mixed with lighting
    vec3 lavaColor = vec3(1.0, 0.35, 0.0);
    vec3 finalColor = lavaColor * (0.4 + 0.6 * diffuse);

    gl_FragColor = vec4(finalColor, 1.0);
}
