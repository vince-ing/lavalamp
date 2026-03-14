uniform vec2 blobs[25];
uniform float radii[25];
uniform int blobCount;
uniform float threshold;
uniform float time;
uniform float aspect;

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

void main() {
    vec2 p = vec2((vUv.x - 0.5) * 4.0 * aspect, vUv.y * 4.0);
    float f = field(p);

    float alpha = smoothstep(threshold - 0.018, threshold + 0.018, f);
    if (alpha < 0.01) discard;

    float e  = 0.018;
    float gx = field(p + vec2(e,   0.0)) - field(p - vec2(e,   0.0));
    float gy = field(p + vec2(0.0, e  )) - field(p - vec2(0.0, e  ));
    vec3 normal  = normalize(vec3(gx, -gy, 0.4));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    float thickness = smoothstep(threshold, threshold * 4.5, f);
    float NdotV     = max(0.0, dot(normal, viewDir));
    float fresnel   = pow(1.0 - NdotV, 2.5);

    // Edge mask from raw gradient: when gx/gy are large the surface tilts
    // sharply away — this is a more reliable silhouette detector than fresnel
    // when the normal Z bias suppresses NdotV variation.
    float gradMag  = length(vec2(gx, gy));
    // Normalise: field gradient is large near the isosurface, taper off inside.
    // edgeMask peaks at ~1 on the silhouette and falls off inward.
    float edgeMask = clamp(gradMag * 2.5, 0.0, 1.0);

    // ── Vertical SSS: lamp proximity ──────────────────────────────────────
    float heat = 1.0 - vUv.y;
    float sss  = 0.28 + 0.72 * heat * heat;

    // ── Primary lamp: wrap diffuse from below ─────────────────────────────
    vec3  lampDir  = normalize(vec3(0.0, -1.0, 0.2));
    float wrap     = 0.55;
    float wrapDiff = max(0.0, (dot(normal, lampDir) + wrap) / (1.0 + wrap));

    float ambient = 0.08;
    float diffuse = ambient + (1.0 - ambient) * wrapDiff;

    float glowMult   = 1.0 + 1.8 * sss * (0.5 + 0.5 * thickness);
    float totalLight = diffuse * glowMult;

    // ── Wax color ─────────────────────────────────────────────────────────
    vec3 waxHot  = mix(colorWaxCore, vec3(1.0, 0.97, 0.78), heat * 0.6);
    vec3 waxCool = colorWaxEdge * 0.65;
    float colorT = clamp(wrapDiff * sss * 1.6, 0.0, 1.0);
    vec3 waxBase = mix(waxCool, waxHot, colorT);

    vec3 col = waxBase * totalLight;

    // ── Primary SSS rim (warm, from lamp below) ───────────────────────────
    vec3 rimColor = mix(colorWaxEdge, colorWaxCore, heat * 0.9);
    col += rimColor * fresnel * (0.2 + heat * 0.7) * 1.1;

    // ── Fill light: directional rim ───────────────────────────────────────
    // Uses edgeMask (gradient-based silhouette) instead of fresnel because
    // the Z=0.4 normal bias keeps NdotV high everywhere, killing fresnel.
    // Raw gradient direction gives true screen-space tilt for directionality.
    vec2  rawGrad   = vec2(gx, -gy);
    vec2  fillDir2D = normalize(vec2(-0.7, 0.7)); // top-left in screen space
    float fillFacing = length(rawGrad) > 0.001
        ? dot(normalize(rawGrad), fillDir2D) * 0.5 + 0.5
        : 0.5;
    float fillRim   = edgeMask * fillFacing;
    col += colorFillLight * fillRim * fillLightStrength * 2.5;
    col += colorFillLight * fillFacing * fillLightStrength * 0.05;

    // ── Specular from primary lamp ────────────────────────────────────────
    vec3  specDir = normalize(vec3(0.1, -0.7, 0.85));
    vec3  hVec    = normalize(specDir + viewDir);
    float spec    = pow(max(0.0, dot(normal, hVec)), 16.0);
    col += mix(colorWaxCore, vec3(1.0, 0.95, 0.82), 0.5) * spec * 0.28 * thickness;

    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
}
