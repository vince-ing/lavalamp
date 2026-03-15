import { Blob } from '../core/types';
import { LAMP_HEIGHT } from '../core/constants';

const MAX_TAILS           = 4;
const SPAWN_INTERVAL      = 1.8;
const MIN_SPEED_TO_SPAWN  = 0.30;
const MIN_RADIUS_TO_SPAWN = 0.22;

const CHAIN_LENGTH  = 14;
const CHAIN_SPACING = 0.010;

interface Tail {
    rootX: number;
    rootY: number;
    dx: number;
    dy: number;
    px: number;
    py: number;
    curlFreq:  number;
    curlFreq2: number;
    curlSpeed: number;
    curlAmp:   number;
    curlAmp2:  number;
    curlPhase: number;
    baseRadius: number;
    life: number;
    lifeTotal: number;
}

export class WispSystem {
    private tails: Tail[] = [];
    private spawnCooldown: Map<number, number> = new Map();

    update(dt: number, blobs: Blob[]): void {
        for (const [id, cd] of this.spawnCooldown) {
            const next = cd - dt;
            if (next <= 0) this.spawnCooldown.delete(id);
            else           this.spawnCooldown.set(id, next);
        }

        for (const b of blobs) {
            if (b.radius < MIN_RADIUS_TO_SPAWN) continue;
            if (this.spawnCooldown.has(b.id))   continue;
            if (this.tails.length >= MAX_TAILS)  break;

            const speed = Math.sqrt(b.velocity.x ** 2 + b.velocity.y ** 2);
            if (speed < MIN_SPEED_TO_SPAWN) continue;

            const dx = -b.velocity.x / speed;
            const dy = -b.velocity.y / speed;
            const px = -dy;
            const py =  dx;

            const speedFactor = Math.min(speed / 0.8, 2.5);
            const lifeTotal = (1.2 + Math.random() * 1.0) * Math.min(speedFactor, 1.6);

            this.tails.push({
                rootX: b.position.x + dx * b.radius * 0.7,
                rootY: b.position.y + dy * b.radius * 0.7,
                dx, dy, px, py,
                curlFreq:  0.4 + Math.random() * 0.4,
                curlFreq2: 0.2 + Math.random() * 0.3,
                curlSpeed: 0.6 + Math.random() * 0.8,
                curlAmp:   0.08 + Math.random() * 0.14,
                curlAmp2:  0.04 + Math.random() * 0.08,
                curlPhase: Math.random() * Math.PI * 2,
                baseRadius: b.radius * (0.18 + Math.random() * 0.30) * Math.min(speedFactor * 0.7, 1.4),
                life: lifeTotal,
                lifeTotal,
            });

            const cooldown = SPAWN_INTERVAL / Math.max(1, speedFactor * 0.9);
            this.spawnCooldown.set(b.id, cooldown * (0.8 + Math.random() * 0.4));
        }

        this.tails = this.tails.filter(tail => {
            tail.life -= dt;
            if (tail.life <= 0) return false;

            tail.curlPhase += tail.curlSpeed * dt;

            tail.rootX += tail.dx * 0.015 * dt;
            tail.rootY += tail.dy * 0.015 * dt + 0.02 * dt;

            return true;
        });
    }

    injectIntoSeeds(
        seedPos: Float32Array,
        seedRad: Float32Array,
        seedVel: Float32Array,
        blobCount: number,
        maxSlots: number,
    ): number {
        let added = 0;

        for (const tail of this.tails) {
            const t = 1 - tail.life / tail.lifeTotal;
            const lifeFactor = Math.pow(Math.max(0, 1 - t), 1.4);

            for (let i = 0; i < CHAIN_LENGTH; i++) {
                const slot = blobCount + added;
                if (slot >= maxSlots) break;

                const along    = i * CHAIN_SPACING;
                const curlGrow = Math.pow(i / (CHAIN_LENGTH - 1), 0.7);

                const curl =
                    Math.sin(i * tail.curlFreq  * 0.5 + tail.curlPhase)                        * tail.curlAmp  * curlGrow +
                    Math.sin(i * tail.curlFreq2 * 0.5 + tail.curlPhase * 0.61 + 1.3)           * tail.curlAmp2 * curlGrow +
                    Math.sin(i * 3.7            + tail.curlPhase * 1.8  + tail.curlFreq) * tail.curlAmp * 0.15 * curlGrow;

                const bx = tail.rootX + tail.dx * along + tail.px * curl;
                const by = tail.rootY + tail.dy * along + tail.py * curl;

                // Flat taper — beads stay nearly the same size, just barely pinching at tip
                const taper  = Math.pow(1 - i / CHAIN_LENGTH, 0.25);
                const radius = tail.baseRadius * taper * lifeFactor;

                if (radius < 0.006) continue;

                seedPos[slot * 2]     = bx;
                seedPos[slot * 2 + 1] = by;
                seedRad[slot]         = radius;
                seedVel[slot * 2]     = tail.dx * 0.08;
                seedVel[slot * 2 + 1] = tail.dy * 0.08;
                added++;
            }
        }

        return added;
    }
}