import { Blob } from '../core/types';
import { GRAVITY, BUOYANCY, HEAT_ZONE, COOL_ZONE, TURBULENCE } from '../core/constants';

export function updateBlob(blob: Blob, dt: number, time: number): void {
    blob.velocity.y += (blob.temperature * BUOYANCY) * dt;
    blob.velocity.y -= GRAVITY * dt;
    
    // Use sin/cos waves offset by the blob's ID for smooth, continuous swaying
    blob.velocity.x += Math.sin(time * 1.5 + blob.id) * TURBULENCE * dt;
    blob.velocity.y += Math.cos(time * 1.2 + blob.id) * TURBULENCE * dt;

    if (blob.position.y < HEAT_ZONE) {
        blob.temperature += 0.3 * dt;
    }
    
    if (blob.position.y > COOL_ZONE) {
        blob.temperature -= 0.2 * dt;
    }

    blob.temperature = Math.max(0, Math.min(2, blob.temperature));
}