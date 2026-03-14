import * as THREE from 'three';

export interface Blob {
    id: number;
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    temperature: number;
    radius: number;
    noisePhaseX: number;
    noisePhaseY: number;
    noiseSpeed:  number;
    noiseAmp:    number;
}

export interface SceneContext {
    scene: THREE.Scene;
    camera: THREE.Camera;
    renderer: THREE.WebGLRenderer;
    meshes: THREE.Mesh[];
}