import * as THREE from 'three';

export interface Blob {
    id: number;
    position: { x: number, y: number };
    velocity: { x: number, y: number };
    temperature: number;
    radius: number;
}

export interface SimulationState {
    blobs: Blob[];
    gravity: number;
    buoyancyStrength: number;
    turbulenceStrength: number;
}

export interface SceneContext {
    scene: THREE.Scene;
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
    mesh: THREE.Mesh;
}
