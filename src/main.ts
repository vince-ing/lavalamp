import { createLavaMaterial } from './renderer/lavaMaterial';
import { createScene } from './renderer/scene';
import { BlobSystem } from './simulation/blobSystem';
import { InputController } from './interaction/inputController';
import { startLoop } from './animation/animationLoop';
import { DEFAULT_BLOB_COUNT } from './core/constants';
import './style.css';

function bootstrap() {
    const material     = createLavaMaterial();
    const sceneContext = createScene(material);
    document.body.appendChild(sceneContext.renderer.domElement);

    window.addEventListener('resize', () => {
        sceneContext.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const blobSystem = new BlobSystem(DEFAULT_BLOB_COUNT);
    const input      = new InputController(sceneContext.renderer.domElement);
    startLoop(sceneContext, blobSystem, material, input);
}

bootstrap();