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
    const material     = createLavaMaterial();
    const sceneContext = createScene(material);
    const canvas       = sceneContext.renderer.domElement;

    canvas.style.position = 'fixed';
    canvas.style.inset    = '0';
    document.body.appendChild(canvas);

    const count      = isMobile() ? 5 : 10;
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

    // Tell Electron to pass clicks through when not over a blob
    canvas.addEventListener('mousemove', (e) => {
        const pixel = new Uint8Array(4);
        const gl = (canvas as HTMLCanvasElement & { __gl?: WebGLRenderingContext }).__gl 
            || canvas.getContext('webgl');
        if ((window as any).setIgnoreMouse) {
            // Check if pixel under mouse is transparent (no blob)
            const x = e.clientX * window.devicePixelRatio;
            const y = (window.innerHeight - e.clientY) * window.devicePixelRatio;
            (window as any).setIgnoreMouse(false);
            setTimeout(() => (window as any).setIgnoreMouse(true), 50);
        }
    });
}

bootstrap();