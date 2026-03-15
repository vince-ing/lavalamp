import * as THREE from 'three';
import { MAX_BLOBS } from '../core/constants';
import { SHADER_COLORS, FILL_LIGHT_STRENGTH } from '../core/config';
import vertexShader   from '../shaders/metaball.vert?raw';
import fragmentShader from '../shaders/metaball.frag?raw';

export function createLavaMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        uniforms: {
            blobs:             { value: new Float32Array(MAX_BLOBS * 3) },
            radii:             { value: new Float32Array(MAX_BLOBS) },
            velocities:        { value: new Float32Array(MAX_BLOBS * 2) },
            blobCount:         { value: 0 },
            time:              { value: 0 },
            aspect:            { value: 1.0 },
            colorFluidTop:     { value: SHADER_COLORS.fluidTop },
            colorFluidBottom:  { value: SHADER_COLORS.fluidBottom },
            colorWaxEdge:      { value: SHADER_COLORS.waxEdge },
            colorWaxCore:      { value: SHADER_COLORS.waxCore },
            colorFillLight:    { value: SHADER_COLORS.fillLight },
            fillLightStrength: { value: FILL_LIGHT_STRENGTH },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: false,
    });
}