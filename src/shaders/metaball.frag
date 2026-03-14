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

    float alpha = smoothstep(threshold - 0.02, threshold + 0.02, f);
    if (alpha < 0.01) discard;

    // Z=0.4 (less than 0.6 before): more curvature visible in the normal,
    // so wrap lighting can actually show the sphere shape.
    float e  = 0.018;
    float gx = field(p + vec2(e,   0.0)) - field(p - vec2(e,   0.0));
    float gy = field(p + vec2(0.0, e  )) - field(p - vec2(0.0, e  ));
    vec3 normal  = normalize(vec3(gx, -gy, 0.4));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    float thickness = smoothstep(threshold, threshold * 4.5, f);
    float thinness  = 1.0 - thickness;
    float NdotV     = max(0.0, dot(normal, viewDir));
    float fresnel   = pow(1.0 - NdotV, 2.5);

    // ── Lamp light from below ─────────────────────────────────────────────
    // lampDir points FROM the surface TOWARD the lamp (downward in world space).
    // In our coordinate system normal.y < 0 at the bottom of a sphere,
    // so dot(normal, lampDir) is positive at the bottom = lit correctly.
    vec3 lampDir = normalize(vec3(0.0, -1.0, 0.15));

    // ── Wrap lighting ─────────────────────────────────────────────────────
    // Standard wrap formula: (NdotL + wrap) / (1 + wrap)
    // wrap=0.55 means light reaches ~55% past the equator into the shadow side.
    // This is what makes the shadow CURVE AROUND the sphere form rather than
    // cutting straight across like a flat hemisphere.
    float wrap    = 0.55;
    float NdotL   = dot(normal, lampDir);
    float wrapDiff = max(0.0, (NdotL + wrap) / (1.0 + wrap));

    // ── Vertical SSS envelope ─────────────────────────────────────────────
    // How close is this fragment to the lamp below?
    // Quadratic falloff. Minimum 0.2 so even top blobs have enough base
    // light to show their 3D form via wrap lighting.
    float heat   = 1.0 - vUv.y;              // 1.0 at bottom, 0.0 at top
    float sss    = 0.2 + 0.8 * heat * heat;  // 0.20 (top) → 1.00 (bottom)

    // ── Thickness: deeper inside the wax = more SSS ───────────────────────
    float thickBoost = 0.65 + 0.35 * thickness;

    // ── Combine: wrapDiff × sss × thickness ──────────────────────────────
    // This is the key. Each factor independently correct:
    //   wrapDiff  = sphere curvature (dark top, bright bottom, curves with form)
    //   sss       = lamp proximity   (bottom of LAMP is bright, top is darker)
    //   thickBoost = wax depth       (core glows more than thin surface)
    // Together they produce a blob that is:
    //   · Bright bottom + thick core = hottest white-yellow
    //   · Dark top of bottom blob = orange-red (shadowed side of bright blob)
    //   · Top-of-lamp blob = darker overall but STILL shows sphere curvature
    float lightAmt = wrapDiff * sss * thickBoost;

    // Small ambient so shadow side is never fully black
    float totalLight = 0.18 + 1.55 * lightAmt;

    // ── Wax color shifts with both heat and lighting ──────────────────────
    // Fully lit + near lamp = near-white yellow.
    // Shadowed or far from lamp = deep orange-red.
    vec3 waxHot  = mix(colorWaxCore, vec3(1.0, 0.96, 0.80), heat * 0.45);
    vec3 waxCool = colorWaxEdge * 0.55;
    vec3 waxBase = mix(waxCool, waxHot, clamp(lightAmt * 1.4, 0.0, 1.0));

    vec3 col = waxBase * totalLight;

    // ── SSS rim: lamp backlight wraps around edges ────────────────────────
    // Purely additive. Warmth concentrated near the bottom (heat) but
    // present even at the top so isolated top blobs still have a warm glow.
    vec3 rimColor = mix(colorWaxEdge, colorWaxCore, heat * 0.85);
    col += rimColor * fresnel * (0.18 + heat * 0.65) * 1.1;

    // ── Waxy specular ─────────────────────────────────────────────────────
    // From a point slightly below-front, so it lands near the bottom of
    // each sphere (where it would realistically appear with a lamp below).
    vec3  specDir = normalize(vec3(0.15, -0.65, 0.9));
    vec3  hVec    = normalize(specDir + viewDir);
    float spec    = pow(max(0.0, dot(normal, hVec)), 14.0);
    col += mix(colorWaxCore, vec3(1.0, 0.95, 0.82), 0.5) * spec * 0.2 * thickness;

    // ── Background bleed through transparent silhouette edges ─────────────
    // The CSS gradient shows through at thin edges via reduced alpha.
    // No color mixing needed — transparency does the work cleanly.
    float edgeOpacity = smoothstep(0.0, 0.42, thickness);
    alpha *= mix(0.62, 1.0, edgeOpacity);

    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
}
