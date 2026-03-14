import { Blob } from './blob';
import { updateBlob } from './physics';
import { MAX_BLOBS, LAMP_WIDTH, LAMP_HEIGHT } from '../core/constants';

export class BlobSystem {
    private blobs: Blob[] = [];
    private positions: Float32Array;
    private radii: Float32Array;

    constructor(blobCount: number) {
        const count = Math.min(blobCount, MAX_BLOBS);
        
        for (let i = 0; i < count; i++) {
            this.blobs.push(new Blob(i));
        }

        // Initialize typed arrays for efficient GPU transfer
        this.positions = new Float32Array(MAX_BLOBS * 2);
        this.radii = new Float32Array(MAX_BLOBS);
    }

    update(dt: number, time: number, aspect: number): void {
        // Calculate dynamic width based on the fixed height (4.0) and aspect ratio
        const dynamicWidth = LAMP_HEIGHT * aspect;
        const halfWidth = dynamicWidth / 2;

        for (let i = 0; i < this.blobs.length; i++) {
            const blob = this.blobs[i];

            updateBlob(blob, dt, time);

            blob.position.x += blob.velocity.x * dt;
            blob.position.y += blob.velocity.y * dt;

            // Enforce dynamic X bounds
            if (blob.position.x < -halfWidth + blob.radius) {
                blob.position.x = -halfWidth + blob.radius;
                blob.velocity.x *= -0.5;
            } else if (blob.position.x > halfWidth - blob.radius) {
                blob.position.x = halfWidth - blob.radius;
                blob.velocity.x *= -0.5;
            }

            // Enforce Y bounds (remains unchanged)
            if (blob.position.y < blob.radius) {
                blob.position.y = blob.radius;
                blob.velocity.y *= -0.5;
            } else if (blob.position.y > LAMP_HEIGHT - blob.radius) {
                blob.position.y = LAMP_HEIGHT - blob.radius;
                blob.velocity.y *= -0.5;
            }

            blob.velocity.x *= 0.99;
            blob.velocity.y *= 0.99;

            this.positions[i * 2] = blob.position.x;
            this.positions[i * 2 + 1] = blob.position.y;
            this.radii[i] = blob.radius;
        }
    }

    getBlobPositions(): Float32Array {
        return this.positions;
    }

    getBlobRadii(): Float32Array {
        return this.radii;
    }

    getBlobCount(): number {
        return this.blobs.length;
    }

    // Exposing the raw array for the InputController to read spatial data
    getBlobs(): Blob[] {
        return this.blobs;
    }
}
