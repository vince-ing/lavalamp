import * as THREE from 'three';
import { PALETTE, LAYER_BLOB_COUNTS } from './core/config';
import { createLavaMaterial } from './renderer/lavaMaterial';
import { createScene } from './renderer/scene';
import { BlobSystem } from './simulation/blobSystem';
import { InputController } from './interaction/inputController';
import { startLoop } from './animation/animationLoop';
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

    const grad = `linear-gradient(to bottom, ${gradientColors.join(', ')})`;
    document.body.style.background = grad;
    document.documentElement.style.background = grad;
}

function bootstrap() {
    applyDynamicGradient();

    const matBack  = createLavaMaterial('back');
    const matMid   = createLavaMaterial('middle');
    const matFront = createLavaMaterial('front');
    const materials = [matBack, matMid, matFront];

    const sceneContext = createScene(materials);
    const canvas = sceneContext.renderer.domElement;
    document.body.appendChild(canvas);

    const sysBack  = new BlobSystem(LAYER_BLOB_COUNTS.back);
    const sysMid   = new BlobSystem(LAYER_BLOB_COUNTS.middle);
    const sysFront = new BlobSystem(LAYER_BLOB_COUNTS.front);
    const blobSystems = [sysBack, sysMid, sysFront];

    const input = new InputController(canvas);
    const { onResize } = startLoop(sceneContext, blobSystems, materials, input);

    const handleResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        console.log('resize:', w, h);
        onResize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // fullscreenchange fires after layout is complete — reliable source of truth
    document.addEventListener('fullscreenchange', handleResize);

    window.addEventListener('keydown', (e) => {
        if (e.key !== 'f' && e.key !== 'F') return;
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
                .catch(err => console.error('fullscreen failed:', err));
        } else {
            document.exitFullscreen();
        }
    });
}

bootstrap();