import { Blob } from '../core/types';
import { spawnBlobs } from './blob';
import { updateBlob, applyRepulsion } from './physics';
import { MAX_BLOBS, LAMP_HEIGHT } from '../core/constants';

export class BlobSystem {
    blobs: Blob[];
    private seedPos: Float32Array;
    private seedRad: Float32Array;

    constructor(count: number) {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        const aspect = w / h;

        this.blobs   = spawnBlobs(count, aspect);
        this.seedPos = new Float32Array(MAX_BLOBS * 2);
        this.seedRad = new Float32Array(MAX_BLOBS);
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

            const wx = Math.sin(time * b.noiseSpeed       + b.noisePhaseX) * b.noiseAmp;
            const wy = Math.cos(time * b.noiseSpeed * 1.3 + b.noisePhaseY) * b.noiseAmp;

            this.seedPos[i * 2]     = b.position.x + wx;
            this.seedPos[i * 2 + 1] = b.position.y + wy;
            this.seedRad[i]         = b.radius;
        }

        for (let i = this.blobs.length; i < MAX_BLOBS; i++) {
            this.seedPos[i * 2]     = -9999;
            this.seedPos[i * 2 + 1] = -9999;
            this.seedRad[i]         = 0;
        }
    }

    getSeedPositions() { return this.seedPos; }
    getSeedRadii()     { return this.seedRad; }
    getSeedCount()     { return this.blobs.length; }
    getBlobs()         { return this.blobs; }
}