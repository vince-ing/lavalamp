import * as THREE from 'three';
import { SceneContext } from '../core/types';
import { BlobSystem } from '../simulation/blobSystem';
import { InputController } from '../interaction/inputController';
import { BloomPass } from '../renderer/bloomPass';

export function startLoop(
    sceneContext: SceneContext,
    blobSystems: BlobSystem[],
    materials: THREE.ShaderMaterial[],
    inputController?: InputController
): void {
    const { scene, camera, renderer } = sceneContext;
    let lastTime = performance.now();

    const bloom = new BloomPass(
        renderer.domElement.width  || window.innerWidth,
        renderer.domElement.height || window.innerHeight,
    );

    // Keep bloom targets in sync when window is resized
    window.addEventListener('resize', () => {
        const w = renderer.domElement.width  || window.innerWidth;
        const h = renderer.domElement.height || window.innerHeight;
        bloom.resize(w, h);
    });

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
            material.uniforms.blobs.value     = blobSystem.getSeedPositions();
            material.uniforms.radii.value     = blobSystem.getSeedRadii();
            material.uniforms.blobCount.value = blobSystem.getSeedCount();
            material.uniforms.time.value      = t;
            material.uniforms.aspect.value    = aspect;
        });

        // Bloom pass: scene → blur → composite → canvas
        bloom.render(renderer, scene, camera);
    }

    requestAnimationFrame(animate);
}