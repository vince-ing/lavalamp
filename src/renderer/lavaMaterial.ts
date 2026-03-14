import * as THREE from 'three';
import { MAX_BLOBS } from '../core/constants';
import { SHADER_COLORS, FILL_LIGHT_STRENGTH } from '../core/config';
import vertexShader   from '../shaders/metaball.vert?raw';
import fragmentShader from '../shaders/metaball.frag?raw';

export type LayerType = 'front' | 'middle' | 'back';

const fogMap: Record<LayerType, number> = {
    front:  0.0,   // no fog
    middle: 0.27,  // slight haze
    back:   0.40,  // strong atmospheric fade toward background
};

export function createLavaMaterial(layer: LayerType = 'middle'): THREE.ShaderMaterial {
    const brightnessMap: Record<LayerType, number> = {
        front:  1.15,
        middle: 0.85,
        back:   0.55,
    };

    return new THREE.ShaderMaterial({
        uniforms: {
            blobs:              { value: new Float32Array(MAX_BLOBS * 2) },
            radii:              { value: new Float32Array(MAX_BLOBS) },
            blobCount:          { value: 0 },
            threshold:          { value: 0.2 },
            time:               { value: 0 },
            aspect:             { value: 1.0 },
            colorFluidTop:      { value: SHADER_COLORS.fluidTop },
            colorFluidBottom:   { value: SHADER_COLORS.fluidBottom },
            colorWaxEdge:       { value: SHADER_COLORS.waxEdge },
            colorWaxCore:       { value: SHADER_COLORS.waxCore },
            colorFillLight:     { value: SHADER_COLORS.fillLight },
            fillLightStrength:  { value: FILL_LIGHT_STRENGTH },
            colorFogBlend:   { value: SHADER_COLORS.fluidBottom },  // or fluidTop — whichever bg color is dominant
            fogAmount:       { value: fogMap[layer] },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: false,
    });
}