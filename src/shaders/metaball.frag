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
const int   MAX_ITERS   = 60;
const float MIN_DIST    = 0.005;
const float NDELTA      = 0.002;
const float PI          = 3.141592;

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
    return 1.0 / den - 1.0;
}

vec3 sceneNormal(vec3 p) {
    float e = NDELTA;
    return normalize(vec3(
        scene(p + vec3(e,0,0)) - scene(p - vec3(e,0,0)),
        scene(p + vec3(0,e,0)) - scene(p - vec3(0,e,0)),
        scene(p + vec3(0,0,e)) - scene(p - vec3(0,0,e))
    ));
}

vec3 lighting(vec3 n, vec3 l, vec3 rd, vec3 kl, vec3 kd, vec3 ks, vec3 ksr, float km, float kn) {
    float ndl  = dot(n, l);
    float pndl = clamp( ndl, 0.0, 1.0);
    float nndl = clamp(-ndl, 0.0, 1.0);

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
    // Flip Y so blobs spawn/move bottom-up and light reads correctly
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
        float step = clamp(dist * 0.4, 0.005, 0.08);
        pos    += ray * step;
        tMarch += step;
    }

    if (dist >= MIN_DIST) {
        // Background: illuminated liquid, lit from below
        // Use original vUv.y (unflipped) so the glow is still at screen bottom
        float yT     = vUv.y;
        float bgGlow = pow(1.0 - yT, 1.4);  // steeper falloff = brighter bottom band

        float xDist  = abs(vUv.x - 0.5) * 2.0;
        float colFoc = pow(1.0 - clamp(xDist, 0.0, 1.0), 2.5) * 0.5;  // wider column glow

        vec3 bgWarm  = vec3(0.00, 0.38, 0.42);  // much brighter warm teal at base
        vec3 bgMid   = vec3(0.00, 0.07, 0.14);
        vec3 bgBlack = vec3(0.00, 0.00, 0.02);

        vec3 bg = mix(bgBlack, bgMid, bgGlow);
        bg      = mix(bg, bgWarm, bgGlow * bgGlow * 1.2);
        bg     += bgWarm * colFoc * bgGlow * 0.8;

        vec2  suv = vUv * 2.0 - 1.0;
        suv.x    *= aspect;
        float vig = 1.0 - clamp(dot(suv, suv) * 0.45, 0.0, 1.0);
        bg       *= 0.4 + 0.6 * vig;

        gl_FragColor = vec4(bg, 1.0);
        return;
    }

    // Wax surface
    vec3 n  = sceneNormal(pos);
    float h = clamp(pos.y / LAMP_HEIGHT, 0.0, 1.0);

    vec3  kd  = vec3(0.72, 0.82, 0.86);
    vec3  ks  = mix(vec3(0.3, 1.0, 0.8), vec3(0.2, 0.5, 1.0), h);
    float sssBase = mix(1.2, 0.35, h);
    vec3  ksr = sssBase * vec3(0.25, 1.0, 0.65);
    float km  = 0.85;
    float kn  = 1.45;

    vec3  keyL   = normalize(vec3(0.05, -1.0, 0.6));
    vec3  keyCol = vec3(0.15, 0.85, 0.70) * 1.2;
    vec3  rimL   = normalize(vec3(-0.3, 0.5, 0.5));
    vec3  rimCol = vec3(0.10, 0.30, 0.55) * 0.35;

    vec3 col = lighting(n, -keyL, ray, keyCol, kd, ks, ksr, km, kn)
             + lighting(n,  rimL, ray, rimCol, kd, ks, ksr * 0.4, km, kn);

    col = 2.0 * col / (0.8 + 2.5 * col);
    col = pow(max(col, 0.0), vec3(0.4545));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
