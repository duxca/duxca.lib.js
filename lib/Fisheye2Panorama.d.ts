/// <reference types="three" />
import * as THREE from "three";
export declare class Fisheye2Panorama {
    renderer: THREE.WebGLRenderer;
    canvas: HTMLCanvasElement;
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    meshes: THREE.Mesh[];
    texis: THREE.Texture[];
    width: number;
    height: number;
    local: THREE.Object3D;
    constructor();
    getRendererFromVideo(video: HTMLVideoElement, o: {
        margin?: number;
        width?: number;
        R1?: number;
        R2?: number;
    }): () => HTMLCanvasElement;
    getPanoramaSize(): {
        width: number;
        height: number;
    };
    setCanvasSize(w: number, h: number): void;
    getCanvasSize(): {
        width: number;
        height: number;
    };
    setCameraSize(w: number, h: number): void;
    getCameraSize(): {
        width: number;
        height: number;
    };
    setCameraPosition(x: number, y: number): void;
    getCameraPosition(): {
        x: number;
        y: number;
    };
    setCameraRect(rect: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): void;
    getCameraRect(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    unload(): void;
}
export declare function convertCnvCoord2CameraCoord(cnv: {
    width: number;
    height: number;
}, cam: {
    width: number;
    height: number;
}, pos: {
    x: number;
    y: number;
}): {
    x: number;
    y: number;
};
export declare function convertCameraCoord2CnvCoord(cam: {
    width: number;
    height: number;
}, cnv: {
    width: number;
    height: number;
}, pos: {
    x: number;
    y: number;
}): {
    x: number;
    y: number;
};
export declare function calcZoom(cam: {
    x: number;
    y: number;
    width: number;
    height: number;
}, zoom: {
    x: number;
    y: number;
    scale: number;
}): {
    x: number;
    y: number;
    width: number;
    height: number;
};
export declare function load_video_texture(url: string): Promise<THREE.Texture>;
export declare function load_skybox_texture(urls: string): Promise<THREE.Texture>;
export declare let CLIPPING_OFFSET_X: number;
export declare let CLIPPING_OFFSET_Y: number;
export declare function calculate_clip_size(width: number, height: number, margin?: number): {
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    dx: number;
    dy: number;
    dw: number;
    dh: number;
};
export declare function load_fisheye_image_canvas_texture(url: string, margin?: number): Promise<THREE.Texture>;
export declare function load_fisheye_video_canvas_texture(video: HTMLVideoElement, margin?: number): {
    clip: () => void;
    tex: THREE.Texture;
};
export declare function createSkyboxMesh(skybox_texture: THREE.Texture): THREE.Mesh;
export declare type Radian = number;
export declare function calcuratePanoramaSizeFromFisheyeImage(R: number, r1?: number, r2?: number): {
    width: number;
    height: number;
};
export declare function planeRect2Fisheye(u: number, v: number, width?: number, height?: number, r1?: number, r2?: number): {
    x: number;
    y: number;
};
export declare function fisheye2Hemisphere(x: number, y: number, r: number): {
    x: number;
    y: number;
    z: number;
};
export declare function hemisphere2PolarHemisphere(x: number, y: number, z: number): {
    l: number;
    theta: Radian;
    z: number;
};
export declare function theSystemTransform(l: number, theta: Radian, z: number, r: number, alpha: Radian, beta: Radian): {
    m: number;
    alpha_: Radian;
};
export declare function polar2Orthogonal(l: number, theta: Radian): {
    x: number;
    y: number;
};
export declare function createPanoramaMaterial2(fisheye_texture: THREE.Texture): {
    mat: THREE.Material;
    plane: THREE.Geometry;
    width: number;
    height: number;
};
export declare function createPanoramaMaterial(fisheye_texture: THREE.Texture, panorama_width?: number, _R1_ratio?: number, _R2_ratio?: number): {
    mat: THREE.Material;
    plane: THREE.Geometry;
    width: number;
    height: number;
};
export declare function createPanoramaMesh(mat: THREE.Material, plane: THREE.Geometry): THREE.Mesh;
export declare function createFisheyeMesh(fisheye_texture: THREE.Texture): THREE.Mesh;
