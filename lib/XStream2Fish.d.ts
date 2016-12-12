import { Stream } from 'xstream';
export declare function updateCameraRect(canvasSize$: Stream<{
    width: number;
    height: number;
}>, panoramaSize$: Stream<{
    width: number;
    height: number;
}>, cameraRect$: Stream<{
    x: number;
    y: number;
    width: number;
    height: number;
}>, delta$: Stream<{
    deltaX: number;
    deltaY: number;
}>, zoom$: Stream<{
    centerX: number;
    centerY: number;
    scale: number;
}>): Stream<{
    x: number;
    y: number;
    width: number;
    height: number;
}>;
