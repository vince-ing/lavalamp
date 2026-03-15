import * as THREE from 'three';
import { PALETTE, LAYER_BLOB_COUNTS } from './core/config';
import { createLavaMaterial } from './renderer/lavaMaterial';
import { createScene } from './renderer/scene';
import { BlobSystem } from './simulation/blobSystem';
import { InputController } from './interaction/inputController';
import { startLoop } from './animation/animationLoop';
import { GlowLayer } from './renderer/glowLayer';
import { ColorMenu, ColorState } from './ui/colorMenu';
import './style.css';

function isMobile(): boolean {
    return window.matchMedia('(pointer: coarse)').matches;
}

function scaledCounts(): typeof LAYER_BLOB_COUNTS {
    if (!isMobile()) return { ...LAYER_BLOB_COUNTS };
    const scale = 0.6;
    return {
        back:   Math.max(1, Math.round(LAYER_BLOB_COUNTS.back   * scale)),
        middle: Math.max(1, Math.round(LAYER_BLOB_COUNTS.middle * scale)),
        front:  Math.max(1, Math.round(LAYER_BLOB_COUNTS.front  * scale)),
    };
}

function bootstrap() {
    // Pure black body background — the lamp column is drawn by the shader
    document.body.style.background = '#000';
    document.documentElement.style.background = '#000';

    const matBack  = createLavaMaterial('back');
    const matMid   = createLavaMaterial('middle');
    const matFront = createLavaMaterial('front');
    const materials = [matBack, matMid, matFront];

    const sceneContext = createScene(materials);
    const canvas = sceneContext.renderer.domElement;

    const glowLayer = new GlowLayer();

    canvas.style.position = 'fixed';
    canvas.style.inset    = '0';
    canvas.style.zIndex   = '1';
    document.body.appendChild(canvas);

    const counts   = scaledCounts();
    const sysBack  = new BlobSystem(counts.back);
    const sysMid   = new BlobSystem(counts.middle);
    const sysFront = new BlobSystem(counts.front);
    const blobSystems = [sysBack, sysMid, sysFront];

    const input = new InputController(canvas);
    const { onResize } = startLoop(sceneContext, blobSystems, materials, input, glowLayer);

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

        glowLayer.waxCoreColor.copy(waxCore);
        glowLayer.fluidBottomColor.copy(fluidBottom);
        glowLayer.fluidTopColor.copy(fluidTop);
        glowLayer.fillLightColor.copy(fillLight);

        document.body.style.background = '#000';
    });

    const handleResize = () => onResize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);

    window.addEventListener('keydown', (e) => {
        if (e.key === 'f' || e.key === 'F') {
            if (!document.fullscreenElement)
                document.documentElement.requestFullscreen().catch(console.error);
            else
                document.exitFullscreen();
        }
        if (e.key === 'h' || e.key === 'H') menu.toggle();
    });
}

bootstrap();