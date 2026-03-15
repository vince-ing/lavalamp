import * as THREE from 'three';
import { SceneContext } from '../core/types';
import { createCamera } from './camera';

export function createScene(material: THREE.ShaderMaterial): SceneContext {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // 1.5 is a good balance: noticeably crisper than 1.0 on retina,
    // but only 2.25x pixel cost vs 4x at ratio 2.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene    = new THREE.Scene();
    const camera   = createCamera();
    camera.position.z = 1;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh     = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    return { scene, camera, renderer, mesh };
}