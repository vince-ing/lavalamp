import { Blob } from '../core/types';
import { spawnBlobs } from './blob';
import { updateBlob, applyRepulsion } from './physics';
import { MAX_BLOBS, LAMP_HEIGHT } from '../core/constants';

// How slowly the shader velocity (which drives squish direction) tracks the
// real velocity. Lower = lazier rotation. 3.0 feels like the blob has inertia.
const VEL_SMOOTH = 3.0;

export class BlobSystem {
    blobs: Blob[];
    private seedPos:     Float32Array;
    private seedRad:     Float32Array;
    private seedVel:     Float32Array;   // smoothed velocity sent to shader
    private smoothedVel: { x: number; y: number }[];

    constructor(count: number) {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        const aspect = w / h;

        this.blobs        = spawnBlobs(count, aspect);
        this.seedPos      = new Float32Array(MAX_BLOBS * 2);
        this.seedRad      = new Float32Array(MAX_BLOBS);
        this.seedVel      = new Float32Array(MAX_BLOBS * 2);
        this.smoothedVel  = this.blobs.map(b => ({ x: b.velocity.x, y: b.velocity.y }));
    }

    update(dt: number, time: number, aspect: number): void {
        const hw = (LAMP_HEIGHT * aspect) / 2;
        const clampedDt = Math.min(dt, 0.04);

        for (const b of this.blobs) {
            updateBlob(b, clampedDt, time);
        }

        applyRepulsion(this.blobs, clampedDt);

        for (const [i, b] of this.blobs.entries()) {
            b.position.x += b.velocity.x * clampedDt;
            b.position.y += b.velocity.y * clampedDt;

            const m = b.radius * 0.4;
            if (b.position.x < -hw + m) { b.position.x = -hw + m; b.velocity.x =  Math.abs(b.velocity.x) * 0.5; }
            if (b.position.x >  hw - m) { b.position.x =  hw - m; b.velocity.x = -Math.abs(b.velocity.x) * 0.5; }
            if (b.position.y < m)               { b.position.y = m;               b.velocity.y =  Math.abs(b.velocity.y) * 0.5; }
            if (b.position.y > LAMP_HEIGHT - m) { b.position.y = LAMP_HEIGHT - m; b.velocity.y = -Math.abs(b.velocity.y) * 0.5; }

            b.velocity.x *= 0.94;
            b.velocity.y *= 0.94;

            // Exponential smoothing — shader velocity lazily follows real velocity
            const alpha = 1 - Math.exp(-VEL_SMOOTH * clampedDt);
            const sv = this.smoothedVel[i];
            sv.x += (b.velocity.x - sv.x) * alpha;
            sv.y += (b.velocity.y - sv.y) * alpha;

            const wx = Math.sin(time * b.noiseSpeed       + b.noisePhaseX) * b.noiseAmp;
            const wy = Math.cos(time * b.noiseSpeed * 1.3 + b.noisePhaseY) * b.noiseAmp;

            this.seedPos[i * 2]     = b.position.x + wx;
            this.seedPos[i * 2 + 1] = b.position.y + wy;
            this.seedRad[i]         = b.radius;
            this.seedVel[i * 2]     = sv.x;
            this.seedVel[i * 2 + 1] = sv.y;
        }

        for (let i = this.blobs.length; i < MAX_BLOBS; i++) {
            this.seedPos[i * 2]     = -9999;
            this.seedPos[i * 2 + 1] = -9999;
            this.seedRad[i]         = 0;
            this.seedVel[i * 2]     = 0;
            this.seedVel[i * 2 + 1] = 0;
        }
    }

    getSeedPositions()  { return this.seedPos; }
    getSeedRadii()      { return this.seedRad; }
    getSeedVelocities() { return this.seedVel; }
    getSeedCount()      { return this.blobs.length; }
    getBlobs()          { return this.blobs; }
}