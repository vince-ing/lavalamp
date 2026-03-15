import * as THREE from 'three';

export const PALETTE = {
    fluidTop:    '#050a1f',
    fluidBottom: '#2656a3',
    waxEdge:     '#860086',
    waxCore:     '#c000b9',
    fillLight:   '#00eeff',
};

export const BLOB_COUNT = 18;   // single pool, was split across 3 layers

export const FILL_LIGHT_STRENGTH = 0.17;

export const SHADER_COLORS = {
    fluidTop:    new THREE.Color(PALETTE.fluidTop),
    fluidBottom: new THREE.Color(PALETTE.fluidBottom),
    waxEdge:     new THREE.Color(PALETTE.waxEdge),
    waxCore:     new THREE.Color(PALETTE.waxCore),
    fillLight:   new THREE.Color(PALETTE.fillLight),
};