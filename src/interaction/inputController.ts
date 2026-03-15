import { BlobSystem } from '../simulation/blobSystem';
import { LAMP_HEIGHT } from '../core/constants';

const MAX_INTERACTION_SPEED = 3.2;

export class InputController {
    private touches = new Map<number, { x: number; y: number }>();
    private mouse = { x: 0, y: 0 };
    private leftDown  = false;
    private rightDown = false;

    constructor(canvas: HTMLCanvasElement) {
        const toSim = (cx: number, cy: number) => {
            const r = canvas.getBoundingClientRect();
            const aspect = r.width / r.height;
            const sw = LAMP_HEIGHT * aspect;
            return {
                x: ((cx - r.left) / r.width)  * sw - sw / 2,
                y: ((cy - r.top) / r.height) * LAMP_HEIGHT,
            };
        };

        canvas.addEventListener('mousemove',  (e) => { this.mouse = toSim(e.clientX, e.clientY); });
        canvas.addEventListener('mousedown',  (e) => { if (e.button === 0) this.leftDown  = true;  if (e.button === 2) this.rightDown = true; });
        canvas.addEventListener('mouseup',    (e) => { if (e.button === 0) this.leftDown  = false; if (e.button === 2) this.rightDown = false; });
        canvas.addEventListener('mouseleave', ()  => { this.leftDown = false; this.rightDown = false; });
        canvas.addEventListener('contextmenu',(e) => e.preventDefault());

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            for (const t of Array.from(e.changedTouches))
                this.touches.set(t.identifier, toSim(t.clientX, t.clientY));
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const t of Array.from(e.changedTouches)) {
                const prev = this.touches.get(t.identifier);
                if (!prev) continue;
                const curr = toSim(t.clientX, t.clientY);
                (t as any)._simDelta = { dx: curr.x - prev.x, dy: curr.y - prev.y };
                this.touches.set(t.identifier, curr);
            }
            this._applyTouchDeltas(e);
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (const t of Array.from(e.changedTouches))
                this.touches.delete(t.identifier);
        }, { passive: false });

        canvas.addEventListener('touchcancel', () => this.touches.clear());
    }

    private _pendingPushes: Array<{ x: number; y: number; dx: number; dy: number }> = [];

    private _applyTouchDeltas(e: TouchEvent): void {
        for (const t of Array.from(e.changedTouches)) {
            const pos   = this.touches.get(t.identifier);
            const delta = (t as any)._simDelta as { dx: number; dy: number } | undefined;
            if (pos && delta)
                this._pendingPushes.push({ x: pos.x, y: pos.y, dx: delta.dx, dy: delta.dy });
        }
    }

    update(bs: BlobSystem): void {
        for (const push of this._pendingPushes)
            this._pushBlobs(bs, push.x, push.y, push.dx * 28, push.dy * 28);
        this._pendingPushes = [];

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
                const t  = 1 - dist / reach;
                const str = t * t * 3.6;

                if (this.leftDown)  { b.velocity.x -= nx * str; b.velocity.y -= ny * str; }
                if (this.rightDown) { b.velocity.x += nx * str * 1.4; b.velocity.y += ny * str * 1.4; }

                const speed = Math.sqrt(b.velocity.x ** 2 + b.velocity.y ** 2);
                if (speed > MAX_INTERACTION_SPEED) {
                    b.velocity.x = (b.velocity.x / speed) * MAX_INTERACTION_SPEED;
                    b.velocity.y = (b.velocity.y / speed) * MAX_INTERACTION_SPEED;
                }
            }
        }
    }

    private _pushBlobs(bs: BlobSystem, mx: number, my: number, forceX: number, forceY: number): void {
        for (const b of bs.getBlobs()) {
            const dx = b.position.x - mx;
            const dy = b.position.y - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const reach = b.radius * 5.5;
            if (dist < reach && dist > 0.001) {
                const t = 1 - dist / reach;
                const str = t * t;
                b.velocity.x += forceX * str;
                b.velocity.y += forceY * str;
                const speed = Math.sqrt(b.velocity.x ** 2 + b.velocity.y ** 2);
                if (speed > MAX_INTERACTION_SPEED) {
                    b.velocity.x = (b.velocity.x / speed) * MAX_INTERACTION_SPEED;
                    b.velocity.y = (b.velocity.y / speed) * MAX_INTERACTION_SPEED;
                }
            }
        }
    }
}