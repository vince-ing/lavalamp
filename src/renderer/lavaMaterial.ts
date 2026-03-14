import * as THREE from 'three';
import { MAX_BLOBS } from '../core/constants';

// Utilizing Vite's built-in raw text importer for shader files
import vertexShader from '../shaders/metaball.vert?raw';
import fragmentShader from '../shaders/metaball.frag?raw';

export function createLavaMaterial(): THREE.ShaderMaterial {
    const uniforms = {
        blobs: { value: new Float32Array(MAX_BLOBS * 2) },
        radii: { value: new Float32Array(MAX_BLOBS) },
        blobCount: { value: 0 },
        threshold: { value: 1.2 },
        time: { value: 0 },
        aspect: { value: window.innerWidth / window.innerHeight } // Add aspect uniform
    };

    return new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader
    });
}
