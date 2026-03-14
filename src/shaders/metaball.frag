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
    // Raw gradient — positive Y means field increases going up = top of blob
    float gx = field(p + vec2(e, 0)) - field(p - vec2(e, 0));
    float gy = field(p + vec2(0, e)) - field(p - vec2(0, e));
    // FLIP Y so normal.y > 0 = surface faces UP (top), normal.y < 0 = faces DOWN (bottom)
    // The field gradient points INWARD toward blob centers. At the top of a blob,
    // the center is below, so raw gy is NEGATIVE at the top. Flip it.
    vec3 normal = normalize(vec3(gx, -gy, 0.22));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    // Thickness: single blob has f ~ 1.0 at center, threshold ~ 0.2 at edge.
    // So remap relative to threshold, saturate at modest multiple.
    // Single blob at its center: f ≈ 1.0, (1.0 - 0.2) / (0.2 * 3.0) = 1.33 → clamp 1.0 ✓
    // Single blob near edge: f ≈ 0.25, (0.05) / 0.6 = 0.08 → nearly 0 (thin) ✓
    float thickness = clamp((f - threshold) / (threshold * 3.0), 0.0, 1.0);
    float thinness  = 1.0 - thickness;

    // ── Lights ───────────────────────────────────────────────────────────────
    vec3 keyDir = normalize(vec3(-0.4, 0.7, 1.0));   // upper-left warm
    vec3 rimDir = normalize(vec3( 0.9, 0.2, 0.6));   // right rim cool blue

    float keyDiff = max(0.0, dot(normal, keyDir));
    float rimDiff = max(0.0, dot(normal, rimDir));

    // Bottom lamp: faces DOWN (normal.y < 0) are the underside, directly above the lamp
    float bottomFace = max(0.0,  normal.y);
    float topFace    = max(0.0, -normal.y);

    vec3 lampSpecDir = normalize(vec3(0.1, -1.0, 0.8));

    // ── Base color ────────────────────────────────────────────────────────────
    vec3 col = vec3(0.04, 0.00, 0.06);

    // Key diffuse: orange-red on upper-left facing surfaces
    col += vec3(0.80, 0.18, 0.02) * keyDiff * 0.7;
    col  = mix(col, vec3(1.0, 0.42, 0.02), smoothstep(0.3, 0.9, keyDiff) * 0.6);

    // Rim: blue on right edge
    col += vec3(0.08, 0.18, 0.85) * rimDiff * 0.45;

    // ── SSS from bottom lamp ──────────────────────────────────────────────────
    vec3 sssOrange = vec3(1.00, 0.55, 0.05);
    vec3 sssAmber  = vec3(1.00, 0.72, 0.18);

    // Direct hit on the BOTTOM face (topFace in corrected normals = underside)
    col += sssOrange * topFace * 1.1;

    // Transmission through thin wax — bleeds everywhere when thin
    float transmission = thinness * 0.75 + topFace * 0.25;
    col += sssAmber * transmission * 0.55;

    // Silhouette edge bleed
    float edgeMask = 1.0 - abs(dot(normal, viewDir));
    edgeMask = edgeMask * edgeMask * edgeMask;
    col += sssAmber * edgeMask * (thinness * 0.8 + 0.2) * 0.8;

    // Interior glow in thick merged regions
    col += vec3(1.0, 0.50, 0.04) * smoothstep(threshold * 2.0, threshold * 5.0, f) * 0.35;

    // ── Top darkening ─────────────────────────────────────────────────────────
    // Gentle — just a warm shadow tint, not a crush
    float topDark = smoothstep(0.3, 0.85, bottomFace);
    vec3 darkColor = vec3(0.22, 0.04, 0.06); // deep warm burgundy
    col = mix(col, darkColor, topDark * 0.55);

    // ── Specular ──────────────────────────────────────────────────────────────
    // Broad soft highlights = waxy. Tight bright = metallic. Keep power low.
    float keySpecW  = pow(max(0.0, dot(normalize(keyDir + viewDir), normal)), 18.0);
    float rimSpecW  = pow(max(0.0, dot(normalize(rimDir + viewDir), normal)), 14.0);
    float lampSpecW = pow(max(0.0, dot(normalize(lampSpecDir + viewDir), normal)), 16.0) * topFace;
    col += vec3(1.00, 0.85, 0.70) * keySpecW  * 0.22;
    col += vec3(0.55, 0.75, 1.00) * rimSpecW  * 0.18;
    col += vec3(1.00, 0.92, 0.65) * lampSpecW * 0.45;

    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
}
