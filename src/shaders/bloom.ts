// Horizontal blur pass
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
    col += texture2D(tDiffuse, vUv + texel * -4.0) * 0.0539;
    col += texture2D(tDiffuse, vUv + texel * -3.0) * 0.1216;
    col += texture2D(tDiffuse, vUv + texel * -2.0) * 0.1945;
    col += texture2D(tDiffuse, vUv + texel * -1.0) * 0.2257;
    col += texture2D(tDiffuse, vUv                ) * 0.2257;
    col += texture2D(tDiffuse, vUv + texel *  1.0) * 0.2257;
    col += texture2D(tDiffuse, vUv + texel *  2.0) * 0.1945;
    col += texture2D(tDiffuse, vUv + texel *  3.0) * 0.1216;
    col += texture2D(tDiffuse, vUv + texel *  4.0) * 0.0539;
    gl_FragColor = col;
}`;

// Vertical blur pass
export const blurVertV = blurVertH;

export const blurFragV = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
varying vec2 vUv;

void main() {
    vec2 texel = vec2(0.0, 1.0 / resolution.y);
    vec4 col = vec4(0.0);
    col += texture2D(tDiffuse, vUv + texel * -4.0) * 0.0539;
    col += texture2D(tDiffuse, vUv + texel * -3.0) * 0.1216;
    col += texture2D(tDiffuse, vUv + texel * -2.0) * 0.1945;
    col += texture2D(tDiffuse, vUv + texel * -1.0) * 0.2257;
    col += texture2D(tDiffuse, vUv                ) * 0.2257;
    col += texture2D(tDiffuse, vUv + texel *  1.0) * 0.2257;
    col += texture2D(tDiffuse, vUv + texel *  2.0) * 0.1945;
    col += texture2D(tDiffuse, vUv + texel *  3.0) * 0.1216;
    col += texture2D(tDiffuse, vUv + texel *  4.0) * 0.0539;
    gl_FragColor = col;
}`;

// Additive composite pass
export const compositeVert = blurVertH;

export const compositeFrag = `
uniform sampler2D tBase;
uniform sampler2D tBloom;
uniform float bloomStrength;
varying vec2 vUv;

void main() {
    vec4 base  = texture2D(tBase,  vUv);
    vec4 bloom = texture2D(tBloom, vUv);
    gl_FragColor = vec4(base.rgb + bloom.rgb * bloomStrength, base.a);
}`;