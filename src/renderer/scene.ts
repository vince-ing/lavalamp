import * as THREE from 'three';
import { SceneContext } from '../core/types';
import { createCamera } from './camera';

export function createScene(material: THREE.ShaderMaterial): SceneContext {
    // 1. create WebGLRenderer
    const renderer = new THREE.WebGLRenderer({ alpha: true }); // Alpha true in case of transparent background
    
    // 2. set renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    
    // 3. create Scene
    const scene = new THREE.Scene();
    
    // 4. create OrthographicCamera
    const camera = createCamera();
    camera.position.z = 1; // Pull camera back so the plane is within the frustum
    
    // 5. create PlaneGeometry (2x2 covers the exact -1 to 1 orthographic bounds)
    const geometry = new THREE.PlaneGeometry(2, 2);
    
    // 6. attach ShaderMaterial
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    // 7. return scene context
    return {
        scene,
        camera,
        renderer,
        mesh
    };
}
