import { Blob } from '../core/types';
import { GRAVITY, BUOYANCY, HEAT_ZONE, COOL_ZONE, TURBULENCE, REPULSION_STRENGTH, REPULSION_MIN_DIST } from '../core/constants';

export function updateBlob(blob: Blob, dt: number, time: number): void {
    const buoyF = (blob.temperature - 1.0) * BUOYANCY;
    blob.velocity.y += buoyF * dt;
    blob.velocity.y -= GRAVITY * dt;

    // Use the per-blob noise phases (already on the blob) instead of a
    // magic id-multiplier — eliminates correlated motion at certain t values.
    blob.velocity.x += Math.sin(time * 1.1  + blob.noisePhaseX) * TURBULENCE * dt;
    blob.velocity.y += Math.cos(time * 0.85 + blob.noisePhaseY * 1.3) * TURBULENCE * 0.4 * dt;

    if (blob.position.y < HEAT_ZONE) blob.temperature = Math.min(2.0, blob.temperature + 0.6  * dt);
    if (blob.position.y > COOL_ZONE) blob.temperature = Math.max(0.0, blob.temperature - 0.35 * dt);
}

/**
 * Apply pairwise soft repulsion so blobs push each other apart when
 * their radii overlap. O(n²) but n ≤ 25 so negligible on CPU.
 */
export function applyRepulsion(blobs: Blob[], dt: number): void {
    for (let i = 0; i < blobs.length; i++) {
        for (let j = i + 1; j < blobs.length; j++) {
            const a = blobs[i];
            const b = blobs[j];

            const dx = a.position.x - b.position.x;
            const dy = a.position.y - b.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Combined radii — blobs start pushing when they get this close
            const minDist = (a.radius + b.radius) * 0.9;
            if (dist >= minDist || dist < REPULSION_MIN_DIST) continue;

            // Linear falloff: strongest at overlap=0, zero at minDist
            const overlap = (minDist - dist) / minDist;
            const force   = overlap * REPULSION_STRENGTH * dt;

            const nx = dx / dist;
            const ny = dy / dist;

            // Push both blobs apart (equal and opposite, mass ~ radius²)
            const totalMass = a.radius * a.radius + b.radius * b.radius;
            const wa = b.radius * b.radius / totalMass; // larger blob moves less
            const wb = a.radius * a.radius / totalMass;

            a.velocity.x += nx * force * wa;
            a.velocity.y += ny * force * wa;
            b.velocity.x -= nx * force * wb;
            b.velocity.y -= ny * force * wb;
        }
    }
}