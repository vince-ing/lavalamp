import * as THREE from 'three';
import { SceneContext } from '../core/types';
import { BlobSystem } from '../simulation/blobSystem';
import { InputController } from '../interaction/inputController';

export function startLoop(
    sceneContext: SceneContext,
    blobSystem: BlobSystem,
    material: THREE.ShaderMaterial,
    inputController?: InputController
): void {
    const { scene, camera, renderer } = sceneContext;
    let lastTime = performance.now();

    function animate(currentTime: number) {
        requestAnimationFrame(animate);
        const dt = Math.min((currentTime - lastTime) / 1000, 0.04);
        lastTime = currentTime;
        const t = currentTime / 1000;

        // Derive aspect from the renderer's actual pixel dimensions so physics
        // and shader stay in sync even if a resize event is still pending.
        const { width, height } = renderer.domElement;
        const aspect = width / height;

        if (inputController) inputController.update(blobSystem);

        blobSystem.update(dt, t, aspect);

        material.uniforms.blobs.value     = blobSystem.getSeedPositions();
        material.uniforms.radii.value     = blobSystem.getSeedRadii();
        material.uniforms.blobCount.value = blobSystem.getSeedCount();
        material.uniforms.time.value      = t;
        material.uniforms.aspect.value    = aspect;

        renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
}