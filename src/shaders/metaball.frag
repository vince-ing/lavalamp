uniform vec2 blobs[25];
uniform float radii[25];
uniform int blobCount;
uniform float threshold;
uniform float time;
uniform float aspect;
uniform vec3  colorFogBlend;
uniform float fogAmount;

uniform vec3 colorFluidTop;
uniform vec3 colorFluidBottom;
uniform vec3 colorWaxEdge;
uniform vec3 colorWaxCore;
uniform vec3 colorFillLight;
uniform float fillLightStrength;

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

// ── Two-octave FBM noise for caustic shimmer ──────────────────────────────
float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
}
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
    return noise(p) * 0.6 + noise(p * 2.3 + vec2(5.2, 1.3)) * 0.4;
}

void main() {
    vec2 p = vec2((vUv.x - 0.5) * 4.0 * aspect, vUv.y * 4.0);
    float f = field(p);

    float alpha = smoothstep(threshold - 0.018, threshold + 0.018, f);
    if (alpha < 0.01) discard;

    float e  = 0.018;
    float gx = field(p + vec2(e,   0.0)) - field(p - vec2(e,   0.0));
    float gy = field(p + vec2(0.0, e  )) - field(p - vec2(0.0, e  ));
    vec3 normal  = normalize(vec3(gx, -gy, 0.28));   // reduced Z bias → more NdotV variation
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    float thickness = smoothstep(threshold, threshold * 4.5, f);
    float NdotV     = max(0.0, dot(normal, viewDir));
    float fresnel   = pow(1.0 - NdotV, 2.5);

    float gradMag  = length(vec2(gx, gy));
    float edgeMask = clamp(gradMag * 2.5, 0.0, 1.0);

    // ── Vertical heat: warmer near bottom ────────────────────────────────
    float heat = 1.0 - vUv.y;
    float sss  = 0.28 + 0.72 * heat * heat;

    // ── Primary lamp ──────────────────────────────────────────────────────
    vec3  lampDir  = normalize(vec3(0.0, -1.0, 0.2));
    float wrap     = 0.55;
    float wrapDiff = max(0.0, (dot(normal, lampDir) + wrap) / (1.0 + wrap));

    float ambient    = 0.08;
    float diffuse    = ambient + (1.0 - ambient) * wrapDiff;
    float glowMult   = 1.0 + 1.8 * sss * (0.5 + 0.5 * thickness);
    float totalLight = diffuse * glowMult;

    // ── Wax color with amber heat glow ────────────────────────────────────
    // Hot wax near the bottom bleeds toward amber/orange
    vec3 colorWaxHot = vec3(1.0, 0.70, 0.18);   // amber
    vec3 waxHot  = mix(colorWaxCore, colorWaxHot, heat * 0.72);
    vec3 waxCool = colorWaxEdge * 0.65;
    float colorT = clamp(wrapDiff * sss * 1.6, 0.0, 1.0);
    vec3 waxBase = mix(waxCool, waxHot, colorT);

    // ── Caustic shimmer: animated noise baked into the surface color ──────
    // Two overlapping noise layers scrolling at different speeds create
    // the rippling light caustic pattern real lava lamps show on their blobs.
    float shimmer = fbm(p * 3.8 + vec2(time * 0.18, time * 0.11))
                  - fbm(p * 5.1 - vec2(time * 0.13, time * 0.20));
    shimmer = shimmer * 0.5 + 0.5;            // remap to [0,1]
    shimmer = pow(shimmer, 1.8) * 0.12;       // sharpen + attenuate
    // Caustics are only visible on lit, front-facing areas (not thin edges)
    shimmer *= thickness * (1.0 - edgeMask * 0.6);
    vec3 causticColor = mix(colorWaxCore, vec3(1.0, 0.9, 0.6), 0.7);
    waxBase += causticColor * shimmer;

    vec3 col = waxBase * totalLight;

    // ── SSS rim ───────────────────────────────────────────────────────────
    vec3 rimColor = mix(colorWaxEdge, colorWaxHot, heat * 0.9);
    col += rimColor * fresnel * (0.2 + heat * 0.7) * 1.1;

    // Thin-edge translucency: amber bleeds through the silhouette near the
    // bottom, making merging blobs look semi-transparent and glowing.
    col += colorWaxHot * edgeMask * heat * 0.18;

    // ── Fill light ────────────────────────────────────────────────────────
    vec2  rawGrad   = vec2(gx, -gy);
    vec2  fillDir2D = normalize(vec2(-0.7, 0.7));
    float fillFacing = length(rawGrad) > 0.001
        ? dot(normalize(rawGrad), fillDir2D) * 0.5 + 0.5
        : 0.5;
    float fillRim = edgeMask * fillFacing;
    col += colorFillLight * fillRim * fillLightStrength * 2.5;
    col += colorFillLight * fillFacing * fillLightStrength * 0.05;

    // ── Specular (tighter, glassier) ──────────────────────────────────────
    vec3  specDir  = normalize(vec3(0.1, -0.7, 0.85));
    vec3  hVec     = normalize(specDir + viewDir);
    float spec     = pow(max(0.0, dot(normal, hVec)), 38.0);    // sharper than before
    // Warm-gold tint on specular highlight
    vec3  specCol  = mix(vec3(1.0, 0.92, 0.70), vec3(1.0), 0.3);
    col += specCol * spec * 0.32 * thickness;

    // Secondary soft back-scatter specular from opposite side
    vec3  specDir2 = normalize(vec3(-0.3, 0.5, 0.6));
    vec3  hVec2    = normalize(specDir2 + viewDir);
    float spec2    = pow(max(0.0, dot(normal, hVec2)), 10.0);
    col += colorWaxEdge * spec2 * 0.06 * fresnel;

    // ── Reinhard tone mapping (prevents harsh white blowout) ─────────────
    col = col / (col + 0.55) * 1.55;

    col = mix(col, colorFogBlend, fogAmount);
    gl_FragColor = vec4(col, alpha * (1.0 - fogAmount * 0.1));
}
