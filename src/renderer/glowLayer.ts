import * as THREE from 'three';
import { BlobSystem } from '../simulation/blobSystem';
import { LAMP_HEIGHT } from '../core/constants';
import { SHADER_COLORS } from '../core/config';

export class GlowLayer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    waxCoreColor:     THREE.Color;
    fluidBottomColor: THREE.Color;
    fluidTopColor:    THREE.Color;
    fillLightColor:   THREE.Color;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
        `;
        document.body.insertBefore(this.canvas, document.body.firstChild);
        this.ctx = this.canvas.getContext('2d')!;

        this.waxCoreColor     = SHADER_COLORS.waxCore.clone();
        this.fluidBottomColor = SHADER_COLORS.fluidBottom.clone();
        this.fluidTopColor    = SHADER_COLORS.fluidTop.clone();
        this.fillLightColor   = SHADER_COLORS.fillLight.clone();

        this.resize(window.innerWidth, window.innerHeight);
    }

    resize(w: number, h: number): void {
        this.canvas.width  = Math.max(1, w >> 2);
        this.canvas.height = Math.max(1, h >> 2);
    }

    render(dt: number, time: number, blobSystems: BlobSystem[]): void {
        const { canvas, ctx } = this;
        const W = canvas.width;
        const H = canvas.height;

        ctx.clearRect(0, 0, W, H);

        const aspect = W / H;
        const worldW = LAMP_HEIGHT * aspect;
        const worldH = LAMP_HEIGHT;

        const toScreen = (wx: number, wy: number) => ({
            sx: ((wx + worldW / 2) / worldW) * W,
            sy: (1 - wy / worldH) * H,
        });

        // Fill light color (cyan)
        const fillR = Math.round(this.fillLightColor.r * 255);
        const fillG = Math.round(this.fillLightColor.g * 255);
        const fillB = Math.round(this.fillLightColor.b * 255);

        // Wax core color (pale blue-white)
        const waxR  = Math.round(this.waxCoreColor.r * 255);
        const waxG  = Math.round(this.waxCoreColor.g * 255);
        const waxB  = Math.round(this.waxCoreColor.b * 255);

        ctx.save();

        // ── Bottom heat cone ────────────────────────────────────────────────
        // A strong cone of cyan rising from the bottom, like the lamp bulb
        const coneGrad = ctx.createRadialGradient(W * 0.5, H, 0, W * 0.5, H, H * 0.75);
        coneGrad.addColorStop(0,   `rgba(${fillR},${fillG},${fillB},0.12)`);
        coneGrad.addColorStop(0.3, `rgba(${fillR},${fillG},${fillB},0.06)`);
        coneGrad.addColorStop(0.6, `rgba(${fillR},${fillG},${fillB},0.02)`);
        coneGrad.addColorStop(1,   `rgba(${fillR},${fillG},${fillB},0)`);
        ctx.globalCompositeOperation = 'lighten';
        ctx.fillStyle = coneGrad;
        ctx.fillRect(0, 0, W, H);

        // ── Per-blob glow: always-on, scaled by vertical position ───────────
        // Front and middle layers glow; back layer is dim
        blobSystems.forEach((sys, layerIdx) => {
            const isBack = layerIdx === 0;
            const isFront = layerIdx === 2;

            for (const b of sys.getBlobs()) {
                const { sx, sy } = toScreen(b.position.x, b.position.y);
                const blobPx  = (b.radius / worldW) * W;

                // Blobs near the bottom glow stronger (closer to heat source)
                const heightT  = b.position.y / worldH;   // 0=bottom, 1=top
                const heatGlow = 0.08 + (1.0 - heightT) * 0.22;
                const baseAlpha = isBack ? heatGlow * 0.15 : heatGlow * (isFront ? 0.45 : 0.28);

                const glowR = blobPx * (isBack ? 3.0 : 4.5);

                // Slow organic drift of 3 overlapping sub-glows
                const offsets = [
                    { ox: 0, oy: 0, scale: 1.0 },
                    {
                        ox: Math.sin(time * 0.31 + b.id * 1.1) * blobPx * 1.0,
                        oy: Math.cos(time * 0.27 + b.id * 0.9) * blobPx * 0.8,
                        scale: 0.7,
                    },
                    {
                        ox: Math.sin(time * 0.19 + b.id * 2.3) * blobPx * 0.7,
                        oy: Math.cos(time * 0.23 + b.id * 1.7) * blobPx * 0.9,
                        scale: 0.55,
                    },
                ];

                for (const o of offsets) {
                    const r2 = glowR * o.scale;
                    const a  = baseAlpha * o.scale;
                    // Blend between cyan fill light and pale wax — cyan near bottom
                    const blend = 1.0 - heightT;
                    const r = Math.round(waxR  * (1 - blend) + fillR * blend);
                    const g = Math.round(waxG  * (1 - blend) + fillG * blend);
                    const bC = Math.round(waxB * (1 - blend) + fillB * blend);

                    const grad = ctx.createRadialGradient(
                        sx + o.ox, sy + o.oy, 0,
                        sx + o.ox, sy + o.oy, r2
                    );
                    grad.addColorStop(0,   `rgba(${r},${g},${bC},${(a * 0.30).toFixed(3)})`);
                    grad.addColorStop(0.35,`rgba(${r},${g},${bC},${(a * 0.22).toFixed(3)})`);
                    grad.addColorStop(0.65,`rgba(${r},${g},${bC},${(a * 0.10).toFixed(3)})`);
                    grad.addColorStop(0.85,`rgba(${r},${g},${bC},${(a * 0.03).toFixed(3)})`);
                    grad.addColorStop(1,   `rgba(${r},${g},${bC},0)`);

                    ctx.globalCompositeOperation = 'lighten';
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.ellipse(sx + o.ox, sy + o.oy, r2, r2, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });

        ctx.restore();
    }

    dispose(): void {
        this.canvas.remove();
    }
}