uniform vec2  blobs[25];
uniform float radii[25];
uniform vec2  velocities[25];
uniform int   blobCount;
uniform float threshold;
uniform float time;
uniform float aspect;
uniform vec3  colorFogBlend;
uniform float fogAmount;

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

// User-tuned noise parameters — do not change
const float NOISE_SCALE    = 1.5;
const float NOISE_STRENGTH = 0.04;
const float NOISE_SPEED    = 0.6;
// ─────────────────────────────────────────────────────────────────────────────

// ── Subsurface glow parameters ───────────────────────────────────────────────
// Each blob contributes a radial exp(-d²·falloff) glow at the fragment.
// Accumulating across all blobs means merged regions glow brighter — looks
// like light pooling inside thick wax.
const float SSS_FALLOFF   = 0.15;  // how tightly the glow hugs each blob centre
                                   // lower = wider/softer, higher = tighter hotspot
const float SSS_STRENGTH  = 0.04; // overall brightness of the glow layer
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

// Accumulate subsurface glow from all blob centres.
// We use raw Euclidean distance (not the warped field) so the hotspot is
// always centred on the blob regardless of its squish direction.
float subsurfaceGlow(vec2 p) {
    float glow = 0.0;
    for (int i = 0; i < 25; i++) {
        if (i >= blobCount) break;
        vec2  d    = p - blobs[i];
        float d2   = dot(d, d);
        float r    = radii[i];
        // Normalise by radius so large and small blobs have consistent hotspot intensity
        float nd2  = d2 / (r * r);
        glow += exp(-nd2 * SSS_FALLOFF);
    }
    return glow;
}

// ── Heat shimmer ─────────────────────────────────────────────────────────────
// Offsets the sample position horizontally near the bottom of the lamp,
// simulating refractive distortion from hot rising air.
// Strength falls off smoothly to zero by mid-lamp so the top stays clean.
const float SHIMMER_STRENGTH = 0.001;  // max horizontal wobble in world units
const float SHIMMER_SCALE    = 70.8;    // spatial frequency of shimmer bands
const float SHIMMER_SPEED    = 2.4;    // how fast the shimmer rises
const float SHIMMER_FALLOFF  = 2.3;    // how quickly it fades from the bottom up

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
    // Fringes pick up waxEdge, midtones waxCore, then bleach to near-white
    // at the hotspot so the centre looks like light shining through wax
    // rather than just a brighter version of the surface colour.
    float glow      = subsurfaceGlow(p);
    float glowNorm  = clamp(glow, 0.0, 3.0) / 3.0;   // drives colour blend
    float glowWhite = clamp(glow * 1.2, 0.0, 1.0);    // less capped — drives whitening
    vec3  glowTint  = mix(colorWaxEdge, colorWaxCore, glowNorm);
          glowTint  = mix(glowTint, vec3(1.0), glowWhite * glowWhite);
    col += glowTint * glow * SSS_STRENGTH * (0.6 + 1.5 * thickness);
    // ─────────────────────────────────────────────────────────────────────

    col = col / (col + 0.55) * 1.55;
    col = mix(col, colorFogBlend, fogAmount);
    gl_FragColor = vec4(col, alpha);
}
