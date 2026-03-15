import { Blob } from '../core/types';
import { LAMP_HEIGHT } from '../core/constants';

let _id = 0;

export function makeBlob(cx: number, cy: number, cz: number, radius: number, temp: number): Blob {
    return {
        id: _id++,
        position: { x: cx, y: cy, z: cz },
        velocity: { x: (Math.random() - 0.5) * 0.2, y: (Math.random() - 0.5) * 0.2, z: 0 },
        temperature: temp,
        radius,
        noisePhaseX: Math.random() * Math.PI * 2,
        noisePhaseY: Math.random() * Math.PI * 2,
        noiseSpeed:  0.12 + Math.random() * 0.55,   // slower — more viscous feel
        noiseAmp:    radius * (0.10 + Math.random() * 0.08),
        privateTime: Math.random() * 1000,
    };
}

export function spawnBlobs(count: number, aspect: number): Blob[] {
    const blobs: Blob[] = [];
    const hw = (LAMP_HEIGHT * aspect) / 2;

    for (let i = 0; i < count; i++) {
        // Distribute across full column, weighted toward center vertically
        const cx = (Math.random() - 0.5) * hw * 1.7;
        const cy = Math.random() * LAMP_HEIGHT;

        // Photo shows a mix: a few large blobs, many medium, few small
        const r = Math.random();
        let radius: number;
        if      (r < 0.15) radius = 0.38 + Math.random() * 0.18;  // large
        else if (r < 0.55) radius = 0.24 + Math.random() * 0.14;  // medium
        else if (r < 0.85) radius = 0.16 + Math.random() * 0.10;  // small
        else               radius = 0.09 + Math.random() * 0.07;  // tiny droplets

        const temp = (1.0 - cy / LAMP_HEIGHT) * 0.85 + Math.random() * 0.3;
        blobs.push(makeBlob(cx, cy, 0, radius, temp));
    }
    return blobs;
}