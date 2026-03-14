import * as THREE from 'three';

export function createCamera(): THREE.OrthographicCamera {
    // Left, Right, Top, Bottom, Near, Far
    return new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
}
