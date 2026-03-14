uniform vec2 blobs[30];
uniform float radii[30];
uniform int blobCount;
uniform float threshold;
uniform float time;
uniform float aspect;

varying vec2 vUv;

float calculateField(vec2 p) {
    float field = 0.0;
    for(int i = 0; i < 30; i++) {
        if(i >= blobCount) break;
        float d = distance(p, blobs[i]);
        if (d > 0.0001) {
            // Using a slightly softer falloff for more stringy deformations
            field += (radii[i] * radii[i]) / (d * d);
        }
    }
    return field;
}

void main() {
    // Multiply the X coordinate by the aspect ratio to preserve perfect circles
    vec2 simPos = vec2((vUv.x - 0.5) * 4.0 * aspect, vUv.y * 4.0);
    float field = calculateField(simPos);

    // Smoothstep creates anti-aliased, gooey edges instead of a hard pixel cut-off
    float edgeWidth = 0.15; 
    float alpha = smoothstep(threshold - edgeWidth, threshold + edgeWidth, field);

    if(alpha < 0.01) {
        discard;
    }

    // Widened sample area (e) and lowered Z component on the normal for a rounder, 3D wax bubble look
    float e = 0.03;
    float dx = calculateField(simPos + vec2(e, 0.0)) - calculateField(simPos - vec2(e, 0.0));
    float dy = calculateField(simPos + vec2(0.0, e)) - calculateField(simPos - vec2(0.0, e));
    vec3 normal = normalize(vec3(dx, dy, 0.4));
    
    // Lighting setup
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    
    // Diffuse shading
    float diffuse = max(0.0, dot(normal, lightDir));
    
    // Specular highlight (makes it look glossy/wet)
    vec3 halfDir = normalize(lightDir + viewDir);
    float specAngle = max(0.0, dot(normal, halfDir));
    float specular = pow(specAngle, 16.0); // lower power = softer, wider highlight

    // Color mixing
    vec3 lavaColor = vec3(1.0, 0.35, 0.0); // Base orange
    vec3 finalColor = lavaColor * (0.5 + 0.5 * diffuse) + vec3(0.4) * specular;

    gl_FragColor = vec4(finalColor, alpha);
}