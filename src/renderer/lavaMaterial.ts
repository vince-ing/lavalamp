import * as THREE from 'three';
import { MAX_BLOBS } from '../core/constants';
import vertexShader   from '../shaders/metaball.vert?raw';
import fragmentShader from '../shaders/metaball.frag?raw';

export function createLavaMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        uniforms: {
            blobs:     { value: new Float32Array(MAX_BLOBS * 2) },
            radii:     { value: new Float32Array(MAX_BLOBS) },
            blobCount: { value: 0 },
            threshold: { value: 0.2 },
            time:      { value: 0 },
            aspect:    { value: window.innerWidth / window.innerHeight },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
    });
}