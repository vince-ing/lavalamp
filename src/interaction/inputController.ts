import { BlobSystem } from '../simulation/blobSystem';
import { LAMP_HEIGHT } from '../core/constants';

const MAX_INTERACTION_SPEED = 2.2;

export class InputController {
    private mouse = { x: 0, y: 0 };
    private leftDown  = false;
    private rightDown = false;

    constructor(canvas: HTMLCanvasElement) {
        const toSim = (cx: number, cy: number) => {
            const r = canvas.getBoundingClientRect();
            const aspect = r.width / r.height;
            const sw = LAMP_HEIGHT * aspect;
            return { x: ((cx - r.left) / r.width) * sw - sw / 2,
                     y: (1 - (cy - r.top) / r.height) * LAMP_HEIGHT };
        };
        canvas.addEventListener('mousemove',   (e) => { this.mouse = toSim(e.clientX, e.clientY); });
        canvas.addEventListener('mousedown',   (e) => { if (e.button===0) this.leftDown=true;  if (e.button===2) this.rightDown=true; });
        canvas.addEventListener('mouseup',     (e) => { if (e.button===0) this.leftDown=false; if (e.button===2) this.rightDown=false; });
        canvas.addEventListener('mouseleave',  ()  => { this.leftDown=false; this.rightDown=false; });
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    update(bs: BlobSystem): void {
        if (!this.leftDown && !this.rightDown) return;
        const { x: mx, y: my } = this.mouse;

        for (const b of bs.getBlobs()) {
            const dx = b.position.x - mx;
            const dy = b.position.y - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const reach = b.radius * 4.5;
            if (dist < reach && dist > 0.001) {
                const nx = dx / dist;
                const ny = dy / dist;
                const t = 1 - dist / reach;
                const str = t * t * 1.6;

                if (this.leftDown) {
                    b.velocity.x -= nx * str;
                    b.velocity.y -= ny * str;
                }
                if (this.rightDown) {
                    b.velocity.x += nx * str * 1.4;
                    b.velocity.y += ny * str * 1.4;
                }

                const speed = Math.sqrt(b.velocity.x**2 + b.velocity.y**2);
                if (speed > MAX_INTERACTION_SPEED) {
                    b.velocity.x = (b.velocity.x / speed) * MAX_INTERACTION_SPEED;
                    b.velocity.y = (b.velocity.y / speed) * MAX_INTERACTION_SPEED;
                }
            }
        }
    }
}