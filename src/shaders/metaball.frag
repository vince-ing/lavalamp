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

float surfaceWave(vec3 p) {
    vec3  q = p * 3.8 + vec3(time * 0.022, time * 0.016, time * 0.011);
    float n = vnoise(q) * 0.65
            + vnoise(q * 1.9 + vec3(3.7, 8.1, 2.4)) * 0.35;
    return pow(clamp(n, 0.0, 1.0), 8.0);
}

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
    vec3 warp = vec3(
        vnoise(p * 0.8 + vec3(time * 0.04, 0.0, 1.7)),
        vnoise(p * 0.8 + vec3(0.0, time * 0.035, 3.4)),
        vnoise(p * 0.8 + vec3(5.1, time * 0.03, 0.0))
    ) * 2.0 - 1.0;
    vec3 pw = p + warp * 0.38;

    float den = rawDensity(pw);
    if (den < 0.333) return 2.0;
    float baseDist  = 1.0 / den - 1.0;
    float proximity = exp(-abs(baseDist) * 16.0);
    float noiseAmp  = 0.045 * proximity;
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
    vec2  uv     = vec2(vUv.x, 1.0 - vUv.y);
    float worldX = (uv.x - 0.5) * LAMP_HEIGHT * aspect;
    float worldY = uv.y * LAMP_HEIGHT;

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

    vec3 col = vec3(0.0);

    if (dist >= MIN_DIST) {
        // ── Background ────────────────────────────────────────────────────────
        vec3 bg = mix(colorFluidBottom, colorFluidTop, vUv.y * vUv.y);
        float cx      = uv.x - 0.5;
        float cone    = exp(-cx*cx*22.0) * exp(-vUv.y * 3.2);
        float rimGlow = exp(-abs(abs(cx)-0.42)*28.0) * exp(-vUv.y*2.0) * 0.3;
        bg += colorFillLight * (cone * 0.5 + rimGlow) * 0.65;
        vec2  suv = vUv * 2.0 - 1.0;
        suv.x    *= aspect;
        float vig = 1.0 - clamp(dot(suv,suv) * 0.38, 0.0, 1.0);
        bg *= 0.28 + 0.72 * vig;
        float fadeY = smoothstep(0.0,0.15,uv.y) * smoothstep(1.0,0.9,uv.y);
        bg += vec3(0.55,0.85,1.00) * bgDustSharp(vec2(worldX,worldY))  * 0.18 * fadeY;
        bg += vec3(0.45,0.72,1.00) * bgDustBlurry(vec2(worldX,worldY)) * 0.08 * fadeY;
        col = bg;

    } else {
        // ── Blobs ─────────────────────────────────────────────────────────────
        vec3  n   = sceneNormal(pos);
        vec3  rd  = ray;

        float heightT = clamp(pos.y / LAMP_HEIGHT, 0.0, 1.0);

        vec3  lampDir  = normalize(vec3(0.05, -1.0, 0.5));
        float NdotL    = dot(n, -lampDir);
        float litFace  = max(0.0,  NdotL);
        float darkFace = max(0.0, -NdotL);

        float NdotV   = max(0.0, dot(n, -rd));
        float fresnel = pow(1.0 - NdotV, 2.5);

        float thickness = estimateThickness(pos, lampDir);
        float thinness  = exp(-thickness * 6.0);

        float heightAtten = 1.0 - heightT * heightT * 0.5;

        vec3 waxLit    = vec3(0.169, 0.573, 0.922);
        vec3 waxShadow = vec3(0.09, 0.071, 0.62);
        waxShadow = mix(waxShadow, vec3(0.0, 1.0, 0.7) * 1.0, smoothstep(0.0, 0.9, heightT));
        vec3 waxRim    = colorFluidBottom * 0.35 + colorWaxEdge * 0.15;

        float shadowBlend = smoothstep(0.0, 1.0, darkFace * 1.2);
        vec3  waxBase     = mix(waxLit, waxShadow, shadowBlend);
        waxBase = mix(waxBase, waxRim, fresnel * 0.68);

        float sssBlend = clamp(fresnel * 0.5 + thinness * 0.65, 0.0, 1.0);
        waxBase = mix(waxBase, colorFillLight * 0.65, sssBlend * fillLightStrength * 0.90);

        float wrap     = 0.4;
        float wrapDiff = clamp((litFace + wrap) / (1.0 + wrap), 0.0, 1.0);
        float diffuse  = mix(0.03, 0.88, wrapDiff * wrapDiff) * heightAtten;
        col = waxBase * clamp(diffuse, 0.0, 1.0);

        col += colorFillLight * litFace  * heightAtten * fillLightStrength * 0.55;
        col += colorFillLight * thinness * fillLightStrength * 0.65 * heightAtten;
        col += colorFillLight * fresnel  * fillLightStrength * 0.18;

        vec3  specDir = normalize(vec3(0.05, -1.0, 0.85));
        float spec    = pow(max(0.0, dot(n, normalize(-specDir - rd))), 18.0);
        col += mix(colorFillLight * 0.5, vec3(1.0), 0.3) * spec * 0.10 * (1.0 - heightT * 0.4);

        float bulbAtten = exp(-(1.0 - heightT) * 6.5);
        vec3  bulbColor = vec3(0.0, 0.95, 0.80) * 1.4;
        col += bulbColor * litFace  * bulbAtten * 5.45;
        col += bulbColor * thinness * bulbAtten * 6.55;
        col += bulbColor * fresnel  * bulbAtten * 6.30;

        vec3  sc  = floor(pos * 14.0);
        vec3  sfr = fract(pos * 14.0) - 0.5;
        float sp  = exp(-dot(sfr,sfr)*30.0) * step(0.98, hash13(sc+7.3))
                  * (vnoise(pos*2.2 + vec3(time*0.03)) * 0.6 + 0.4);
        col += vec3(0.88, 0.94, 1.00) * sp * 0.20;

        col = col / (col + 0.5) * 1.5;
    }

    // ── Bayer 4x4 dither — applied to BOTH background and blobs ──────────────
    mat4 bayer = mat4(
         0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
        12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
         3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
        15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
    );
    ivec2 px        = ivec2(mod(gl_FragCoord.xy, 5.0));
    float threshold = bayer[px.x][px.y];
    float luma      = dot(col, vec3(0.299, 0.587, 0.114));
    float dithered = floor(luma * 4.0 + threshold) / 4.0;

    vec3 black = vec3(0.08, 0.03, 0.14);
    vec3 dark  = vec3(0.22, 0.08, 0.35);
    vec3 mid   = vec3(0.55, 0.25, 0.75);
    vec3 light = vec3(0.98, 0.88, 0.92);

    col = dithered < 0.2  ? black :
        dithered < 0.5  ? dark  :
        dithered < 0.78 ? mid   : light;

    gl_FragColor = vec4(col, 1.0);
}
