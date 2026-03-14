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

        // Compute dt (delta time in seconds)
        // Capped at 0.1s to prevent physics explosions during lag spikes or tab switching
        const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;

        // 1. Process interactions
        if (inputController) {
            inputController.update(blobSystem);
        }

        // 2. Update blob system physics
        blobSystem.update(dt);

        // 3. Update shader uniforms
        material.uniforms.blobs.value = blobSystem.getBlobPositions();
        material.uniforms.radii.value = blobSystem.getBlobRadii();
        material.uniforms.blobCount.value = blobSystem.getBlobCount();
        material.uniforms.time.value = currentTime / 1000;

        // 4. Render scene
        renderer.render(scene, camera);
    }

    // Kick off the loop
    requestAnimationFrame(animate);
}
