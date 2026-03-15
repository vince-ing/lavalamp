import * as THREE from 'three';
import { SceneContext } from '../core/types';
import { createCamera } from './camera';

export function createScene(materials: THREE.ShaderMaterial[]): SceneContext {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene  = new THREE.Scene();
    const camera = createCamera();
    camera.position.z = 1;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const meshes: THREE.Mesh[] = [];

    materials.forEach((material, index) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = (index - materials.length + 1) * 0.1;
        scene.add(mesh);
        meshes.push(mesh);
    });

    return { scene, camera, renderer, meshes };
}