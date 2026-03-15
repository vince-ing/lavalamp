import * as THREE from 'three';

export const PALETTE = {
    fluidTop:    '#050a1f',   // deep navy top
    fluidBottom: '#1a3a7a',   // rich blue — visible in the mid/upper background
    waxEdge:     '#0a1040',   // near-black indigo rim
    waxCore:     '#cce0ff',   // pale blue-white wax (overridden in shader)
    fillLight:   '#00e8d5',   // cyan lamp backlight
};

export const LAYER_BLOB_COUNTS = {
    back:   4,
    middle: 5,
    front:  8,
};

export const FILL_LIGHT_STRENGTH = 0.40;

export const SHADER_COLORS = {
    fluidTop:    new THREE.Color(PALETTE.fluidTop),
    fluidBottom: new THREE.Color(PALETTE.fluidBottom),
    waxEdge:     new THREE.Color(PALETTE.waxEdge),
    waxCore:     new THREE.Color(PALETTE.waxCore),
    fillLight:   new THREE.Color(PALETTE.fillLight),
};