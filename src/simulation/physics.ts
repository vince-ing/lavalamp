import { Blob } from '../core/types';
import { GRAVITY, BUOYANCY, HEAT_ZONE, COOL_ZONE, TURBULENCE } from '../core/constants';

export function updateBlob(blob: Blob, dt: number): void {
    // 1. Compute buoyancy and apply gravity
    // Scaling by dt to make forces frame-rate independent
    blob.velocity.y += (blob.temperature * BUOYANCY) * dt;
    blob.velocity.y -= GRAVITY * dt;
    
    // 2. Apply turbulence (simple noise approximation)
    blob.velocity.x += (Math.random() - 0.5) * TURBULENCE * dt;
    blob.velocity.y += (Math.random() - 0.5) * TURBULENCE * dt;

    // 3. Temperature rules
    if (blob.position.y < HEAT_ZONE) {
        blob.temperature += 0.3 * dt;
    }
    
    if (blob.position.y > COOL_ZONE) {
        blob.temperature -= 0.2 * dt;
    }

    // 4. Clamp temperature (0 ≤ temperature ≤ 2)
    blob.temperature = Math.max(0, Math.min(2, blob.temperature));
}
