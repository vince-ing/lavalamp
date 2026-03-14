import { Blob } from '../core/types';
import { GRAVITY, BUOYANCY, HEAT_ZONE, COOL_ZONE, TURBULENCE } from '../core/constants';

export function updateBlob(blob: Blob, dt: number, time: number): void {
    const buoyF = (blob.temperature - 1.0) * BUOYANCY;
    blob.velocity.y += buoyF * dt;
    blob.velocity.y -= GRAVITY * dt;

    const ph = blob.id * 2.3999;
    blob.velocity.x += Math.sin(time * 1.1 + ph)        * TURBULENCE * dt;
    blob.velocity.y += Math.cos(time * 0.85 + ph * 1.3) * TURBULENCE * 0.4 * dt;

    if (blob.position.y < HEAT_ZONE)  blob.temperature = Math.min(2.0, blob.temperature + 0.6 * dt);
    if (blob.position.y > COOL_ZONE)  blob.temperature = Math.max(0.0, blob.temperature - 0.35 * dt);
}