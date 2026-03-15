uniform vec3  blobs[30];
uniform float radii[30];
uniform vec2  velocities[30];
uniform int   blobCount;
uniform float time;
uniform float aspect;

uniform vec3  colorFluidTop;
uniform vec3  colorFluidBottom;
uniform vec3  colorWaxEdge;
uniform vec3  colorWaxCore;
uniform vec3  colorFillLight;
uniform float fillLightStrength;

varying vec2 vUv;

const float LAMP_HEIGHT = 4.0;
const float CAM_Z       = -2.0;
const int   MAX_ITERS   = 64;
const float MIN_DIST    = 0.005;
const float NDELTA      = 0.004;
const float PI          = 3.141592;

// ── Noise helpers ─────────────────────────────────────────────────────────────
float hash13(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
float hash12(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(hash13(i+vec3(0,0,0)), hash13(i+vec3(1,0,0)), u.x),
            mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), u.x), u.y),
        mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), u.x),
            mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), u.x), u.y),
        u.z);
}

// ── Surface undulation (unchanged from original) ──────────────────────────────
float surfaceWave(vec3 p) {
    vec3  q = p * 3.8 + vec3(time * 0.022, time * 0.016, time * 0.011);
    float n = vnoise(q) * 0.65
            + vnoise(q * 1.9 + vec3(3.7, 8.1, 2.4)) * 0.35;
    return pow(clamp(n, 0.0, 1.0), 8.0);
}

// ── SDF (unchanged from original) ────────────────────────────────────────────
float rawDensity(vec3 p) {
    float den = 0.0;
    for (int i = 0; i < 30; i++) {
        if (i >= blobCount) break;
        vec3  d = blobs[i] - p;
        float x = dot(d, d);
        float r = radii[i];
        den += (r * r) / max(x, 0.0001);
    }
    return den;
}

float scene(vec3 p) {
    float den = rawDensity(p);
    if (den < 0.333) return 2.0;
    float baseDist  = 1.0 / den - 1.0;
    float proximity = exp(-abs(baseDist) * 16.0);
    float noiseAmp  = 0.032 * proximity;
    return baseDist - surfaceWave(p) * noiseAmp;
}

vec3 sceneNormal(vec3 p) {
    float e = NDELTA;
    return normalize(vec3(
        scene(p + vec3(e,0,0)) - scene(p - vec3(e,0,0)),
        scene(p + vec3(0,e,0)) - scene(p - vec3(0,e,0)),
        scene(p + vec3(0,0,e)) - scene(p - vec3(0,0,e))
    ));
}

// ── Thickness: march toward the bottom lamp through the wax ───────────────────
float estimateThickness(vec3 hitPos, vec3 towardLamp) {
    float thickness = 0.0;
    vec3  p = hitPos;
    for (int i = 0; i < 10; i++) {
        p += towardLamp * 0.07;
        float den = rawDensity(p);
        thickness += clamp(den - 0.333, 0.0, 2.0) * 0.07;
    }
    return thickness;
}

// ── Background dust (unchanged from original) ─────────────────────────────────
float bgDustSharp(vec2 wp) {
    vec2 dp   = vec2(wp.x + sin(time*0.05+wp.y*1.1)*0.03, wp.y - time*0.04);
    vec2 cell = floor(dp * 16.0);
    vec2 fr   = fract(dp * 16.0) - 0.5;
    vec2 d    = fr - vec2(hash12(cell)-0.5, hash12(cell+vec2(3.7,8.1))-0.5)*0.38;
    float shape  = exp(-dot(d,d)*55.0);
    float pulse  = 0.5 + 0.5*sin(time*(0.03+hash12(cell+vec2(9.1,2.3))*0.06)
                                  +hash12(cell+vec2(1.3,5.7))*6.2832);
    return shape * pulse*pulse * step(0.975, hash12(cell+vec2(4.4,6.6)));
}
float bgDustBlurry(vec2 wp) {
    vec2 dp   = vec2(wp.x + sin(time*0.038+wp.y*0.7+2.1)*0.045, wp.y - time*0.028);
    vec2 cell = floor(dp * 4.0);
    vec2 fr   = fract(dp * 4.0) - 0.5;
    vec2 d    = fr - vec2(hash12(cell+vec2(5.1,1.9))-0.5, hash12(cell+vec2(2.3,7.4))-0.5)*0.40;
    float shape  = exp(-dot(d,d)*20.0);
    float pulse  = 0.5 + 0.5*sin(time*(0.02+hash12(cell+vec2(1.7,8.5))*0.04)
                                  +hash12(cell+vec2(6.2,3.8))*6.2832);
    return shape * pulse*pulse * step(0.93, hash12(cell+vec2(7.1,0.3)));
}

void main() {
    // uv.y = 0 at bottom of lamp, 1 at top
    vec2  uv     = vec2(vUv.x, 1.0 - vUv.y);
    float worldX = (uv.x - 0.5) * LAMP_HEIGHT * aspect;
    float worldY = uv.y * LAMP_HEIGHT;

    // ── Raymarch ──────────────────────────────────────────────────────────────
    vec3  pos    = vec3(worldX, worldY, CAM_Z);
    vec3  ray    = vec3(0.0, 0.0, 1.0);
    float dist   = 2.0;
    float tMarch = 0.0;
    for (int i = 0; i < MAX_ITERS; i++) {
        dist = scene(pos);
        if (dist < MIN_DIST) break;
        if (tMarch > 6.0)    break;
        float s = clamp(dist * 0.42, 0.005, 0.08);
        pos    += ray * s;
        tMarch += s;
    }

    // ── Background ────────────────────────────────────────────────────────────
    if (dist >= MIN_DIST) {
        // Deep indigo gradient — darker at top, hint of cyan glow at bottom
        float bgT = 1.0 - uv.y;
        vec3  bg  = mix(colorFluidTop, colorFluidBottom, bgT * bgT);

        // Cyan heat cone rising from lamp at bottom-centre
        float cx      = uv.x - 0.5;
        float cone    = exp(-cx*cx*22.0) * exp(-uv.y * 3.2);
        float rimGlow = exp(-abs(abs(cx)-0.42)*28.0) * exp(-uv.y*2.0) * 0.3;
        bg += colorFillLight * (cone * 0.5 + rimGlow) * 0.65;

        // Vignette
        vec2  suv = vUv * 2.0 - 1.0;
        suv.x    *= aspect;
        float vig = 1.0 - clamp(dot(suv,suv) * 0.38, 0.0, 1.0);
        bg *= 0.28 + 0.72 * vig;

        // Drifting motes
        float fadeY = smoothstep(0.0,0.15,uv.y) * smoothstep(1.0,0.9,uv.y);
        bg += vec3(0.55,0.85,1.00) * bgDustSharp(vec2(worldX,worldY))  * 0.18 * fadeY;
        bg += vec3(0.45,0.72,1.00) * bgDustBlurry(vec2(worldX,worldY)) * 0.08 * fadeY;

        gl_FragColor = vec4(bg, 1.0);
        return;
    }

    // ── Surface shading ───────────────────────────────────────────────────────
    vec3 n  = sceneNormal(pos);
    vec3 rd = ray;

    // heightT: 0 = bottom of lamp (near bulb, hot), 1 = top (cool, dark)
    float heightT = clamp(pos.y / LAMP_HEIGHT, 0.0, 1.0);

    // Lamp is below the fluid, light travels upward.
    // lampDir = direction FROM surface TOWARD light (pointing downward = toward lamp)
    vec3  lampDir  = normalize(vec3(0.05, -1.0, 0.5));
    float NdotL    = dot(n, -lampDir);    // +1 = surface faces down = lit by lamp
    float litFace  = max(0.0,  NdotL);   // bottom belly of blob
    float darkFace = max(0.0, -NdotL);   // top cap of blob (away from lamp)

    float NdotV   = max(0.0, dot(n, -rd));
    float fresnel = pow(1.0 - NdotV, 2.5);

    // Thickness march toward lamp — thin = cyan SSS, thick = opaque pale
    float thickness = estimateThickness(pos, lampDir);
    float thinness  = exp(-thickness * 6.0);

    // Height attenuation — blobs at top of column receive less lamp light
    float heightAtten = 1.0 - heightT * heightT * 0.5;

    // ── Wax colour ────────────────────────────────────────────────────────────
    // Hardcode pale blue-white — the actual wax material colour from the photo.
    // We do NOT use colorWaxCore here because the uniform may be set to any
    // colour by the user palette (e.g. purple). The wax physical colour is
    // always pale; the fill light tints it at the edges.
    vec3 waxLit = vec3(0.82, 0.90, 0.96);   // pale cool white

    // Top shadow: dark teal matching the fluid — blobs look dark at the top
    vec3 waxShadow = mix(colorFluidBottom * 0.55, colorFillLight * 0.08, 0.15);

    // Silhouette rim: near-black indigo edge
    vec3 waxRim = colorFluidBottom * 0.35 + colorWaxEdge * 0.15;

    // shadowBlend: 0 = fully lit (bottom belly), 1 = fully dark (top cap).
    // darkFace  = surface normal pointing away from lamp (top) → drives shadow
    // (1-heightT) REMOVED from here — height attenuation handled in diffuse,
    // not in the colour blend, so the gradient direction is correct.
    float shadowBlend = clamp(darkFace * 1.5, 0.0, 1.0);
    vec3  waxBase     = mix(waxLit, waxShadow, shadowBlend);

    // Dark rim at silhouette
    waxBase = mix(waxBase, waxRim, fresnel * 0.72);

    // Cyan SSS — stronger than before: backlight bleeds cyan at thin/edge areas
    float sssBlend = clamp(fresnel * 0.45 + thinness * 0.60, 0.0, 1.0);
    waxBase = mix(waxBase, colorFillLight * 0.70, sssBlend * fillLightStrength * 0.85);

    // ── Diffuse ───────────────────────────────────────────────────────────────
    // litFace = 1 on bottom belly (faces lamp below), 0 on top cap
    // heightAtten dims blobs that sit high in the column (farther from bulb)
    float diffuse = 0.04 + litFace * 0.90;
    diffuse      *= heightAtten;
    vec3  col     = waxBase * clamp(diffuse, 0.0, 1.0);

    // ── Cyan lamp fill ────────────────────────────────────────────────────────
    // Direct cyan on bottom-lit face
    col += colorFillLight * litFace * heightAtten * fillLightStrength * 0.70;
    // SSS: cyan transmitted through thin wax — stronger now
    col += colorFillLight * thinness * fillLightStrength * 0.75 * heightAtten;
    // Cyan rim halo from edge backscatter
    col += colorFillLight * fresnel * fillLightStrength * 0.25;

    // ── Specular ─────────────────────────────────────────────────────────────
    // Lamp below-forward, reflection on bottom face
    vec3  specDir = normalize(vec3(0.05, -1.0, 0.85));
    float spec    = pow(max(0.0, dot(n, normalize(-specDir - rd))), 68.0);
    col += vec3(0.85, 1.0, 1.0) * spec * 0.28 * (1.0 - heightT * 0.5);

    // ── Surface specks (kept from original, dimmed) ───────────────────────────
    vec3  sc  = floor(pos * 14.0);
    vec3  sfr = fract(pos * 14.0) - 0.5;
    float sp  = exp(-dot(sfr,sfr)*30.0) * step(0.98, hash13(sc+7.3))
              * (vnoise(pos*2.2 + vec3(time*0.03)) * 0.6 + 0.4);
    col += vec3(0.88, 0.94, 1.00) * sp * 0.20;

    // ── Tone map ──────────────────────────────────────────────────────────────
    col = col / (col + 0.5) * 1.5;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
