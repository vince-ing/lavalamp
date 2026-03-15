import { Blob } from '../core/types';
import { LAMP_HEIGHT, LAMP_DEPTH } from '../core/constants';

let _id = 0;

export function makeBlob(cx: number, cy: number, cz: number, radius: number, temp: number): Blob {
    return {
        id: _id++,
        position: { x: cx, y: cy, z: cz },
        velocity: {
            x: (Math.random() - 0.5) * 0.25,
            y: (Math.random() - 0.5) * 0.25,
            z: (Math.random() - 0.5) * 0.08,
        },
        temperature: temp,
        radius,
        noisePhaseX: Math.random() * Math.PI * 2,
        noisePhaseY: Math.random() * Math.PI * 2,
        noiseSpeed:  0.15 + Math.random() * 0.7,
        noiseAmp:    radius * (0.12 + Math.random() * 0.10),
        privateTime: Math.random() * 1000,
    };
}

export function spawnBlobs(count: number, aspect: number): Blob[] {
    const blobs: Blob[] = [];
    const hw = (LAMP_HEIGHT * aspect) / 2;
    const cols = Math.ceil(Math.sqrt(count * aspect));
    const rows = Math.ceil(count / cols);
    const cw = (hw * 2) / cols;
    const ch = LAMP_HEIGHT / rows;

    for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = -hw + col * cw + cw * 0.5 + (Math.random() - 0.5) * cw * 0.65;
        const cy =       row * ch + ch * 0.5 + (Math.random() - 0.5) * ch * 0.65;
        const cz = (Math.random() - 0.5) * LAMP_DEPTH;

        const r = Math.random();
        let radius: number;
        if      (r < 0.35) radius = 0.17 + Math.random() * 0.08;
        else if (r < 0.75) radius = 0.20 + Math.random() * 0.12;
        else               radius = 0.26 + Math.random() * 0.12;

        blobs.push(makeBlob(cx, cy, cz, radius, (1 - cy / LAMP_HEIGHT) * 0.9 + Math.random() * 0.4));
    }
    return blobs;
}