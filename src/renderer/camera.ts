import * as THREE from 'three';

export function createCamera(): THREE.OrthographicCamera {
    return new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
}