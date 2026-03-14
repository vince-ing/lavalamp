import { BlobSystem } from '../simulation/blobSystem';
import { LAMP_WIDTH, LAMP_HEIGHT } from '../core/constants';

export class InputController {
    private mouse: { x: number, y: number } = { x: 0, y: 0 };
    private isClicked: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        // Track mouse position and map it to simulation coordinates
        canvas.addEventListener('mousemove', (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            // Map X to [-LAMP_WIDTH/2, LAMP_WIDTH/2]
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * LAMP_WIDTH - (LAMP_WIDTH / 2);
            // Map Y to [0, LAMP_HEIGHT] (inverted because DOM Y is top-down)
            this.mouse.y = (1.0 - (e.clientY - rect.top) / rect.height) * LAMP_HEIGHT;
        });

        canvas.addEventListener('mousedown', () => { this.isClicked = true; });
        canvas.addEventListener('mouseup', () => { this.isClicked = false; });
        canvas.addEventListener('mouseleave', () => { this.isClicked = false; });
    }

    update(blobSystem: BlobSystem): void {
        if (!this.isClicked) return;

        const blobs = blobSystem.getBlobs();
        
        for (const blob of blobs) {
            const dx = blob.position.x - this.mouse.x;
            const dy = blob.position.y - this.mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Apply directional force if the mouse is within the interaction radius
            // We use a slightly expanded radius to make clicking feel more responsive
            if (dist < blob.radius * 2.5 && dist > 0) {
                const force = 1.5; // Strength of the repulsion
                blob.velocity.x += (dx / dist) * force;
                blob.velocity.y += (dy / dist) * force;
            }
        }
    }
}
