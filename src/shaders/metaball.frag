uniform vec2 blobs[25];
uniform float radii[25];
uniform int blobCount;
uniform float threshold;
uniform float time;
uniform float aspect;

uniform vec3 colorFluidTop;
uniform vec3 colorFluidBottom;
uniform vec3 colorWaxEdge;
uniform vec3 colorWaxCore;

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
        f += wyvill(dx*dx + dy*dy, radii[i] * 2.8);
    }
    return f;
}

void main() {
    vec2 p = vec2((vUv.x - 0.5) * 4.0 * aspect, vUv.y * 4.0);
    float f = field(p);

    float alpha = smoothstep(threshold - 0.018, threshold + 0.018, f);
    if (alpha < 0.01) discard;

    float e  = 0.018;
    float gx = field(p + vec2(e,   0.0)) - field(p - vec2(e,   0.0));
    float gy = field(p + vec2(0.0, e  )) - field(p - vec2(0.0, e  ));
    vec3 normal  = normalize(vec3(gx, -gy, 0.4));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    float thickness = smoothstep(threshold, threshold * 4.5, f);
    float NdotV     = max(0.0, dot(normal, viewDir));
    float fresnel   = pow(1.0 - NdotV, 2.5);

    // ── Vertical SSS: lamp proximity ──────────────────────────────────────
    float heat = 1.0 - vUv.y;              // 1.0 bottom, 0.0 top
    float sss  = 0.28 + 0.72 * heat * heat; // 0.28 top → 1.0 bottom

    // ── Wrap diffuse from lamp below ──────────────────────────────────────
    // wrap=0.55 so shadow terminator curves around the sphere form.
    // Low ambient (0.08) preserves dramatic contrast between lit/shadow.
    vec3  lampDir  = normalize(vec3(0.0, -1.0, 0.2));
    float wrap     = 0.55;
    float NdotL    = dot(normal, lampDir);
    float wrapDiff = max(0.0, (NdotL + wrap) / (1.0 + wrap));

    // Ambient is intentionally LOW — contrast is what makes it look 3D.
    // The SSS glow will lift the shadow side warmly without flattening it.
    float ambient  = 0.08;
    float diffuse  = ambient + (1.0 - ambient) * wrapDiff;

    // ── SSS volumetric glow ───────────────────────────────────────────────
    // This is the "incandescent" look. It is MULTIPLIED by sss not added
    // uniformly, so it concentrates near the lamp and inside thick wax.
    // It lifts the shadow side warmly without blowing out contrast:
    //   shadow side wrapDiff≈0.1 × glow=1.5 = 0.15  (warm dark orange)
    //   lit side    wrapDiff≈0.9 × glow=1.5 = 1.35  (bright yellow-orange)
    // The ratio stays ~9:1 — contrast intact but shadow side glows warmly.
    float glowMult = 1.0 + 1.8 * sss * (0.5 + 0.5 * thickness);
    float totalLight = diffuse * glowMult;

    // ── Wax color ─────────────────────────────────────────────────────────
    // Lit face near lamp → near-white yellow.  Shadow / top → deep orange-red.
    vec3 waxHot  = mix(colorWaxCore, vec3(1.0, 0.97, 0.78), heat * 0.6);
    vec3 waxCool = colorWaxEdge * 0.65;
    // Drive color from BOTH wrapDiff and sss so lit bottom face is hottest
    float colorT = clamp(wrapDiff * sss * 1.6, 0.0, 1.0);
    vec3 waxBase = mix(waxCool, waxHot, colorT);

    vec3 col = waxBase * totalLight;

    // ── SSS rim: backlit warm edge glow ───────────────────────────────────
    // Fresnel-based rim, modulated by heat so bottom blobs have a hot rim
    // and top blobs have a subtler one. Purely additive.
    vec3 rimColor = mix(colorWaxEdge, colorWaxCore, heat * 0.9);
    col += rimColor * fresnel * (0.2 + heat * 0.7) * 1.1;

    // ── Specular ──────────────────────────────────────────────────────────
    // Lamp is below — spec lands on the lower portion of each sphere.
    vec3  specDir = normalize(vec3(0.1, -0.7, 0.85));
    vec3  hVec    = normalize(specDir + viewDir);
    float spec    = pow(max(0.0, dot(normal, hVec)), 16.0);
    col += mix(colorWaxCore, vec3(1.0, 0.95, 0.82), 0.5) * spec * 0.28 * thickness;

    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
}
