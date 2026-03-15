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
const float NDELTA      = 0.001;

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

void main() {
    // Match the reference: uv centered, divided by height for square pixels
    vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);

    vec3 ray = normalize(vec3(uv, 1.0));
    // Cam placed so blobs (which live around y=LAMP_HEIGHT/2, z=0) are visible
    vec3 cam = vec3(uv.x * LAMP_HEIGHT * aspect * 0.5 + (vUv.x - 0.5) * LAMP_HEIGHT * aspect,
                    vUv.y * LAMP_HEIGHT,
                    CAM_Z);

    // Simpler: map uv directly to world coords like previous working version
    float worldX = (vUv.x - 0.5) * LAMP_HEIGHT * aspect;
    float worldY = vUv.y * LAMP_HEIGHT;
    vec3 pos = vec3(worldX, worldY, CAM_Z);
    ray = vec3(0.0, 0.0, 1.0);

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

    // uv centered on screen, y up — for the background vignette formula
    vec2 suv = vUv * 2.0 - 1.0;
    suv.x *= aspect;

    float b;
    if (dist < MIN_DIST) {
        // Hit a blob: normal-based brightness, same as reference
        vec3 n = sceneNormal(pos);
        b = -0.5 * n.y + 0.5;
    } else {
        // Miss: reference background formula — soft vignette
        b = (-0.5 * suv.y + 0.5) * cos(suv.x);
    }
    b = clamp(b, 0.0, 1.0);

    // Exact reference hue cycling
    float t         = time * 0.4;
    float smallTime = smoothstep(0.0, 1.0, fract(t));
    float bigTime   = mod(t, 6.0);

    vec3 col = vec3(0.0);
    if (bigTime < 1.0) {
        col.r = b; col.g = b * smallTime;
    } else if (bigTime < 2.0) {
        col.g = b; col.r = (1.0 - smallTime) * b;
    } else if (bigTime < 3.0) {
        col.g = b; col.b = b * smallTime;
    } else if (bigTime < 4.0) {
        col.b = b; col.g = (1.0 - smallTime) * b;
    } else if (bigTime < 5.0) {
        col.b = b; col.r = b * smallTime;
    } else {
        col.r = b; col.b = (1.0 - smallTime) * b;
    }

    gl_FragColor = vec4(col, 1.0);
}
