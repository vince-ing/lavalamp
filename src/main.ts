import * as THREE from 'three';
import { PALETTE, BLOB_COUNT } from './core/config';
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

    const material     = createLavaMaterial();
    const sceneContext = createScene(material);
    const canvas       = sceneContext.renderer.domElement;

    const glowLayer    = new GlowLayer();
    canvas.style.position = 'fixed';
    canvas.style.inset    = '0';
    canvas.style.zIndex   = '1';
    document.body.appendChild(canvas);

    const count      = isMobile() ? Math.round(BLOB_COUNT * 0.6) : BLOB_COUNT;
    const blobSystem = new BlobSystem(count);

    const input = new InputController(canvas);
    const { onResize } = startLoop(sceneContext, blobSystem, material, input, glowLayer);

    const menu = new ColorMenu((state: ColorState) => {
        const waxEdge     = new THREE.Color(state.waxEdge);
        const waxCore     = new THREE.Color(state.waxCore);
        const fluidTop    = new THREE.Color(state.fluidTop);
        const fluidBottom = new THREE.Color(state.fluidBottom);
        const fillLight   = new THREE.Color(state.fillLight);

        material.uniforms.colorWaxEdge.value     = waxEdge;
        material.uniforms.colorWaxCore.value     = waxCore;
        material.uniforms.colorFluidTop.value    = fluidTop;
        material.uniforms.colorFluidBottom.value = fluidBottom;
        material.uniforms.colorFillLight.value   = fillLight;

        glowLayer.waxCoreColor.copy(waxCore);
        glowLayer.fluidBottomColor.copy(fluidBottom);
        glowLayer.fluidTopColor.copy(fluidTop);

        applyDynamicGradient(state.fluidTop, state.fluidBottom);
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