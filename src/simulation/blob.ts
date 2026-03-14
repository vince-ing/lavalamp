import { Blob as IBlob } from '../core/types';
import { LAMP_WIDTH, LAMP_HEIGHT } from '../core/constants';

export class Blob implements IBlob {
    id: number;
    position: { x: number, y: number };
    velocity: { x: number, y: number };
    temperature: number;
    radius: number;

    constructor(id: number) {
        this.id = id;
        
        // Random position within the lamp bounds
        this.position = {
            x: (Math.random() - 0.5) * LAMP_WIDTH,
            y: Math.random() * LAMP_HEIGHT
        };
        
        // Initial velocity is zero
        this.velocity = { x: 0, y: 0 };
        
        // Temperature between 0 and 1
        this.temperature = Math.random();
        
        // Radius between 0.15 and 0.35
        this.radius = 0.15 + (Math.random() * 0.20);
    }
}
