import * as THREE from 'three';
import { MAX_BLOBS } from '../core/constants';
import { SHADER_COLORS, FILL_LIGHT_STRENGTH } from '../core/config';
import vertexShader   from '../shaders/metaball.vert?raw';
import fragmentShader from '../shaders/metaball.frag?raw';

export type LayerType = 'front' | 'middle' | 'back';

const fogMap: Record<LayerType, number> = {
    front:  0.05,
    middle: 0.45,
    back:   0.65,
};

const layerIndexMap: Record<LayerType, number> = {
    back:   0.0,
    middle: 1.0,
    front:  2.0,
};

export function createLavaMaterial(layer: LayerType = 'middle'): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        uniforms: {
            blobs:              { value: new Float32Array(MAX_BLOBS * 2) },
            radii:              { value: new Float32Array(MAX_BLOBS) },
            velocities:         { value: new Float32Array(MAX_BLOBS * 2) },
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
            colorFogBlend:      { value: SHADER_COLORS.fluidBottom },
            fogAmount:          { value: fogMap[layer] },
            layerIndex:         { value: layerIndexMap[layer] },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: false,
    });
}