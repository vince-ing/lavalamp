import * as THREE from 'three';
import { SceneContext } from '../core/types';
import { createCamera } from './camera';

export function createScene(materials: THREE.ShaderMaterial[]): SceneContext {
    // 1. create WebGLRenderer
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    
    // 2. set renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // 3. create Scene
    const scene = new THREE.Scene();
    
    // 4. create OrthographicCamera
    const camera = createCamera();
    camera.position.z = 1; 
    
    // 5. create PlaneGeometry (2x2 covers the exact -1 to 1 orthographic bounds)
    const geometry = new THREE.PlaneGeometry(2, 2);
    const meshes: THREE.Mesh[] = [];
    
    // 6. attach ShaderMaterials
    materials.forEach((material, index) => {
        const mesh = new THREE.Mesh(geometry, material);
        // Space layers slightly on the Z axis: back is lowest Z, front is 0
        mesh.position.z = (index - materials.length + 1) * 0.1;
        scene.add(mesh);
        meshes.push(mesh);
    });
    
    // 7. return scene context
    return {
        scene,
        camera,
        renderer,
        meshes
    };
}