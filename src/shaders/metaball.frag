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
const float LAMP_DEPTH  = 2.5;
const float CAM_Z       = -2.0;
const int   MAX_ITERS   = 80;
const float MIN_DIST    = 0.02;
const float MAX_STEP    = 0.06;
const float LEN_FACTOR  = 0.45;
const float NDELTA      = 0.001;

// Restored to your original math to fix the weird spikes and movement
float scene(vec3 p) {
    float den = 0.0;
    for (int i = 0; i < 30; i++) {
        if (i >= blobCount) break;
        vec3  dis = blobs[i] - p;
        float r   = radii[i];
        float x   = dot(dis, dis);
        if (x < 0.0001) x = 0.0001;
        den += (r * r) / x;
    }
    if (den < 0.01) return 2.0;
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

// Restored secondary ray loops
float thickness(vec3 entry, vec3 rayDir) {
    vec3  p = entry;
    float t = 0.0;
    for (int i = 0; i < 12; i++) {
        p += rayDir * 0.05;
        t += 0.05;
        if (scene(p) > 0.0) break;
    }
    return t;
}

vec2 heatShimmer(vec2 uv) {
    float heat  = pow(clamp(1.0 - uv.y * 2.3, 0.0, 1.0), 2.0);
    float shift = sin(uv.y * 70.8  - time * 2.4) * 0.6
                + sin(uv.y * 120.3 - time * 3.1 + 1.4) * 0.4;
    return vec2(uv.x + shift * 0.001 * heat, uv.y);
}

// Restored your original trace function with proper bisection to fix geometry tearing
vec4 trace(vec2 uv) {
    float hw     = LAMP_HEIGHT * aspect;
    float worldX = (uv.x - 0.5) * 2.0 * hw;
    float worldY = uv.y * LAMP_HEIGHT;
    vec3 pos    = vec3(worldX, worldY, CAM_Z);
    vec3 rayDir = vec3(0.0, 0.0, 1.0);
    float dist   = 2.0;
    float tMarch = 0.0;
    float tMax   = LAMP_DEPTH + abs(CAM_Z) + 1.0;
    vec3  prevPos = pos;

    for (int i = 0; i < MAX_ITERS; i++) {
        if (tMarch > tMax) break;
        dist = scene(pos);
        if (dist < MIN_DIST) break;
        prevPos = pos;
        float step = min(abs(dist) * LEN_FACTOR, MAX_STEP);
        step = max(step, 0.005);
        pos    += rayDir * step;
        tMarch += step;
    }

    if (dist >= MIN_DIST) return vec4(0.0);

    // Bisection
    vec3 posIn  = pos;
    vec3 posOut = prevPos;
    for (int i = 0; i < 10; i++) {
        vec3  mid = (posIn + posOut) * 0.5;
        if (scene(mid) < 0.0) posIn  = mid;
        else                  posOut = mid;
    }
    pos = (posIn + posOut) * 0.5;
    vec3  N      = sceneNormal(pos);
    vec3  V      = -rayDir;
    float NdotV  = max(0.0, dot(N, V));
    float heat   = 1.0 - clamp(pos.y / LAMP_HEIGHT, 0.0, 1.0);
    float depthT = clamp((pos.z - CAM_Z) / (LAMP_DEPTH + abs(CAM_Z)), 0.0, 1.0);
    float thickN = clamp(thickness(pos, rayDir) / 0.7, 0.0, 1.0);
    float fresnel = pow(1.0 - NdotV, 2.5);
    vec3  keyDir  = normalize(vec3(0.3,  1.0,  0.6));
    vec3  fillDir = normalize(vec3(-0.6, 0.4,  0.7));
    vec3  rimDir  = normalize(vec3(0.5,  0.3, -0.8));

    float dKey  = max(0.0, dot(N, keyDir));
    float dFill = max(0.0, dot(N, fillDir)) * 0.4;
    float dRim  = max(0.0, dot(N, rimDir))  * 0.2;
    float lighting = 0.15 + dKey + dFill + dRim;

    vec3  colorWaxHot = vec3(1.0, 0.68, 0.15);
    vec3  coreHot     = mix(colorWaxCore, colorWaxHot, heat * 0.65);
    vec3  surfaceCol  = mix(colorWaxEdge * 0.7, coreHot,
                            clamp(dKey * 1.2 + heat * 0.25, 0.0, 1.0));
    vec3 col = surfaceCol * lighting;
    col += mix(colorWaxEdge, coreHot, heat * 0.8) * fresnel * 0.5;
    col += colorFillLight * dFill * fillLightStrength * 0.8;

    float sssStr = (1.0 - thickN) * heat * 0.4;
    col += mix(colorWaxEdge, colorWaxHot, heat * 0.5) * sssStr * dKey * 0.5;
    vec3  H    = normalize(keyDir + V);
    float spec = pow(max(0.0, dot(N, H)), 8.0) * 0.15;
    col += vec3(1.0, 0.95, 0.85) * spec;

    col *= mix(1.0, 0.75, depthT * 0.4);
    col  = col / (col + vec3(0.5)) * 1.5;
    col  = mix(col, mix(colorFluidBottom, colorFluidTop,
               clamp(pos.y / LAMP_HEIGHT, 0.0, 1.0)), depthT * 0.10);
    return vec4(col, 1.0);
}

void main() {
    vec2 uv = heatShimmer(vUv);
    
    // Fast 2x diagonal MSAA cuts lag significantly but keeps edges smooth
    vec2 px = vec2(dFdx(uv.x), dFdy(uv.y)) * 0.5;
    vec4 c0 = trace(uv + vec2( 0.5,  0.5) * px);
    vec4 c1 = trace(uv + vec2(-0.5, -0.5) * px);

    vec4 result = (c0 + c1) * 0.5;
    
    // Soft discard threshold allows the anti-aliased edge pixels to blend
    if (result.a < 0.01) discard;
    gl_FragColor = result;
}