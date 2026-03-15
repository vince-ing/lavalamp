import { createLavaMaterial } from './renderer/lavaMaterial';
import { createScene } from './renderer/scene';
import { BlobSystem } from './simulation/blobSystem';
import { InputController } from './interaction/inputController';
import { startLoop } from './animation/animationLoop';
import './style.css';

function isMobile(): boolean {
    return window.matchMedia('(pointer: coarse)').matches;
}

function bootstrap() {
    document.body.style.background = '#000';
    document.documentElement.style.background = '#000';

    const material     = createLavaMaterial();
    const sceneContext = createScene(material);
    const canvas       = sceneContext.renderer.domElement;

    canvas.style.position = 'fixed';
    canvas.style.inset    = '0';
    document.body.appendChild(canvas);

    // 10 large blobs packed in a column — matches the photo density
    const count      = isMobile() ? 6 : 10;
    const blobSystem = new BlobSystem(count);

    const input = new InputController(canvas);
    const { onResize } = startLoop(sceneContext, blobSystem, material, input);

    window.addEventListener('resize', () => onResize(window.innerWidth, window.innerHeight));

    window.addEventListener('keydown', (e) => {
        if (e.key === 'f' || e.key === 'F') {
            if (!document.fullscreenElement)
                document.documentElement.requestFullscreen().catch(console.error);
            else
                document.exitFullscreen();
        }
    });
}

bootstrap();