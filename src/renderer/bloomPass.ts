import * as THREE from 'three';
import {
    blurVertH, blurFragH,
    blurVertV, blurFragV,
    compositeVert, compositeFrag,
} from '../shaders/bloom';

export class BloomPass {
    private rtScene:  THREE.WebGLRenderTarget;
    private rtBlurH:  THREE.WebGLRenderTarget;
    private rtBlurV:  THREE.WebGLRenderTarget;

    private matBlurH:     THREE.ShaderMaterial;
    private matBlurV:     THREE.ShaderMaterial;
    private matComposite: THREE.ShaderMaterial;

    private quadGeo: THREE.PlaneGeometry;
    private quadScene: THREE.Scene;
    private quadCam:   THREE.OrthographicCamera;

    constructor(width: number, height: number) {
        const opts: THREE.RenderTargetOptions = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
        };

        // Render blobs at full res, blur at half res to save GPU
        this.rtScene = new THREE.WebGLRenderTarget(width, height, opts);
        this.rtBlurH = new THREE.WebGLRenderTarget(width >> 1, height >> 1, opts);
        this.rtBlurV = new THREE.WebGLRenderTarget(width >> 1, height >> 1, opts);

        this.matBlurH = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse:   { value: this.rtScene.texture },
                resolution: { value: new THREE.Vector2(width >> 1, height >> 1) },
            },
            vertexShader:   blurVertH,
            fragmentShader: blurFragH,
        });

        this.matBlurV = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse:   { value: this.rtBlurH.texture },
                resolution: { value: new THREE.Vector2(width >> 1, height >> 1) },
            },
            vertexShader:   blurVertV,
            fragmentShader: blurFragV,
        });

        this.matComposite = new THREE.ShaderMaterial({
            uniforms: {
                tBase:        { value: this.rtScene.texture },
                tBloom:       { value: this.rtBlurV.texture },
                bloomStrength: { value: 0.38 },
            },
            vertexShader:   compositeVert,
            fragmentShader: compositeFrag,
            transparent: true,
            depthWrite: false,
        });

        // Single full-screen quad reused for all passes
        this.quadGeo   = new THREE.PlaneGeometry(2, 2);
        this.quadScene = new THREE.Scene();
        this.quadCam   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }

    resize(width: number, height: number): void {
        this.rtScene.setSize(width, height);
        this.rtBlurH.setSize(width >> 1, height >> 1);
        this.rtBlurV.setSize(width >> 1, height >> 1);
        this.matBlurH.uniforms.resolution.value.set(width >> 1, height >> 1);
        this.matBlurV.uniforms.resolution.value.set(width >> 1, height >> 1);
    }

    /** Render scene → blur → composite, writing final result to the canvas */
    render(
        renderer: THREE.WebGLRenderer,
        mainScene: THREE.Scene,
        camera: THREE.Camera,
    ): void {
        // 1. Render the blob scene into rtScene
        renderer.setRenderTarget(this.rtScene);
        renderer.clear();
        renderer.render(mainScene, camera);

        // 2. Horizontal blur: rtScene → rtBlurH
        this.renderQuad(renderer, this.matBlurH, this.rtBlurH);

        // 3. Vertical blur: rtBlurH → rtBlurV
        this.renderQuad(renderer, this.matBlurV, this.rtBlurV);

        // 4. Composite base + bloom → canvas
        renderer.setRenderTarget(null);
        renderer.clear();
        this.renderQuad(renderer, this.matComposite, null);
    }

    private renderQuad(
        renderer: THREE.WebGLRenderer,
        material: THREE.ShaderMaterial,
        target: THREE.WebGLRenderTarget | null,
    ): void {
        // Swap mesh material each pass — cheaper than creating new meshes
        const mesh = new THREE.Mesh(this.quadGeo, material);
        this.quadScene.clear();
        this.quadScene.add(mesh);
        renderer.setRenderTarget(target);
        renderer.render(this.quadScene, this.quadCam);
    }

    dispose(): void {
        this.rtScene.dispose();
        this.rtBlurH.dispose();
        this.rtBlurV.dispose();
        this.matBlurH.dispose();
        this.matBlurV.dispose();
        this.matComposite.dispose();
        this.quadGeo.dispose();
    }
}