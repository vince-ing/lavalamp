import * as THREE from 'three';

export const PALETTE = {
    fluidTop:    '#020510',   // near-black deep space
    fluidBottom: '#110840',   // rich indigo
    waxEdge:     '#1a1060',   // deep blue-violet silhouette edge
    waxCore:     '#cce0ff',   // pale blue-white — the actual wax, backlit
    fillLight:   '#00e8d5',   // cyan backlight — the lamp heat glow bleeding through
};

export const LAYER_BLOB_COUNTS = {
    back:   4,
    middle: 5,
    front:  8,
};

export const FILL_LIGHT_STRENGTH = 0.28;

export const SHADER_COLORS = {
    fluidTop:    new THREE.Color(PALETTE.fluidTop),
    fluidBottom: new THREE.Color(PALETTE.fluidBottom),
    waxEdge:     new THREE.Color(PALETTE.waxEdge),
    waxCore:     new THREE.Color(PALETTE.waxCore),
    fillLight:   new THREE.Color(PALETTE.fillLight),
};