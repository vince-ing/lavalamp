import * as THREE from 'three';
import { SceneContext } from '../core/types';
import { BlobSystem } from '../simulation/blobSystem';
import { InputController } from '../interaction/inputController';

export function startLoop(
    sceneContext: SceneContext,
    blobSystem: BlobSystem,
    material: THREE.ShaderMaterial,
    inputController?: InputController // Added as an optional param to satisfy the architecture flow
): void {
    const { scene, camera, renderer } = sceneContext;
    let lastTime = performance.now();

    function animate(currentTime: number) {
        requestAnimationFrame(animate);

        const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;
        
        const timeInSeconds = currentTime / 1000;
        const aspect = window.innerWidth / window.innerHeight; // Calculate current aspect

        if (inputController) {
            inputController.update(blobSystem);
        }

        // Pass aspect ratio to the physics system
        blobSystem.update(dt, timeInSeconds, aspect);

        material.uniforms.blobs.value = blobSystem.getBlobPositions();
        material.uniforms.radii.value = blobSystem.getBlobRadii();
        material.uniforms.blobCount.value = blobSystem.getBlobCount();
        material.uniforms.time.value = timeInSeconds;
        material.uniforms.aspect.value = aspect; // Update shader uniform

        renderer.render(scene, camera);
    }

    // Kick off the loop
    requestAnimationFrame(animate);
}
