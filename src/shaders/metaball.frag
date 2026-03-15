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

// ──────────────────────────────────────────────
//  Shared lamp palette
//  h = 0  → screen TOP    (bright cyan, lit from above)
//  h = 1  → screen BOTTOM (deep purple, cool/dark)
// ──────────────────────────────────────────────

vec3 lampColor(float h) {
    vec3 c0 = vec3(0.00, 0.95, 0.80);   // top:    electric cyan
    vec3 c1 = vec3(0.00, 0.55, 0.65);   // mid:    teal
    vec3 c2 = vec3(0.22, 0.00, 0.38);   // bottom: deep purple

    if (h < 0.5) return mix(c0, c1, h * 2.0);
    else         return mix(c1, c2, (h - 0.5) * 2.0);
}

// ──────────────────────────────────────────────
//  Sparse bumps (unchanged)
// ──────────────────────────────────────────────

float hash13(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
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

float sparseBumps(vec3 p) {
    vec3 q = p * 3.8 + vec3(time * 0.022, time * 0.016, time * 0.011);
    float n = vnoise(q)        * 0.65
            + vnoise(q * 1.9 + vec3(3.7, 8.1, 2.4)) * 0.35;
    return pow(clamp(n, 0.0, 1.0), 8.0);
}

// ──────────────────────────────────────────────
//  Metaball SDF
// ──────────────────────────────────────────────

float scene(vec3 p) {
    float den = 0.0;
    for (int i = 0; i < 30; i++) {
        if (i >= blobCount) break;
        vec3  d = blobs[i] - p;
        float x = dot(d, d);
        float r = radii[i];
        den += (r * r) / max(x, 0.0001);
    }
    if (den < 0.333) return 2.0;

    float baseDist = 1.0 / den - 1.0;
    float proximity = exp(-abs(baseDist) * 16.0);
    float noiseAmp  = 0.032 * proximity;
    return baseDist - sparseBumps(p) * noiseAmp;
}

vec3 sceneNormal(vec3 p) {
    float e = NDELTA;
    return normalize(vec3(
        scene(p + vec3(e,0,0)) - scene(p - vec3(e,0,0)),
        scene(p + vec3(0,e,0)) - scene(p - vec3(0,e,0)),
        scene(p + vec3(0,0,e)) - scene(p - vec3(0,0,e))
    ));
}

vec3 lighting(vec3 n, vec3 l, vec3 rd,
              vec3 kl, vec3 kd, vec3 ks, vec3 ksr,
              float km, float kn) {
    float ndl  = dot(n, l);
    float pndl = clamp(ndl, 0.0, 1.0);

    vec3 sss = 0.2 * exp(-3.0 * abs(ndl) / (ksr + 0.001));

    vec3  h   = normalize(l - rd);
    float ndh = dot(n, h);
    float g   = ndh * ndh * (km * km - 1.0) + 1.0;
    float ggx = km * km / (PI * g * g);

    float fre = 1.0 + dot(rd, n);
    float f0  = (kn - 1.0) / (kn + 1.0);
          f0  = f0 * f0;
    float kr  = f0 + (1.0 - f0) * (1.0 - km) * (1.0 - km) * pow(fre, 5.0);

    return kl * (pndl * (kd + kr * ggx) + kd * ks * ksr * sss);
}

void main() {
    // worldY: 0=world bottom (screen bottom), LAMP_HEIGHT=world top (screen top)
    // The shader flips Y: vUv.y=0 → uv.y=1 → worldY=LAMP_HEIGHT → screen TOP
    //                     vUv.y=1 → uv.y=0 → worldY=0           → screen BOTTOM
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
        // ── Background ──────────────────────────────
        // vUv.y=0 → screen top, vUv.y=1 → screen bottom (due to Y flip)
        // We want h=0 (cyan) at screen top → h = vUv.y
        float bgH = vUv.y;   // 0=screen top (cyan), 1=screen bottom (purple)

        vec3 lc = lampColor(bgH);

        // Glow at screen top (vUv.y near 0)
        float bgGlow = pow(1.0 - vUv.y, 1.4);
        float xDist  = abs(vUv.x - 0.5) * 2.0;
        float colFoc = pow(1.0 - clamp(xDist, 0.0, 1.0), 2.5) * 0.5;

        vec3 bg = lc * (bgGlow * 0.55 + 0.04);
        bg += lc * colFoc * bgGlow * 0.5;

        vec2 suv = vUv * 2.0 - 1.0;
        suv.x   *= aspect;
        float vig = 1.0 - clamp(dot(suv, suv) * 0.45, 0.0, 1.0);
        bg *= 0.35 + 0.65 * vig;

        gl_FragColor = vec4(bg, 1.0);
        return;
    }

    // ── Wax surface ─────────────────────────────
    vec3 n = sceneNormal(pos);

    // pos.y=0 → world bottom → screen bottom → purple (h=1)
    // pos.y=LAMP_HEIGHT → world top → screen top → cyan (h=0)
    // So: h = 1.0 - (pos.y / LAMP_HEIGHT)
    float waxH = 1.0 - clamp(pos.y / LAMP_HEIGHT, 0.0, 1.0);

    vec3 surfColor = lampColor(waxH);

    vec3  kd      = surfColor * 1.1 + 0.08;
    vec3  ks      = mix(vec3(0.7, 0.2, 1.0), vec3(0.3, 1.0, 0.85), waxH);
    float sssBase = mix(0.3, 1.4, waxH);
    vec3  ksr     = sssBase * (surfColor * 1.5 + 0.1);
    float km      = 0.85;
    float kn      = 1.45;

    // Key light from below — unchanged, cyan tint
    vec3 keyL   = normalize(vec3(0.05, -1.0, 0.6));
    vec3 keyCol = lampColor(0.0) * 1.35;

    // Rim from above — purple tint
    vec3 rimL   = normalize(vec3(-0.3, 0.5, 0.5));
    vec3 rimCol = lampColor(1.0) * 0.45;

    vec3 col = lighting(n, -keyL, ray, keyCol, kd, ks, ksr, km, kn)
             + lighting(n,  rimL, ray, rimCol, kd, ks, ksr * 0.4, km, kn);

    col = 2.0 * col / (0.8 + 2.5 * col);
    col = pow(max(col, 0.0), vec3(0.4545));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
