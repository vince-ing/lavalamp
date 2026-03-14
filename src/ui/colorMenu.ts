import * as THREE from 'three';

export interface ColorState {
    waxEdge:     string;
    waxCore:     string;
    fluidTop:    string;
    fluidBottom: string;
    fillLight:   string;
}

const DEFAULTS: ColorState = {
    waxEdge:     '#fb008e',
    waxCore:     '#c644c2',
    fluidTop:    '#050a1f',
    fluidBottom: '#2656a3',
    fillLight:   '#00eeff',
};

const LABELS: Record<keyof ColorState, string> = {
    waxEdge:     'Wax Edge',
    waxCore:     'Wax Core',
    fluidTop:    'Background Top',
    fluidBottom: 'Background Bottom',
    fillLight:   'Fill Light',
};

export class ColorMenu {
    private el: HTMLDivElement;
    private visible = false;
    private current: ColorState = { ...DEFAULTS };
    private onChange: (state: ColorState) => void;

    constructor(onChange: (state: ColorState) => void) {
        this.onChange = onChange;
        this.el = this.build();
        document.body.appendChild(this.el);
    }

    toggle() {
        this.visible = !this.visible;
        this.el.style.opacity       = this.visible ? '1' : '0';
        this.el.style.pointerEvents = this.visible ? 'all' : 'none';
        this.el.style.transform     = this.visible
            ? 'translate(-50%, -50%) translateY(0px)'
            : 'translate(-50%, -50%) translateY(12px)';
    }

    private build(): HTMLDivElement {
        const panel = document.createElement('div');
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) translateY(12px);
            z-index: 1000;
            background: rgba(4, 8, 28, 0.82);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 20px;
            padding: 32px 36px 28px;
            min-width: 320px;
            box-shadow: 0 8px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.22s ease, transform 0.22s ease;
            font-family: 'DM Sans', 'SF Pro Display', system-ui, sans-serif;
        `;

        // Title
        const title = document.createElement('div');
        title.textContent = 'COLORS';
        title.style.cssText = `
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.18em;
            color: rgba(255,255,255,0.35);
            margin-bottom: 24px;
            user-select: none;
        `;
        panel.appendChild(title);

        // Color rows
        (Object.keys(DEFAULTS) as (keyof ColorState)[]).forEach(key => {
            panel.appendChild(this.buildRow(key));
        });

        // Divider
        const divider = document.createElement('div');
        divider.style.cssText = `height:1px;background:rgba(255,255,255,0.07);margin:20px 0 18px;`;
        panel.appendChild(divider);

        // Reset button
        const reset = document.createElement('button');
        reset.textContent = 'Reset to defaults';
        reset.style.cssText = `
            width: 100%;
            padding: 10px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            color: rgba(255,255,255,0.5);
            font-size: 12px;
            letter-spacing: 0.06em;
            cursor: pointer;
            transition: background 0.15s, color 0.15s;
            font-family: inherit;
        `;
        reset.onmouseenter = () => { reset.style.background = 'rgba(255,255,255,0.1)'; reset.style.color = 'rgba(255,255,255,0.9)'; };
        reset.onmouseleave = () => { reset.style.background = 'rgba(255,255,255,0.05)'; reset.style.color = 'rgba(255,255,255,0.5)'; };
        reset.onclick = () => {
            this.current = { ...DEFAULTS };
            panel.querySelectorAll<HTMLInputElement>('input[type=color]').forEach(inp => {
                inp.value = this.current[inp.dataset.key as keyof ColorState];
                // Update swatch
                const swatch = inp.parentElement as HTMLElement;
                swatch.style.background = inp.value;
                swatch.style.boxShadow = `0 0 14px 3px ${inp.value}99`;
            });
            this.onChange(this.current);
        };
        panel.appendChild(reset);

        // Hint
        const hint = document.createElement('div');
        hint.textContent = 'Press H to close';
        hint.style.cssText = `text-align:center;margin-top:14px;font-size:11px;color:rgba(255,255,255,0.18);user-select:none;letter-spacing:0.06em;`;
        panel.appendChild(hint);

        return panel;
    }

    private buildRow(key: keyof ColorState): HTMLDivElement {
        const row = document.createElement('div');
        row.style.cssText = `display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;`;

        const label = document.createElement('span');
        label.textContent = LABELS[key];
        label.style.cssText = `font-size:13px;color:rgba(255,255,255,0.7);user-select:none;letter-spacing:0.02em;`;

        const swatchWrap = document.createElement('label');
        swatchWrap.style.cssText = `
            position: relative;
            width: 36px; height: 36px;
            border-radius: 50%;
            cursor: pointer;
            display: block;
            box-shadow: 0 0 12px 2px ${this.current[key]}88;
            border: 2px solid rgba(255,255,255,0.15);
            transition: box-shadow 0.2s, transform 0.15s;
            background: ${this.current[key]};
            flex-shrink: 0;
        `;
        swatchWrap.onmouseenter = () => { swatchWrap.style.transform = 'scale(1.12)'; };
        swatchWrap.onmouseleave = () => { swatchWrap.style.transform = 'scale(1)'; };

        const input = document.createElement('input');
        input.type = 'color';
        input.value = this.current[key];
        input.dataset.key = key;
        input.style.cssText = `position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;border:none;padding:0;`;

        input.addEventListener('input', () => {
            this.current[key] = input.value;
            swatchWrap.style.background = input.value;
            swatchWrap.style.boxShadow = `0 0 14px 3px ${input.value}99`;
            this.onChange(this.current);
        });

        swatchWrap.appendChild(input);
        row.appendChild(label);
        row.appendChild(swatchWrap);
        return row;
    }
}