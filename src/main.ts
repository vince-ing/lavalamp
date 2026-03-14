import * as THREE from 'three';
import { PALETTE, LAYER_BLOB_COUNTS } from './core/config';
import { createLavaMaterial } from './renderer/lavaMaterial';
import { createScene } from './renderer/scene';
import { BlobSystem } from './simulation/blobSystem';
import { InputController } from './interaction/inputController';
import { startLoop } from './animation/animationLoop';
import { ColorMenu, ColorState } from './ui/colorMenu';
import './style.css';

function buildGradient(top: string, bottom: string): string {
    const colorTop    = new THREE.Color(top);
    const colorBottom = new THREE.Color(bottom);
    const stops = [0, 75, 80, 85, 90, 95, 98, 100];
    const gradientColors = stops.map(pct => {
        if (pct <= 60) return `${colorTop.getStyle()} ${pct}%`;
        let t = (pct - 60) / 40;
        t = Math.pow(t, 1.7);
        return `${colorTop.clone().lerp(colorBottom, t).getStyle()} ${pct}%`;
    });
    return `linear-gradient(to bottom, ${gradientColors.join(', ')})`;
}

function applyDynamicGradient(top = PALETTE.fluidTop, bottom = PALETTE.fluidBottom) {
    const grad = buildGradient(top, bottom);
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

    // Color menu — updates shader uniforms + background live
    const menu = new ColorMenu((state: ColorState) => {
        const waxEdge     = new THREE.Color(state.waxEdge);
        const waxCore     = new THREE.Color(state.waxCore);
        const fluidTop    = new THREE.Color(state.fluidTop);
        const fluidBottom = new THREE.Color(state.fluidBottom);
        const fillLight   = new THREE.Color(state.fillLight);

        for (const mat of materials) {
            mat.uniforms.colorWaxEdge.value     = waxEdge;
            mat.uniforms.colorWaxCore.value     = waxCore;
            mat.uniforms.colorFluidTop.value    = fluidTop;
            mat.uniforms.colorFluidBottom.value = fluidBottom;
            mat.uniforms.colorFogBlend.value    = fluidBottom;
            mat.uniforms.colorFillLight.value   = fillLight;
        }

        applyDynamicGradient(state.fluidTop, state.fluidBottom);
    });

    const handleResize = () => onResize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);

    window.addEventListener('keydown', (e) => {
        if (e.key === 'f' || e.key === 'F') {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen()
                    .catch(err => console.error('fullscreen failed:', err));
            } else {
                document.exitFullscreen();
            }
        }
        if (e.key === 'h' || e.key === 'H') {
            menu.toggle();
        }
    });
}

bootstrap();