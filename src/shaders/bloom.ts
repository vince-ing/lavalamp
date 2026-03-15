// Horizontal blur pass — wider 7-tap kernel
export const blurVertH = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const blurFragH = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
varying vec2 vUv;

void main() {
    vec2 texel = vec2(1.0 / resolution.x, 0.0);
    vec4 col = vec4(0.0);
    col += texture2D(tDiffuse, vUv + texel * -6.0) * 0.0196;
    col += texture2D(tDiffuse, vUv + texel * -5.0) * 0.0392;
    col += texture2D(tDiffuse, vUv + texel * -4.0) * 0.0735;
    col += texture2D(tDiffuse, vUv + texel * -3.0) * 0.1201;
    col += texture2D(tDiffuse, vUv + texel * -2.0) * 0.1721;
    col += texture2D(tDiffuse, vUv + texel * -1.0) * 0.1966;
    col += texture2D(tDiffuse, vUv               ) * 0.1966;
    col += texture2D(tDiffuse, vUv + texel *  1.0) * 0.1966;
    col += texture2D(tDiffuse, vUv + texel *  2.0) * 0.1721;
    col += texture2D(tDiffuse, vUv + texel *  3.0) * 0.1201;
    col += texture2D(tDiffuse, vUv + texel *  4.0) * 0.0735;
    col += texture2D(tDiffuse, vUv + texel *  5.0) * 0.0392;
    col += texture2D(tDiffuse, vUv + texel *  6.0) * 0.0196;
    gl_FragColor = col;
}`;

export const blurVertV = blurVertH;

export const blurFragV = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
varying vec2 vUv;

void main() {
    vec2 texel = vec2(0.0, 1.0 / resolution.y);
    vec4 col = vec4(0.0);
    col += texture2D(tDiffuse, vUv + texel * -6.0) * 0.0196;
    col += texture2D(tDiffuse, vUv + texel * -5.0) * 0.0392;
    col += texture2D(tDiffuse, vUv + texel * -4.0) * 0.0735;
    col += texture2D(tDiffuse, vUv + texel * -3.0) * 0.1201;
    col += texture2D(tDiffuse, vUv + texel * -2.0) * 0.1721;
    col += texture2D(tDiffuse, vUv + texel * -1.0) * 0.1966;
    col += texture2D(tDiffuse, vUv               ) * 0.1966;
    col += texture2D(tDiffuse, vUv + texel *  1.0) * 0.1966;
    col += texture2D(tDiffuse, vUv + texel *  2.0) * 0.1721;
    col += texture2D(tDiffuse, vUv + texel *  3.0) * 0.1201;
    col += texture2D(tDiffuse, vUv + texel *  4.0) * 0.0735;
    col += texture2D(tDiffuse, vUv + texel *  5.0) * 0.0392;
    col += texture2D(tDiffuse, vUv + texel *  6.0) * 0.0196;
    gl_FragColor = col;
}`;

export const compositeVert = blurVertH;

// Composite: additive bloom with a subtle cyan tint on the halo
export const compositeFrag = `
uniform sampler2D tBase;
uniform sampler2D tBloom;
uniform float bloomStrength;
varying vec2 vUv;

void main() {
    vec4 base  = texture2D(tBase,  vUv);
    vec4 bloom = texture2D(tBloom, vUv);

    // Tint the bloom slightly cyan — mimics how the lamp light bleeds out
    vec3 bloomTinted = mix(bloom.rgb, bloom.rgb * vec3(0.72, 1.0, 0.96), 0.4);

    gl_FragColor = vec4(base.rgb + bloomTinted * bloomStrength, base.a);
}`;