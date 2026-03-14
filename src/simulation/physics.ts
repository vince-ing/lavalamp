import { Blob } from '../core/types';
import { GRAVITY, BUOYANCY, HEAT_ZONE, COOL_ZONE, TURBULENCE, REPULSION_STRENGTH, REPULSION_MIN_DIST } from '../core/constants';

export function updateBlob(blob: Blob, dt: number, _time: number): void {
    // Advance this blob's own private clock at its own speed.
    // No two blobs share a clock so turbulence can never synchronise.
    blob.privateTime += dt * blob.noiseSpeed;

    const t = blob.privateTime;

    const buoyF = (blob.temperature - 1.0) * BUOYANCY;
    blob.velocity.y += buoyF * dt;
    blob.velocity.y -= GRAVITY * dt;

    // Two incommensurate terms per axis, all driven by the private clock.
    // The phase offsets (noisePhaseX/Y) are baked-in random seeds.
    blob.velocity.x += (
        Math.sin(t              + blob.noisePhaseX) * 0.65 +
        Math.sin(t * 2.7183     + blob.noisePhaseY) * 0.35
    ) * TURBULENCE * dt;

    blob.velocity.y += (
        Math.cos(t * 1.3137     + blob.noisePhaseY) * 0.65 +
        Math.cos(t * 0.6180     + blob.noisePhaseX) * 0.35
    ) * TURBULENCE * 0.4 * dt;

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
            const dist = Math.sqrt(dx * dx + dy * dy);

            const minDist = (a.radius + b.radius) * 0.9;
            if (dist >= minDist || dist < REPULSION_MIN_DIST) continue;

            const overlap = (minDist - dist) / minDist;
            const force   = overlap * REPULSION_STRENGTH * dt;

            const nx = dx / dist;
            const ny = dy / dist;

            const totalMass = a.radius * a.radius + b.radius * b.radius;
            const wa = b.radius * b.radius / totalMass;
            const wb = a.radius * a.radius / totalMass;

            a.velocity.x += nx * force * wa;
            a.velocity.y += ny * force * wa;
            b.velocity.x -= nx * force * wb;
            b.velocity.y -= ny * force * wb;
        }
    }
}