import * as THREE from 'three';
import { MAX_BLOBS } from '../core/constants';
import { SHADER_COLORS, FILL_LIGHT_STRENGTH } from '../core/config';
import vertexShader   from '../shaders/metaball.vert?raw';
import fragmentShader from '../shaders/metaball.frag?raw';

export type LayerType = 'front' | 'middle' | 'back';

export function createLavaMaterial(layer: LayerType = 'middle'): THREE.ShaderMaterial {
    const coreColor = SHADER_COLORS.waxCore.clone();
    const edgeColor = SHADER_COLORS.waxEdge.clone();
    
    // Tint the layers
    if (layer === 'front') {
        coreColor.lerp(new THREE.Color(0xffffff), 0.35);
        edgeColor.lerp(new THREE.Color(0xffffff), 0.35);
    } else if (layer === 'back') {
        coreColor.lerp(new THREE.Color(0x000000), 0.55);
        edgeColor.lerp(new THREE.Color(0x000000), 0.55);
    }

    return new THREE.ShaderMaterial({
        uniforms: {
            blobs:              { value: new Float32Array(MAX_BLOBS * 2) },
            radii:              { value: new Float32Array(MAX_BLOBS) },
            blobCount:          { value: 0 },
            threshold:          { value: 0.2 },
            time:               { value: 0 },
            aspect:             { value: window.innerWidth / window.innerHeight },
            colorFluidTop:      { value: SHADER_COLORS.fluidTop },
            colorFluidBottom:   { value: SHADER_COLORS.fluidBottom },
            colorWaxEdge:       { value: edgeColor },
            colorWaxCore:       { value: coreColor },
            colorFillLight:     { value: SHADER_COLORS.fillLight },
            fillLightStrength:  { value: FILL_LIGHT_STRENGTH },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
    });
}