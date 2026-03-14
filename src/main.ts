import * as THREE from 'three';
import { PALETTE } from './core/config';
import { createLavaMaterial } from './renderer/lavaMaterial';
import { createScene } from './renderer/scene';
import { BlobSystem } from './simulation/blobSystem';
import { InputController } from './interaction/inputController';
import { startLoop } from './animation/animationLoop';
import { DEFAULT_BLOB_COUNT } from './core/constants';
import './style.css';

function applyDynamicGradient() {
    const colorTop    = new THREE.Color(PALETTE.fluidTop);
    const colorBottom = new THREE.Color(PALETTE.fluidBottom);

    const stops = [0, 75, 80, 85, 90, 95, 98, 100];
    const gradientColors = stops.map(pct => {
        if (pct <= 60) return `${colorTop.getStyle()} ${pct}%`;
        let t = (pct - 60) / 40;
        t = Math.pow(t, 1.7);
        const lerpedColor = colorTop.clone().lerp(colorBottom, t);
        return `${lerpedColor.getStyle()} ${pct}%`;
    });

    document.body.style.background = `linear-gradient(to bottom, ${gradientColors.join(', ')})`;
}

function bootstrap() {
    applyDynamicGradient();

    // Create 3 distinct layer materials
    const matBack  = createLavaMaterial('back');
    const matMid   = createLavaMaterial('middle');
    const matFront = createLavaMaterial('front');
    const materials = [matBack, matMid, matFront];

    const sceneContext = createScene(materials);
    document.body.appendChild(sceneContext.renderer.domElement);

    window.addEventListener('resize', () => {
        sceneContext.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Create 3 independent physics systems (adjust counts for depth parallax effect)
    const sysBack  = new BlobSystem(DEFAULT_BLOB_COUNT + 4);
    const sysMid   = new BlobSystem(DEFAULT_BLOB_COUNT);
    const sysFront = new BlobSystem(DEFAULT_BLOB_COUNT - 4);
    const blobSystems = [sysBack, sysMid, sysFront];

    const input = new InputController(sceneContext.renderer.domElement);
    
    startLoop(sceneContext, blobSystems, materials, input);
}