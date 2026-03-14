import * as THREE from 'three';

export const PALETTE = {
    fluidTop:    '#050a1f',
    fluidBottom: '#2656a3',
    waxEdge:     '#f2590d',
    waxCore:     '#faa619',
    // Secondary fill light from top-left. Change color and strength here.
    // Color: any CSS hex. Good options: cool blue '#4a8fe8', soft white '#ffe8c8', teal '#2ab8c8'
    fillLight:   '#33f1ff',
};

export const FILL_LIGHT_STRENGTH = 0.0 // 0.0 = off, 1.0 = as strong as main lamp

export const SHADER_COLORS = {
    fluidTop:    new THREE.Color(PALETTE.fluidTop),
    fluidBottom: new THREE.Color(PALETTE.fluidBottom),
    waxEdge:     new THREE.Color(PALETTE.waxEdge),
    waxCore:     new THREE.Color(PALETTE.waxCore),
    fillLight:   new THREE.Color(PALETTE.fillLight),
};