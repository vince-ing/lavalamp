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

vec3 lampColor(float h) {
    vec3 c0 = vec3(0.32, 0.48, 0.56);
    vec3 c1 = vec3(0.12, 0.20, 0.34);
    vec3 c2 = vec3(0.10, 0.00, 0.18);
    if (h < 0.5) return mix(c0, c1, h * 2.0);
    else         return mix(c1, c2, (h - 0.5) * 2.0);
}

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
        u.z
    );
}

// ── Blob surface specks: extremely sparse, very slow ─────────────────────────
float dustSpecks(vec3 p) {
    vec3  cell  = floor(p * 14.0);
    vec3  fr    = fract(p * 14.0) - 0.5;

    // Very slow pulse: full cycle takes ~60-120 seconds
    float slowTime = time * 0.000000000005;  // stretch time way out
    float phase    = hash13(cell) * 6.2832;
    float pulse    = 0.5 + 0.05 * sin(slowTime + phase);

    float d2    = dot(fr, fr);
    float shape = exp(-d2 * 30.0);

    // Only ~3% of cells — much sparser than before
    float exists = step(0.98, hash13(cell + 7.3));

    return shape * pow(pulse, 3.0) * exists;
}

// ── Background dust: sharp + blurry layers, small, slowly drifting ───────────

// Sharp pinpoint motes
float bgDustSharp(vec2 wp) {
    vec2 driftPos = wp;
    driftPos.y -= time * 0.04;
    driftPos.x += sin(time * 0.05 + wp.y * 1.1) * 0.03;

    float scale = 16.0;             // fine lattice → small motes
    vec2  cell  = floor(driftPos * scale);
    vec2  fr    = fract(driftPos * scale) - 0.5;

    // Random sub-cell jitter so motes aren't on a grid
    float ox = hash12(cell)                    - 0.5;
    float oy = hash12(cell + vec2(3.7, 8.1))   - 0.5;
    vec2  d  = fr - vec2(ox, oy) * 0.38;

    float d2    = dot(d, d);
    // Tight falloff → sharp pinpoint
    float shape = exp(-d2 * 55.0);

    float phase = hash12(cell + vec2(1.3, 5.7)) * 6.2832;
    float rate  = 0.03 + hash12(cell + vec2(9.1, 2.3)) * 0.06;
    float pulse = 0.5 + 0.5 * sin(time * rate + phase);

    // ~10% occupancy
    float exists = step(0.975, hash12(cell + vec2(4.4, 6.6)));

    return shape * pow(pulse, 2.0) * exists;
}

// Soft blurry motes — same idea but loose falloff, different lattice phase
float bgDustBlurry(vec2 wp) {
    vec2 driftPos = wp;
    // Slightly different drift direction and speed from sharp layer
    driftPos.y -= time * 0.028;
    driftPos.x += sin(time * 0.038 + wp.y * 0.7 + 2.1) * 0.045;

    float scale = 4.0;              // coarser lattice → more spread out
    vec2  cell  = floor(driftPos * scale);
    vec2  fr    = fract(driftPos * scale) - 0.5;

    float ox = hash12(cell + vec2(5.1, 1.9))   - 0.5;
    float oy = hash12(cell + vec2(2.3, 7.4))   - 0.5;
    vec2  d  = fr - vec2(ox, oy) * 0.40;

    float d2    = dot(d, d);
    // Wide falloff → soft halo
    float shape = exp(-d2 * 20.0);

    float phase = hash12(cell + vec2(6.2, 3.8)) * 6.2832;
    float rate  = 0.02 + hash12(cell + vec2(1.7, 8.5)) * 0.04;
    float pulse = 0.5 + 0.5 * sin(time * rate + phase);

    // ~12% occupancy
    float exists = step(0.93, hash12(cell + vec2(7.1, 0.3)));

    return shape * pow(pulse, 2.0) * exists;
}

// ── Surface undulation ────────────────────────────────────────────────────────
float surfaceWave(vec3 p) {
    vec3  q = p * 3.8 + vec3(time * 0.022, time * 0.016, time * 0.011);
    float n = vnoise(q)        * 0.65
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

float estimateThickness(vec3 hitPos, vec3 lightDir) {
    float thickness = 0.0;
    vec3  p = hitPos;
    float stepSize = 0.08;
    for (int i = 0; i < 8; i++) {
        p += lightDir * stepSize;
        float den = rawDensity(p);
        thickness += clamp(den - 0.333, 0.0, 2.0) * stepSize;
    }
    return thickness;
}

vec3 lighting(vec3 n, vec3 l, vec3 rd,
              vec3 kl, vec3 kd, vec3 ks, vec3 ksr,
              float km, float kn) {
    float ndl  = dot(n, l);
    float pndl = clamp(ndl, 0.0, 1.0);
    vec3  sss  = 0.75 * exp(-1.6 * abs(ndl) / (ksr + 0.001));
    vec3  h    = normalize(l - rd);
    float ndh  = dot(n, h);
    float g    = ndh * ndh * (km * km - 1.0) + 1.0;
    float ggx  = km * km / (PI * g * g);
    float fre  = 1.0 + dot(rd, n);
    float f0   = (kn - 1.0) / (kn + 1.0);
          f0   = f0 * f0;
    float kr   = f0 + (1.0 - f0) * (1.0 - km) * (1.0 - km) * pow(fre, 5.0);
    return kl * (pndl * (kd + kr * ggx) + kd * ks * ksr * sss);
}

void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    float worldX = (uv.x - 0.5) * LAMP_HEIGHT * aspect;
    float worldY = uv.y * LAMP_HEIGHT;

    vec3 pos = vec3(worldX, worldY, CAM_Z);
    vec3 ray = vec3(0.0, 0.0, 1.0);

    float dist   = 2.0;
    float tMarch = 0.0;
    for (int i = 0; i < MAX_ITERS; i++) {
        dist = scene(pos);
        if (dist < MIN_DIST) break;
        if (tMarch > 6.0) break;
        float step = clamp(dist * 0.42, 0.005, 0.08);
        pos    += ray * step;
        tMarch += step;
    }

    if (dist >= MIN_DIST) {
        float bgH    = vUv.y;
        vec3  lc     = lampColor(bgH);
        float bgGlow = pow(1.0 - vUv.y, 1.4);
        float xDist  = abs(vUv.x - 0.5) * 2.0;
        float colFoc = pow(1.0 - clamp(xDist, 0.0, 1.0), 2.5) * 0.5;
        vec3 bg = lc * (bgGlow * 0.55 + 0.04);
        bg += lc * colFoc * bgGlow * 0.5;
        vec2 suv = vUv * 2.0 - 1.0;
        suv.x   *= aspect;
        float vig = 1.0 - clamp(dot(suv, suv) * 0.45, 0.0, 1.0);
        bg *= 0.35 + 0.65 * vig;

        // Edge fade — motes disappear near top/bottom
        float fadeY = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.88, vUv.y);

        // Sharp pinpoints — bright, crisp
        float sharp  = bgDustSharp(vec2(worldX, worldY));
        bg += vec3(0.78, 0.88, 1.00) * sharp * 0.22 * fadeY;

        // Blurry halos — dimmer, softer
        float blurry = bgDustBlurry(vec2(worldX, worldY));
        bg += vec3(0.65, 0.78, 1.00) * blurry * 0.10 * fadeY;

        gl_FragColor = vec4(bg, 1.0);
        return;
    }

    vec3  n    = sceneNormal(pos);
    float waxH = 1.0 - clamp(pos.y / LAMP_HEIGHT, 0.0, 1.0);
    vec3  surfColor = lampColor(waxH);

    vec3  kd      = surfColor * 1.1 + 0.05;
    vec3  ks      = mix(vec3(0.4, 0.1, 0.6), vec3(0.15, 0.45, 0.6), waxH);
    float sssBase = mix(0.3, 1.2, waxH);
    vec3  ksr     = sssBase * (surfColor * 1.3 + 0.05);
    float km      = 0.85;
    float kn      = 1.45;

    vec3 keyL   = normalize(vec3(0.05, -1.0, 0.6));
    vec3 keyCol = vec3(0.40, 0.58, 0.68) * 1.0;
    vec3 rimL   = normalize(vec3(-0.3, 0.5, 0.5));
    vec3 rimCol = vec3(0.08, 0.00, 0.16) * 0.4;

    vec3 col = lighting(n, -keyL, ray, keyCol, kd, ks, ksr, km, kn)
             + lighting(n,  rimL, ray, rimCol, kd, ks, ksr * 0.4, km, kn);

    col = 2.0 * col / (0.8 + 2.5 * col);
    col = pow(max(col, 0.0), vec3(0.8));

    vec3  lightDir  = normalize(vec3(0.05, -1.0, 0.6));
    float thickness = estimateThickness(pos, -lightDir);
    float thinness  = exp(-thickness * 7.5);
    vec3  sssColor  = vec3(0.00, 1.00, 0.85);
    col += sssColor * thinness * 1.75;

    // Blob specks: 3% cells, cycle time ~60-120s, very faint
    float speck   = dustSpecks(pos);
    float cluster = vnoise(pos * 2.2 + vec3(time * 0.03)) * 0.6 + 0.4;
    col += vec3(0.88, 0.94, 1.00) * speck * cluster * 0.35;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}