uniform vec2 blobs[25];
uniform float radii[25];
uniform int blobCount;
uniform float threshold;
uniform float time;
uniform float aspect;

varying vec2 vUv;

float wyvill(float d2, float R) {
    float r2 = R * R;
    if (d2 >= r2) return 0.0;
    float t = 1.0 - d2 / r2;
    return t * t * t;
}

float field(vec2 p) {
    float f = 0.0;
    for (int i = 0; i < 25; i++) {
        if (i >= blobCount) break;
        float dx = p.x - blobs[i].x;
        float dy = p.y - blobs[i].y;
        // 2.8x influence radius: blobs reach far enough to stretch toward
        // neighbours and form organic necks before their centers touch
        f += wyvill(dx*dx + dy*dy, radii[i] * 2.8);
    }
    return f;
}

void main() {
    vec2 p = vec2((vUv.x - 0.5) * 4.0 * aspect, vUv.y * 4.0);
    float f = field(p);

    float alpha = smoothstep(threshold - 0.018, threshold + 0.018, f);
    if (alpha < 0.01) discard;

    float e = 0.014;
    vec3 normal = normalize(vec3(
        field(p + vec2(e, 0)) - field(p - vec2(e, 0)),
        field(p + vec2(0, e)) - field(p - vec2(0, e)),
        0.20
    ));

    vec3 keyDir  = normalize(vec3(-0.5,  0.8, 1.0));
    vec3 rimDir  = normalize(vec3( 0.9,  0.3, 0.6));
    vec3 fillDir = normalize(vec3( 0.0, -0.7, 0.5));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    float keyDiff  = max(0.0, dot(normal, keyDir));
    float rimDiff  = max(0.0, dot(normal, rimDir));
    float fillDiff = max(0.0, dot(normal, fillDir));
    float keySpec  = pow(max(0.0, dot(normalize(keyDir + viewDir), normal)), 64.0);
    float rimSpec  = pow(max(0.0, dot(normalize(rimDir + viewDir), normal)), 28.0);

    vec3 col = vec3(0.12, 0.01, 0.28);
    col = mix(col, vec3(0.72, 0.04, 0.08), keyDiff * 0.6);
    col = mix(col, vec3(1.00, 0.42, 0.02), smoothstep(0.45, 1.0, keyDiff));
    col += vec3(0.08, 0.18, 0.85) * rimDiff  * 0.5;
    col += vec3(0.35, 0.00, 0.55) * fillDiff * 0.3;
    col += vec3(1.00, 0.88, 0.75) * keySpec  * 0.85;
    col += vec3(0.55, 0.75, 1.00) * rimSpec  * 0.45;
    col  = mix(col, vec3(1.0, 0.6, 0.15), smoothstep(threshold * 2.0, threshold * 5.0, f) * 0.3);

    gl_FragColor = vec4(col, alpha);
}
