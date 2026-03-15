import * as THREE from 'three';
import {
    blurVertH, blurFragH,
    blurVertV, blurFragV,
    compositeVert, compositeFrag,
} from '../shaders/bloom';

export class BloomPass {
    private rtScene:   THREE.WebGLRenderTarget;
    private rtBlurH:   THREE.WebGLRenderTarget;
    private rtBlurV:   THREE.WebGLRenderTarget;
    // Second (wider) blur pass for the broad halo
    private rtBlurH2:  THREE.WebGLRenderTarget;
    private rtBlurV2:  THREE.WebGLRenderTarget;

    private matBlurH:     THREE.ShaderMaterial;
    private matBlurV:     THREE.ShaderMaterial;
    private matBlurH2:    THREE.ShaderMaterial;
    private matBlurV2:    THREE.ShaderMaterial;
    private matComposite: THREE.ShaderMaterial;

    private quadGeo:   THREE.PlaneGeometry;
    private quadScene: THREE.Scene;
    private quadCam:   THREE.OrthographicCamera;

    constructor(width: number, height: number) {
        const opts: THREE.RenderTargetOptions = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
        };

        this.rtScene  = new THREE.WebGLRenderTarget(width,        height,        opts);
        // Tight bloom at half res
        this.rtBlurH  = new THREE.WebGLRenderTarget(width >> 1,   height >> 1,   opts);
        this.rtBlurV  = new THREE.WebGLRenderTarget(width >> 1,   height >> 1,   opts);
        // Wide halo at quarter res — much cheaper, naturally blurrier
        this.rtBlurH2 = new THREE.WebGLRenderTarget(width >> 2,   height >> 2,   opts);
        this.rtBlurV2 = new THREE.WebGLRenderTarget(width >> 2,   height >> 2,   opts);

        const makeBlurH = (src: THREE.Texture, w: number, h: number) =>
            new THREE.ShaderMaterial({
                uniforms: {
                    tDiffuse:   { value: src },
                    resolution: { value: new THREE.Vector2(w, h) },
                },
                vertexShader:   blurVertH,
                fragmentShader: blurFragH,
            });

        const makeBlurV = (src: THREE.Texture, w: number, h: number) =>
            new THREE.ShaderMaterial({
                uniforms: {
                    tDiffuse:   { value: src },
                    resolution: { value: new THREE.Vector2(w, h) },
                },
                vertexShader:   blurVertV,
                fragmentShader: blurFragV,
            });

        this.matBlurH  = makeBlurH(this.rtScene.texture,  width >> 1, height >> 1);
        this.matBlurV  = makeBlurV(this.rtBlurH.texture,  width >> 1, height >> 1);
        // Wide pass reads from half-res blur result → downsamples further
        this.matBlurH2 = makeBlurH(this.rtBlurV.texture,  width >> 2, height >> 2);
        this.matBlurV2 = makeBlurV(this.rtBlurH2.texture, width >> 2, height >> 2);

        this.matComposite = new THREE.ShaderMaterial({
            uniforms: {
                tBase:         { value: this.rtScene.texture  },
                tBloom:        { value: this.rtBlurV2.texture },
                bloomStrength: { value: 0.28 },
            },
            vertexShader:   compositeVert,
            fragmentShader: compositeFrag,
            transparent: true,
            depthWrite: false,
        });

        this.quadGeo   = new THREE.PlaneGeometry(2, 2);
        this.quadScene = new THREE.Scene();
        this.quadCam   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }

    resize(width: number, height: number): void {
        this.rtScene.setSize(width,       height);
        this.rtBlurH.setSize(width >> 1,  height >> 1);
        this.rtBlurV.setSize(width >> 1,  height >> 1);
        this.rtBlurH2.setSize(width >> 2, height >> 2);
        this.rtBlurV2.setSize(width >> 2, height >> 2);
        this.matBlurH.uniforms.resolution.value.set(width >> 1,  height >> 1);
        this.matBlurV.uniforms.resolution.value.set(width >> 1,  height >> 1);
        this.matBlurH2.uniforms.resolution.value.set(width >> 2, height >> 2);
        this.matBlurV2.uniforms.resolution.value.set(width >> 2, height >> 2);
    }

    render(renderer: THREE.WebGLRenderer, mainScene: THREE.Scene, camera: THREE.Camera): void {
        // 1. Scene → rtScene (full res)
        renderer.setRenderTarget(this.rtScene);
        renderer.clear();
        renderer.render(mainScene, camera);

        // 2. Tight bloom: full → half res H+V
        this.renderQuad(renderer, this.matBlurH, this.rtBlurH);
        this.renderQuad(renderer, this.matBlurV, this.rtBlurV);

        // 3. Wide halo: half → quarter res H+V
        this.renderQuad(renderer, this.matBlurH2, this.rtBlurH2);
        this.renderQuad(renderer, this.matBlurV2, this.rtBlurV2);

        // 4. Composite base + wide bloom → canvas
        renderer.setRenderTarget(null);
        renderer.clear();
        this.renderQuad(renderer, this.matComposite, null);
    }

    private renderQuad(
        renderer: THREE.WebGLRenderer,
        material: THREE.ShaderMaterial,
        target: THREE.WebGLRenderTarget | null,
    ): void {
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
        this.rtBlurH2.dispose();
        this.rtBlurV2.dispose();
        this.matBlurH.dispose();
        this.matBlurV.dispose();
        this.matBlurH2.dispose();
        this.matBlurV2.dispose();
        this.matComposite.dispose();
        this.quadGeo.dispose();
    }
}