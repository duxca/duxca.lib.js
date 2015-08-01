/// <reference path="../../../typings/webrtc/MediaStream.d.ts" />
/// <reference path="../../../tsd/console.snapshot/console.snapshot.d.ts" />
/// <reference path="../../../tsd/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode.d.ts" />
declare module Sandbox {
    function testDetect3(): void;
    function testAutoDetect(id?: string): void;
    function testChord(id?: string): void;
    function testDetect2(): void;
    function testKmeans(): void;
    function testComplementaryCode(n?: number): void;
    function showChirp(): void;
    function testDetect(): void;
    function testRecord(): void;
    function testScriptProcessor(): void;
    function testSpectrum(): void;
    function testOSC(): void;
    function testChirp(): void;
}
export = Sandbox;
