import * as THREE from 'three';
import { SceneContext } from '../core/types';
import { BlobSystem } from '../simulation/blobSystem';
import { InputController } from '../interaction/inputController';

export function startLoop(
    sceneContext: SceneContext,
    blobSystems: BlobSystem[],
    materials: THREE.ShaderMaterial[],
    inputController?: InputController
): void {
    const { scene, camera, renderer } = sceneContext;
    let lastTime = performance.now();

    function animate(currentTime: number) {
        requestAnimationFrame(animate);
        const dt = Math.min((currentTime - lastTime) / 1000, 0.04);
        lastTime = currentTime;
        const t = currentTime / 1000;

        const { width, height } = renderer.domElement;
        const aspect = width / height;

        // Apply input only to the frontmost layer (the last one in the array)
        if (inputController && blobSystems.length > 0) {
            inputController.update(blobSystems[blobSystems.length - 1]);
        }

        blobSystems.forEach((blobSystem, index) => {
            blobSystem.update(dt, t, aspect);

            const material = materials[index];
            material.uniforms.blobs.value     = blobSystem.getSeedPositions();
            material.uniforms.radii.value     = blobSystem.getSeedRadii();
            material.uniforms.blobCount.value = blobSystem.getSeedCount();
            material.uniforms.time.value      = t;
            material.uniforms.aspect.value    = aspect;
        });

        renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
}