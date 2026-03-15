uniform vec2  blobs[25];
uniform float radii[25];
uniform vec2  velocities[25];
uniform int   blobCount;
uniform float threshold;
uniform float time;
uniform float aspect;
uniform vec3  colorFogBlend;
uniform float fogAmount;
uniform float layerIndex;

uniform vec3  colorFluidTop;
uniform vec3  colorFluidBottom;
uniform vec3  colorWaxEdge;
uniform vec3  colorWaxCore;
uniform vec3  colorFillLight;
uniform float fillLightStrength;

varying vec2 vUv;

// ── Noise ────────────────────────────────────────────────────────────────────
float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
        u.y
    );
}

float fbm(vec2 p) {
    float v  = valueNoise(p)                          * 0.62;
          v += valueNoise(p * 2.1 + vec2(3.7, 1.3))  * 0.38;
    return v;
}

const float NOISE_SCALE    = 1.5;
const float NOISE_STRENGTH = 0.04;
const float NOISE_SPEED    = 0.6;
// ─────────────────────────────────────────────────────────────────────────────

// ── Caustic light patches ────────────────────────────────────────────────────
const float CAUSTIC_SCALE    = 1.2;
const float CAUSTIC_SPEED    = 0.09;
const float CAUSTIC_WARP     = 0.55;
const float CAUSTIC_SHARP    = 1.2;
const float CAUSTIC_STRENGTH = 0.15;

// Large per-layer offsets so each layer samples a completely uncorrelated
// region of the noise field — back / middle / front all look different.
vec2 layerSeed() {
    if (layerIndex < 0.5) return vec2(0.0,   0.0);   // back
    if (layerIndex < 1.5) return vec2(17.3,  31.7);  // middle
                          return vec2(47.1, -23.9);  // front
}

float causticLayer(vec2 p, float timeOffset, vec2 drift) {
    vec2 warpOff = vec2(
        fbm(p * 0.9 + vec2(1.7, 9.2) + timeOffset * 0.31),
        fbm(p * 0.9 + vec2(8.3, 2.8) - timeOffset * 0.27)
    ) * 2.0 - 1.0;

    vec2 warped = p + warpOff * CAUSTIC_WARP + drift;

    float n    = fbm(warped);
    float tent = 1.0 - abs(n * 2.0 - 1.0);
    return pow(clamp(tent, 0.0, 1.0), CAUSTIC_SHARP);
}

float causticValue(vec2 p, float t) {
    float sc = CAUSTIC_SCALE;

    float layerA = causticLayer(
        p * sc,
        t,
        vec2(t *  CAUSTIC_SPEED, t * CAUSTIC_SPEED * 0.61)
    );
    float layerB = causticLayer(
        p * sc * 1.37 + vec2(3.1, 7.4),
        t + 4.7,
        vec2(t * -CAUSTIC_SPEED * 0.53, t * CAUSTIC_SPEED * 0.82)
    );

    return (layerA + layerB) * 0.5;
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Subsurface glow ───────────────────────────────────────────────────────────
const float SSS_FALLOFF  = 0.15;
const float SSS_STRENGTH = 0.02;
// ─────────────────────────────────────────────────────────────────────────────

float wyvill(float d2, float R) {
    float r2 = R * R;
    if (d2 >= r2) return 0.0;
    float t = 1.0 - d2 / r2;
    return t * t * t;
}

float squishKernel(vec2 offset, float R, vec2 vel) {
    float speed = length(vel);
    if (speed < 0.01) return wyvill(dot(offset, offset), R);

    vec2  dir       = vel / speed;
    float along     = dot(offset, dir);
    float squishAmt = clamp(speed * 1.6, 0.0, 0.38);
    float warpScale = clamp(1.0 - squishAmt * sign(along) * 0.55, 0.55, 1.45);
    vec2  perp      = offset - along * dir;
    vec2  warped    = perp + dir * (along * warpScale);
    return wyvill(dot(warped, warped), R);
}

float field(vec2 p) {
    float f = 0.0;
    for (int i = 0; i < 25; i++) {
        if (i >= blobCount) break;
        f += squishKernel(p - blobs[i], radii[i] * 2.8, velocities[i]);
    }
    vec2 noiseCoord = p * NOISE_SCALE + vec2(time * NOISE_SPEED, time * NOISE_SPEED * 0.7);
    float n = fbm(noiseCoord) * 2.0 - 1.0;
    f += n * NOISE_STRENGTH;
    return f;
}

float subsurfaceGlow(vec2 p) {
    float glow = 0.0;
    for (int i = 0; i < 25; i++) {
        if (i >= blobCount) break;
        vec2  d   = p - blobs[i];
        float d2  = dot(d, d);
        float r   = radii[i];
        float nd2 = d2 / (r * r);
        glow += exp(-nd2 * SSS_FALLOFF);
    }
    return glow;
}

// ── Heat shimmer ─────────────────────────────────────────────────────────────
const float SHIMMER_STRENGTH = 0.001;
const float SHIMMER_SCALE    = 70.8;
const float SHIMMER_SPEED    = 2.4;
const float SHIMMER_FALLOFF  = 2.3;

vec2 heatShimmer(vec2 uv) {
    float heat = pow(clamp(1.0 - uv.y * SHIMMER_FALLOFF, 0.0, 1.0), 2.0);
    float shift =
        sin(uv.y * SHIMMER_SCALE       - time * SHIMMER_SPEED)         * 0.6 +
        sin(uv.y * SHIMMER_SCALE * 1.7 - time * SHIMMER_SPEED * 1.3 + 1.4) * 0.4;
    return vec2(uv.x + shift * SHIMMER_STRENGTH * heat, uv.y);
}
// ─────────────────────────────────────────────────────────────────────────────

void main() {
    vec2 uv = heatShimmer(vUv);
    vec2 p = vec2((uv.x - 0.5) * 4.0 * aspect, uv.y * 4.0);
    float f = field(p);

    float alpha = smoothstep(threshold - 0.018, threshold + 0.018, f);
    if (alpha < 0.01) discard;

    float e  = 0.018;
    float gx = field(p + vec2(e,   0.0)) - field(p - vec2(e,   0.0));
    float gy = field(p + vec2(0.0, e  )) - field(p - vec2(0.0, e  ));
    vec3 normal  = normalize(vec3(gx, -gy, 0.28));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    float thickness = smoothstep(threshold, threshold * 4.5, f);
    float NdotV     = max(0.0, dot(normal, viewDir));
    float fresnel   = pow(1.0 - NdotV, 2.5);

    float gradMag  = length(vec2(gx, gy));
    float edgeMask = clamp(gradMag * 2.5, 0.0, 1.0);

    float heat = 1.0 - vUv.y;
    float sss  = 0.28 + 0.72 * heat * heat;

    vec3  lampDir  = normalize(vec3(0.0, -1.0, 0.2));
    float wrap     = 0.55;
    float wrapDiff = max(0.0, (dot(normal, lampDir) + wrap) / (1.0 + wrap));

    float ambient    = 0.08;
    float diffuse    = ambient + (1.0 - ambient) * wrapDiff;
    float glowMult   = 1.0 + 1.45 * sss * (0.5 + 0.5 * thickness);
    float totalLight = diffuse * glowMult;

    vec3 colorWaxHot = vec3(1.0, 0.70, 0.18);
    vec3 waxHot  = mix(colorWaxCore, colorWaxHot, heat * 0.72);
    vec3 waxCool = colorWaxEdge * 0.65;
    float colorT = clamp(wrapDiff * sss * 1.6, 0.0, 1.0);
    vec3 waxBase = mix(waxCool, waxHot, colorT);

    vec3 col = waxBase * totalLight;

    vec3 rimColor = mix(colorWaxEdge, colorWaxHot, heat * 0.9);
    col += rimColor * fresnel * (0.2 + heat * 0.7) * 1.1;
    col += colorWaxHot * edgeMask * heat * 0.18;

    vec2  rawGrad    = vec2(gx, -gy);
    vec2  fillDir2D  = normalize(vec2(-0.7, 0.7));
    float fillFacing = length(rawGrad) > 0.001
        ? dot(normalize(rawGrad), fillDir2D) * 0.5 + 0.5
        : 0.5;
    float fillRim = edgeMask * fillFacing;
    col += colorFillLight * fillRim * fillLightStrength * 2.5;
    col += colorFillLight * fillFacing * fillLightStrength * 0.05;

    vec3  specDir  = normalize(vec3(0.1, -0.7, 0.85));
    vec3  hVec     = normalize(specDir + viewDir);
    float spec     = pow(max(0.0, dot(normal, hVec)), 38.0);
    vec3  specCol  = mix(vec3(1.0, 0.92, 0.70), vec3(1.0), 0.3);
    col += specCol * spec * 0.32 * thickness;

    vec3  specDir2 = normalize(vec3(-0.3, 0.5, 0.6));
    vec3  hVec2    = normalize(specDir2 + viewDir);
    float spec2    = pow(max(0.0, dot(normal, hVec2)), 10.0);
    col += colorWaxEdge * spec2 * 0.06 * fresnel;

    // ── Subsurface glow ───────────────────────────────────────────────────
    float glow      = subsurfaceGlow(p);
    float glowNorm  = clamp(glow, 0.0, 3.0) / 3.0;
    float glowWhite = clamp(glow * 1.2, 0.0, 1.0);
    vec3  glowTint  = mix(colorWaxEdge, colorWaxCore, glowNorm);
          glowTint  = mix(glowTint, vec3(1.0), glowWhite * glowWhite);
    col += glowTint * glow * SSS_STRENGTH * (0.6 + 1.5 * thickness);
    // ─────────────────────────────────────────────────────────────────────

    // ── Caustic light patches ─────────────────────────────────────────────
    // Caustic sample coordinate is built in three steps so patches follow
    // the blob's curved 3D surface instead of lying flat in screen space:
    //
    // 1. World position p — patches are anchored to the blob geometry.
    //
    // 2. Normal warp: displace by normal.xy scaled by (1 - NdotV).
    //    NdotV is 1 at the very top and 0 at the silhouette edge.
    //    Multiplying by (1-NdotV) means the warp is zero at the crown
    //    (caustic pattern is undistorted there, as if light hits straight on)
    //    and maximum at the sides (pattern stretches/rotates as it wraps
    //    around the curve — matching how real projected caustics distort on
    //    a rounded surface). This gives the impression of the pattern
    //    following the 3D form without any actual 3D math.
    //
    // 3. Layer seed — a large per-layer offset so back / middle / front
    //    each sample an uncorrelated region of the noise field, ensuring
    //    every layer shows a visibly different pattern.

    float normalWarpStrength = 0.55;
    vec2  normalWarp = normal.xy * (1.0 - NdotV) * normalWarpStrength;
    vec2  causticP   = p + normalWarp + layerSeed();

    float caustic = causticValue(causticP, time);

    // Surface receptivity: top-facing, interior, non-edge gets brightest patches.
    float receptivity = NdotV * NdotV
                      * (0.5 + 0.5 * thickness)
                      * (1.0 - edgeMask * 0.7);

    // Tint: warm near-white with a blush of waxCore, slightly hotter near lamp
    vec3  causticTint = mix(vec3(1.0, 0.97, 0.88), colorWaxCore * 2.0, 0.15);
          causticTint = mix(causticTint, vec3(1.0), heat * 0.25);

    col += causticTint * caustic * receptivity * CAUSTIC_STRENGTH;
    // ─────────────────────────────────────────────────────────────────────

    col = col / (col + 0.55) * 1.55;
    col = mix(col, colorFogBlend, fogAmount);
    gl_FragColor = vec4(col, alpha);
}
