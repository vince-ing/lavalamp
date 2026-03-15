import { Blob } from '../core/types';
import {
    GRAVITY, BUOYANCY, HEAT_ZONE, COOL_ZONE,
    TURBULENCE, REPULSION_STRENGTH, REPULSION_MIN_DIST,
    LAMP_DEPTH,
} from '../core/constants';

// ── Curl noise ────────────────────────────────────────────────────────────────
const CURL_SCALE    = 1.0;
const CURL_STRENGTH = 0.5;
const CURL_SPEED    = 0.6;

function smoothHash(x: number, y: number): number {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix,        fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const h = (nx: number, ny: number) => {
        let n = Math.sin(nx * 127.1 + ny * 311.7) * 43758.5453;
        return n - Math.floor(n);
    };
    return (
        h(ix,   iy  ) * (1 - ux) * (1 - uy) +
        h(ix+1, iy  ) *      ux  * (1 - uy) +
        h(ix,   iy+1) * (1 - ux) *      uy  +
        h(ix+1, iy+1) *      ux  *      uy
    );
}

function curlNoise(x: number, y: number, t: number): { vx: number; vy: number } {
    const e = 0.01;
    const sc = CURL_SCALE;
    const tx = t * CURL_SPEED;
    const ty = t * CURL_SPEED * 0.7;
    const dψdy = (smoothHash(x * sc + tx, (y + e) * sc + ty) -
                  smoothHash(x * sc + tx, (y - e) * sc + ty)) / (2 * e);
    const dψdx = (smoothHash((x + e) * sc + tx, y * sc + ty) -
                  smoothHash((x - e) * sc + tx, y * sc + ty)) / (2 * e);
    return { vx: dψdy, vy: -dψdx };
}

export function updateBlob(blob: Blob, dt: number, time: number): void {
    blob.privateTime += dt * blob.noiseSpeed;
    const t = blob.privateTime;

    const buoyF = (blob.temperature - 1.0) * BUOYANCY;
    blob.velocity.y += buoyF * dt;
    blob.velocity.y -= GRAVITY * dt;

    blob.velocity.x += (
        Math.sin(t              + blob.noisePhaseX) * 0.65 +
        Math.sin(t * 2.7183     + blob.noisePhaseY) * 0.35
    ) * TURBULENCE * dt;

    blob.velocity.y += (
        Math.cos(t * 1.3137     + blob.noisePhaseY) * 0.65 +
        Math.cos(t * 0.6180     + blob.noisePhaseX) * 0.35
    ) * TURBULENCE * 0.4 * dt;

    // Gentle Z drift — blobs slowly wander in depth
    blob.velocity.z += (
        Math.sin(t * 0.7 + blob.noisePhaseX * 1.3) * 0.4
    ) * TURBULENCE * 0.2 * dt;

    const curl = curlNoise(blob.position.x, blob.position.y, time);
    blob.velocity.x += curl.vx * CURL_STRENGTH * dt;
    blob.velocity.y += curl.vy * CURL_STRENGTH * dt;

    if (blob.position.y < HEAT_ZONE) blob.temperature = Math.min(2.0, blob.temperature + 0.6  * dt);
    if (blob.position.y > COOL_ZONE) blob.temperature = Math.max(0.0, blob.temperature - 0.35 * dt);
}

export function applyRepulsion(blobs: Blob[], dt: number): void {
    for (let i = 0; i < blobs.length; i++) {
        for (let j = i + 1; j < blobs.length; j++) {
            const a = blobs[i];
            const b = blobs[j];

            const dx = a.position.x - b.position.x;
            const dy = a.position.y - b.position.y;
            const dz = a.position.z - b.position.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

            const minDist = (a.radius + b.radius) * 0.9;
            if (dist >= minDist || dist < REPULSION_MIN_DIST) continue;

            const overlap = (minDist - dist) / minDist;
            const force   = overlap * REPULSION_STRENGTH * dt;

            const nx = dx / dist;
            const ny = dy / dist;
            const nz = dz / dist;

            const totalMass = a.radius * a.radius + b.radius * b.radius;
            const wa = b.radius * b.radius / totalMass;
            const wb = a.radius * a.radius / totalMass;

            a.velocity.x += nx * force * wa;
            a.velocity.y += ny * force * wa;
            a.velocity.z += nz * force * wa * 0.3;
            b.velocity.x -= nx * force * wb;
            b.velocity.y -= ny * force * wb;
            b.velocity.z -= nz * force * wb * 0.3;
        }
    }
}