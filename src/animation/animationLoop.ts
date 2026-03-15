import * as THREE from 'three';
import { SceneContext } from '../core/types';
import { BlobSystem } from '../simulation/blobSystem';
import { InputController } from '../interaction/inputController';
import { BloomPass } from '../renderer/bloomPass';
import { GlowLayer } from '../renderer/glowLayer';

export function startLoop(
    sceneContext: SceneContext,
    blobSystems: BlobSystem[],
    materials: THREE.ShaderMaterial[],
    inputController?: InputController,
    glowLayer?: GlowLayer,
): { onResize: (w: number, h: number) => void } {
    const { scene, camera, renderer } = sceneContext;
    let lastTime = performance.now();

    const bloom = new BloomPass(window.innerWidth, window.innerHeight);

    function animate(currentTime: number) {
        requestAnimationFrame(animate);
        const dt = Math.min((currentTime - lastTime) / 1000, 0.04);
        lastTime = currentTime;
        const t = currentTime / 1000;

        const width  = renderer.domElement.width  || 1;
        const height = renderer.domElement.height || 1;
        const aspect = width / height;

        if (inputController && blobSystems.length > 0) {
            inputController.update(blobSystems[blobSystems.length - 1]);
        }

        blobSystems.forEach((blobSystem, index) => {
            blobSystem.update(dt, t, aspect);

            const material = materials[index];
            material.uniforms.blobs.value      = blobSystem.getSeedPositions();
            material.uniforms.radii.value      = blobSystem.getSeedRadii();
            material.uniforms.velocities.value = blobSystem.getSeedVelocities();
            material.uniforms.blobCount.value  = blobSystem.getSeedCount();
            material.uniforms.time.value       = t;
            material.uniforms.aspect.value     = aspect;
        });

        if (glowLayer) glowLayer.render(dt, t, blobSystems);

        bloom.render(renderer, scene, camera);
    }

    requestAnimationFrame(animate);

    return {
        onResize: (w: number, h: number) => {
            renderer.setSize(w, h);
            bloom.resize(w, h);
            if (glowLayer) glowLayer.resize(w, h);
        }
    };
}