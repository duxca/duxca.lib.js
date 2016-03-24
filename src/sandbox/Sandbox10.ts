/// <reference path="../../typings/tsd.d.ts"/>

import CanvasRender from "./CanvasRender";
import Signal from "./Signal";
import RecordBuffer from "./RecordBuffer";
import OSC from "./OSC";
import FPS from "./FPS";
import Wave from "./Wave";
import Metronome from "./Metronome";
import Statictics from "./Statictics";
import Newton from "./Newton";
import Point = Newton.Point;
import SDM = Newton.SDM;
import {Chord, distance, Token} from "./Chord";
import $ = require("jquery");

self["$"] = $;
self["jQuery"] = $;
