import * as THREE from 'three';
import { BlobSystem } from '../simulation/blobSystem';
import { LAMP_HEIGHT } from '../core/constants';
import { SHADER_COLORS } from '../core/config';

const MIN_ACTIVE = 2;
const MAX_ACTIVE = 4;

const FADE_IN_SPEED  = 0.3;
const FADE_OUT_SPEED = 0.2;

const MIN_HOLD = 1.0;
const MAX_HOLD = 4.0;

interface GlowState {
    alpha:     number;
    target:    number;
    holdTimer: number;
    colorT:    number;
    baseAlpha: number;
}

export class GlowLayer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private glowStates: Map<number, GlowState> = new Map();

    waxCoreColor:     THREE.Color;
    fluidBottomColor: THREE.Color;
    fluidTopColor:    THREE.Color;

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

        type GlowBlob = { id: number; x: number; y: number; r: number };
        const allBlobs: GlowBlob[] = [];
        blobSystems.forEach((sys, layerIdx) => {
            if (layerIdx === 0 || layerIdx === 1) return;  // back layer never glows
            for (const b of sys.getBlobs()) {
                allBlobs.push({ id: b.id, x: b.position.x, y: b.position.y, r: b.radius });
            }
        });

        const liveIds = new Set(allBlobs.map(b => b.id));
        for (const id of this.glowStates.keys()) {
            if (!liveIds.has(id)) this.glowStates.delete(id);
        }

        for (const [, gs] of this.glowStates) {
            if (gs.target === 1) {
                gs.alpha = Math.min(1, gs.alpha + FADE_IN_SPEED * dt);
                if (gs.alpha >= 1) {
                    gs.holdTimer -= dt;
                    if (gs.holdTimer <= 0) gs.target = 0;
                }
            } else {
                gs.alpha = Math.max(0, gs.alpha - FADE_OUT_SPEED * dt);
            }
        }

        for (const [id, gs] of this.glowStates) {
            if (gs.target === 0 && gs.alpha <= 0) this.glowStates.delete(id);
        }

        const activeCount = this.glowStates.size;
        const targetCount = MIN_ACTIVE + Math.floor(Math.random() * (MAX_ACTIVE - MIN_ACTIVE + 1));
        if (activeCount < targetCount) {
            const inactiveBlobs = allBlobs.filter(b => !this.glowStates.has(b.id));
            if (inactiveBlobs.length > 0) {
                const pick = inactiveBlobs[Math.floor(Math.random() * inactiveBlobs.length)];
                this.glowStates.set(pick.id, {
                    alpha:     0,
                    target:    1,
                    holdTimer: MIN_HOLD + Math.random() * (MAX_HOLD - MIN_HOLD),
                    colorT:    1,
                    baseAlpha: 0.55 + Math.random() * 0.35,
                });
            }
        }

        ctx.clearRect(0, 0, W, H);

        const aspect = W / H;
        const worldW = LAMP_HEIGHT * aspect;
        const worldH = LAMP_HEIGHT;

        const toScreen = (wx: number, wy: number) => ({
            sx: ((wx + worldW / 2) / worldW) * W,
            sy: (1 - wy / worldH) * H,
        });

        const waxR = Math.round(this.waxCoreColor.r     * 255);
        const waxG = Math.round(this.waxCoreColor.g     * 255);
        const waxB = Math.round(this.waxCoreColor.b     * 255);
        const fldR = Math.round(this.fluidBottomColor.r * 255);
        const fldG = Math.round(this.fluidBottomColor.g * 255);
        const fldB = Math.round(this.fluidBottomColor.b * 255);

        ctx.save();
        ctx.globalCompositeOperation = 'lighten';

        for (const b of allBlobs) {
            const gs = this.glowStates.get(b.id);
            if (!gs || gs.alpha <= 0) continue;

            const alpha = gs.baseAlpha * gs.alpha;

            const whiteBlend = 0.5;
            const r  = Math.round((fldR + (waxR - fldR) * gs.colorT) * (1 - whiteBlend) + 255 * whiteBlend);
            const g  = Math.round((fldG + (waxG - fldG) * gs.colorT) * (1 - whiteBlend) + 255 * whiteBlend);
            const bC = Math.round((fldB + (waxB - fldB) * gs.colorT) * (1 - whiteBlend) + 255 * whiteBlend);

            const { sx, sy } = toScreen(b.x, b.y);
            const blobPx = (b.r / worldW) * W;
            const glowR  = blobPx * 4;

            // 3 sub-glows per blob drifting at different rates — their overlap
            // creates an amorphous, shifting pool rather than a perfect circle
            const offsets = [
                { ox: 0, oy: 0, scale: 1.0 },
                {
                    ox: Math.sin(time * 0.31 + b.id)       * blobPx * 1.2,
                    oy: Math.cos(time * 0.27 + b.id)       * blobPx * 0.9,
                    scale: 0.75,
                },
                {
                    ox: Math.sin(time * 0.19 + b.id * 2.3) * blobPx * 0.8,
                    oy: Math.cos(time * 0.23 + b.id * 1.7) * blobPx * 1.1,
                    scale: 0.65,
                },
            ];

            for (const o of offsets) {
                const r2 = glowR * o.scale;
                const a = alpha * o.scale;
                const grad = ctx.createRadialGradient(sx + o.ox, sy + o.oy, 0, sx + o.ox, sy + o.oy, r2);
                grad.addColorStop(0,   `rgba(${r},${g},${bC},${(a * 0.25).toFixed(3)})`);
                grad.addColorStop(0.4, `rgba(${r},${g},${bC},${(a * 0.20).toFixed(3)})`);
                grad.addColorStop(0.7, `rgba(${r},${g},${bC},${(a * 0.12).toFixed(3)})`);
                grad.addColorStop(0.9, `rgba(${r},${g},${bC},${(a * 0.04).toFixed(3)})`);
                grad.addColorStop(1,   `rgba(${r},${g},${bC},0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(sx + o.ox, sy + o.oy, r2, r2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    dispose(): void {
        this.canvas.remove();
    }
}