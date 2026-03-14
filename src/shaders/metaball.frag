uniform vec2 blobs[25];
uniform float radii[25];
uniform int blobCount;
uniform float threshold;
uniform float time;
uniform float aspect;
varying vec2 vUv;

float wyvill(float d2, float R) {
    float r2 = R * R;
    if (d2 >= r2) return 0.0;
    float t = 1.0 - d2 / r2;
    return t * t * t;
}

float field(vec2 p) {
    float f = 0.0;
    for (int i = 0; i < 25; i++) {
        if (i >= blobCount) break;
        float dx = p.x - blobs[i].x;
        float dy = p.y - blobs[i].y;
        f += wyvill(dx*dx + dy*dy, radii[i] * 2.8);
    }
    return f;
}

void main() {
    vec2 p = vec2((vUv.x - 0.5) * 4.0 * aspect, vUv.y * 4.0);
    float f = field(p);

    float alpha = smoothstep(threshold - 0.018, threshold + 0.018, f);
    if (alpha < 0.01) discard;

    float e = 0.014;
    float gx = field(p + vec2(e, 0)) - field(p - vec2(e, 0));
    float gy = field(p + vec2(0, e)) - field(p - vec2(0, e));
    
    vec3 normal = normalize(vec3(gx, -gy, 0.35)); 
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    float thickness = smoothstep(threshold, threshold * 4.5, f);
    float thinness  = 1.0 - thickness;

    // ── Lights ───────────────────────────────────────────────────────────────
    // ADJUSTMENT: Reduced Z from 0.6 to 0.2 to point more directly up at the bottom
    vec3 bottomLightDir = normalize(vec3(0.0, -1.0, 0.2)); 
    vec3 keyLightDir = normalize(vec3(-0.5, 0.5, 0.8));    

    float wrap = 0.65;
    float bottomWrapDiff = max(0.0, (dot(normal, bottomLightDir) + wrap) / (1.0 + wrap));
    float keyWrapDiff = max(0.0, (dot(normal, keyLightDir) + wrap) / (1.0 + wrap));

    float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 3.0);

    // ── Base Color & SSS ─────────────────────────────────────────────────────
    vec3 col = vec3(0.0);
    
    vec3 sssColor = vec3(0.95, 0.35, 0.05); 
    vec3 coreColor = vec3(0.98, 0.65, 0.10); 
    
    float transmission = pow(thinness, 1.5);
    
    vec3 blobBaseColor = mix(sssColor, coreColor, thickness * bottomWrapDiff);
    
    // ADJUSTMENT: Increased the bottom wrap intensity from 1.4 to 2.2
    col += blobBaseColor * bottomWrapDiff * 1.7;
    col += vec3(0.8, 0.2, 0.1) * keyWrapDiff * 0.3;
    col += vec3(1.0, 0.6, 0.1) * fresnel * (transmission * 0.8 + 0.2) * 1.2;

    // ADJUSTMENT: Increased the maximum vertical heat multiplier from 1.3 to 2.5
    float verticalHeat = 1.0 - vUv.y;
    col *= mix(0.65, 1.8, verticalHeat);

    // ── Top Darkening (3D Aware) ─────────────────────────────────────────────
    float topFace = smoothstep(0.1, 0.9, normal.y);
    float topShadow = topFace * (1.0 - fresnel * 0.6); 
    
    vec3 darkTint = vec3(0.25, 0.02, 0.05); 
    col = mix(col, darkTint, topShadow * 0.7 * (0.3 + 0.7 * vUv.y));

    // ── Specular (Waxy) ──────────────────────────────────────────────────────
    vec3 halfVectorBottom = normalize(bottomLightDir + viewDir);
    float specBottom = pow(max(0.0, dot(normal, halfVectorBottom)), 8.0);
    
    vec3 halfVectorKey = normalize(keyLightDir + viewDir);
    float specKey = pow(max(0.0, dot(normal, halfVectorKey)), 6.0);
    
    float specAtten = mix(0.1, 1.0, thickness);
    
    col += vec3(1.0, 0.8, 0.6) * specBottom * 0.25 * specAtten;
    col += vec3(1.0, 0.7, 0.5) * specKey * 0.15 * specAtten;

    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
}