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
uniform vec3  colorFillLight;   // cyan backlight
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
          v += valueNoise(p * 2.1 + vec2(3.7, 1.3))  * 0.25;
          v += valueNoise(p * 4.3 + vec2(1.1, 7.9))  * 0.13;
    return v;
}

// ── Blob field ───────────────────────────────────────────────────────────────
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

const float NOISE_SCALE    = 1.5;
const float NOISE_STRENGTH = 0.04;
const float NOISE_SPEED    = 0.6;

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

// ── Caustics ─────────────────────────────────────────────────────────────────
vec2 layerSeed() {
    if (layerIndex < 0.5) return vec2(0.0,   0.0);
    if (layerIndex < 1.5) return vec2(17.3,  31.7);
                          return vec2(47.1, -23.9);
}

float causticLayer(vec2 p, float timeOffset, vec2 drift) {
    vec2 warpOff = vec2(
        fbm(p * 0.9 + vec2(1.7, 9.2) + timeOffset * 0.31),
        fbm(p * 0.9 + vec2(8.3, 2.8) - timeOffset * 0.27)
    ) * 2.0 - 1.0;
    vec2 warped = p + warpOff * 0.55 + drift;
    float n    = fbm(warped);
    float tent = 1.0 - abs(n * 2.0 - 1.0);
    return pow(clamp(tent, 0.0, 1.0), 1.2);
}

float causticValue(vec2 p, float t) {
    float sc = 1.2;
    float layerA = causticLayer(p * sc,               t,     vec2(t * 0.09, t * 0.055));
    float layerB = causticLayer(p * sc * 1.37 + vec2(3.1, 7.4), t + 4.7, vec2(-t * 0.047, t * 0.074));
    return (layerA + layerB) * 0.5;
}

// ── Heat shimmer ─────────────────────────────────────────────────────────────
vec2 heatShimmer(vec2 uv) {
    float heat = pow(clamp(1.0 - uv.y * 2.3, 0.0, 1.0), 2.0);
    float shift =
        sin(uv.y * 70.8 - time * 2.4)          * 0.6 +
        sin(uv.y * 121.0 - time * 3.1 + 1.4)   * 0.4;
    return vec2(uv.x + shift * 0.001 * heat, uv.y);
}

// ── Glass column vignette ────────────────────────────────────────────────────
// Returns 1 inside the column, fades to 0 at edges — gives the feeling of
// looking through a cylindrical glass tube without 3D geometry
float glassColumn(vec2 uv) {
    float cx  = uv.x - 0.5;
    // Lamp tapers slightly: wider at bottom, narrower at top (like real lava lamps)
    float taper  = 1.0 - uv.y * 0.12;
    float halfW  = 0.44 * taper;
    float edge   = smoothstep(halfW, halfW - 0.06, abs(cx));
    return edge;
}

// ── Bottom heat glow cone ────────────────────────────────────────────────────
// Simulates the incandescent bulb at the base casting cyan light upward
vec3 heatConeGlow(vec2 uv, vec3 glowColor) {
    float cx      = uv.x - 0.5;
    float falloff = exp(-uv.y * 3.5);                  // fades up the column
    float cone    = exp(-cx * cx * 18.0) * falloff;    // focused beam
    float rim     = exp(-abs(abs(cx) - 0.38) * 30.0) * falloff * 0.3; // inner glass rim
    return glowColor * (cone * 0.35 + rim) * 0.5;
}

// ── Fluid background ─────────────────────────────────────────────────────────
vec3 fluidBackground(vec2 uv, float colMask) {
    // Base gradient top → bottom
    vec3 bg = mix(colorFluidTop, colorFluidBottom, 1.0 - uv.y);

    // Subtle caustic ripple in the fluid itself
    vec2  fp  = vec2((uv.x - 0.5) * 4.0 * aspect, uv.y * 4.0);
    float caust = causticValue(fp * 0.6 + layerSeed(), time * 0.4);
    bg += colorFillLight * caust * 0.04 * colMask;

    // Bottom heat cone
    bg += heatConeGlow(uv, colorFillLight) * colMask;

    // Glass-wall scatter: faint cyan bands near the edges of the column
    float edgeDist = abs(uv.x - 0.5) / 0.44;
    float glassRim = smoothstep(0.85, 1.0, edgeDist) * exp(-uv.y * 1.5);
    bg += colorFillLight * glassRim * 0.18 * colMask;

    // Vignette the fluid to darkness outside the column
    bg *= colMask;

    // Very soft overall background brightness so the column reads against black
    bg = max(bg, colorFluidTop * (1.0 - uv.y) * 0.3 * colMask);

    return bg;
}

void main() {
    vec2 uv  = heatShimmer(vUv);
    vec2 p   = vec2((uv.x - 0.5) * 4.0 * aspect, uv.y * 4.0);

    float colMask = glassColumn(uv);

    float f = field(p);

    float alpha = smoothstep(threshold - 0.018, threshold + 0.018, f);

    if (alpha < 0.01) {
        // Background — fluid + heat cone + glass effects
        vec3 bg = fluidBackground(uv, colMask);
        if (colMask < 0.01) discard;
        gl_FragColor = vec4(bg, colMask);
        return;
    }

    // ── Normals & shape metrics ──────────────────────────────────────────────
    float e  = 0.018;
    float gx = field(p + vec2(e,   0.0)) - field(p - vec2(e,   0.0));
    float gy = field(p + vec2(0.0, e  )) - field(p - vec2(0.0, e  ));
    vec3 normal  = normalize(vec3(gx, -gy, 0.28));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    float NdotV   = max(0.0, dot(normal, viewDir));
    float fresnel = pow(1.0 - NdotV, 2.8);
    float gradMag = length(vec2(gx, gy));

    // thickness: 0 at isosurface, 1 deep inside blob center
    float thickness = smoothstep(threshold, threshold * 5.5, f);

    // concavity: high where blobs merge (near threshold AND steep gradient)
    float nearSurf   = 1.0 - smoothstep(threshold, threshold * 2.5, f);
    float concavity  = nearSurf * clamp(gradMag * 1.5, 0.0, 1.0);

    // worldY: 0=bottom of lamp, 1=top — drives the vertical lighting gradient
    float worldY = vUv.y;   // 0=bottom, 1=top in UV space

    // ── Vertical lighting from bottom bulb ───────────────────────────────────
    // The lamp bulb sits below, casting light upward. The BOTTOM of each blob
    // is lit (faces the lamp), the TOP is in shadow.
    //
    // normal.y in our convention: positive = facing up (away from lamp = shadow)
    //                              negative = facing down (toward lamp = lit)
    float bottomFacing = max(0.0, -normal.y);   // 1 when normal points down = lit
    float topFacing    = max(0.0,  normal.y);   // 1 when normal points up   = shadow

    // Also darken blobs that sit HIGH in the column — farther from bulb
    float heightShadow = worldY * worldY * 0.55;  // gets stronger toward top

    // ── Wax base colour ───────────────────────────────────────────────────────
    // Lit face (bottom): pale blue-white
    // Shadow face (top): dark teal-blue, almost fluid colour
    // Concave saddle neck: deep shadow, close to fluid background
    // Silhouette rim: dark indigo
    vec3 waxLit    = mix(colorWaxCore, vec3(1.0), 0.06);        // pale wax
    vec3 waxShadow = mix(colorFluidBottom * 1.3, colorFillLight * 0.25, 0.2); // dark teal top
    vec3 waxSaddle = mix(colorFluidBottom, colorFillLight * 0.15, 0.15);      // near-fluid neck
    vec3 waxRim    = mix(colorWaxEdge, colorFluidBottom, 0.45);  // dark indigo silhouette

    // Start with lit colour, shade toward shadow on top-facing areas
    vec3 waxBase = mix(waxLit, waxShadow,
                       clamp(topFacing * 1.2 + heightShadow, 0.0, 1.0));

    // Concave saddle between merging blobs → near-black teal
    waxBase = mix(waxBase, waxSaddle, concavity * 0.9);

    // Fresnel → dark indigo silhouette rim
    waxBase = mix(waxBase, waxRim, fresnel * 0.72);

    // Subtle cyan SSS bleed at the very edge from backlight
    float sssEdge = fresnel * 0.3 + (1.0 - thickness) * 0.12;
    waxBase = mix(waxBase, colorFillLight * 0.5,
                  sssEdge * fillLightStrength * 0.5);

    // ── Diffuse from bottom lamp ─────────────────────────────────────────────
    // Main light comes from below: lamp direction = pointing UP (+Y in world)
    float lampDiff = bottomFacing * 0.85 + 0.08;   // 0.08 ambient floor
    lampDiff = clamp(lampDiff, 0.0, 1.0);

    // Global height dimming: blobs near top receive less light
    lampDiff *= (1.0 - heightShadow * 0.6);

    vec3 col = waxBase * lampDiff;

    // ── Cyan fill from bottom ────────────────────────────────────────────────
    // Bottom-facing surfaces catch the cyan lamp directly
    col += colorFillLight * bottomFacing * fillLightStrength * 0.55;

    // Faint cyan rim scatter at silhouette edges (backlit halo)
    col += colorFillLight * fresnel * fillLightStrength * 0.18;

    // ── Specular from bottom lamp ────────────────────────────────────────────
    // Light comes from below-forward; reflection visible on bottom-front face
    vec3  specDir = normalize(vec3(0.05, 1.0, 0.7));   // from below
    float spec    = pow(max(0.0, dot(normal, normalize(specDir + viewDir))), 55.0);
    col += vec3(1.0, 1.0, 1.0) * spec * 0.22 * thickness * (1.0 - heightShadow);

    // ── Caustic patches ──────────────────────────────────────────────────────
    float normalWarpStrength = 0.4;
    vec2  normalWarp = normal.xy * (1.0 - NdotV) * normalWarpStrength;
    float caustic    = causticValue(p + normalWarp + layerSeed(), time);
    // Only on well-lit bottom-facing thick areas
    float receptivity = bottomFacing * thickness * (1.0 - concavity * 0.8);
    col += mix(vec3(1.0, 0.97, 0.90), colorFillLight, 0.25) * caustic * receptivity * 0.12;

    // ── Tone map & fog ────────────────────────────────────────────────────────
    col = col / (col + 0.5) * 1.5;
    col = mix(col, colorFogBlend, fogAmount);

    gl_FragColor = vec4(col, alpha);
}
