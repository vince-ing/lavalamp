import { createLavaMaterial } from './renderer/lavaMaterial';
import { createScene } from './renderer/scene';
import { BlobSystem } from './simulation/blobSystem';
import { InputController } from './interaction/inputController';
import { startLoop } from './animation/animationLoop';
import { DEFAULT_BLOB_COUNT } from './core/constants';
import './style.css'; // Assuming standard Vite CSS entry

function bootstrap() {
    // 1. Create material
    const material = createLavaMaterial();

    // 2. Create scene
    const sceneContext = createScene(material);
    
    // Attach the canvas to the DOM
    document.body.appendChild(sceneContext.renderer.domElement);

    // Handle window resizing
    window.addEventListener('resize', () => {
        sceneContext.renderer.setSize(window.innerWidth, window.innerHeight);
        sceneContext.camera.updateProjectionMatrix();
    });

    // 3. Create blob system
    const blobSystem = new BlobSystem(DEFAULT_BLOB_COUNT);

    // 4. Create input controller
    const input = new InputController(sceneContext.renderer.domElement);

    // 5. Start animation loop
    startLoop(sceneContext, blobSystem, material, input);
}

// Initialize application
bootstrap();
