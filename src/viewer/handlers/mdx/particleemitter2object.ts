import MdlxParticleEmitter2 from '../../../parsers/mdlx/particleemitter2';
import Texture from '../../texture';
import MdxModel from './model';
import MdxComplexInstance from './complexinstance';
import GenericObject from './genericobject';
import { emitterFilterMode } from './filtermode';
import replaceableIds from './replaceableids';
import { EMITTER_PARTICLE2 } from './geometryemitterfuncs';

/**
 * An MDX particle emitter type 2.
 */
export default class ParticleEmitter2Object extends GenericObject {
  geometryEmitterType: number = EMITTER_PARTICLE2;
  width: number;
  length: number;
  speed: number;
  latitude: number;
  gravity: number;
  emissionRate: number;
  squirt: number;
  lifeSpan: number;
  variation: number;
  tailLength: number;
  timeMiddle: number;
  columns: number;
  rows: number;
  teamColored: number = 0;
  internalTexture: Texture | null = null;
  replaceableId: number;
  head: boolean;
  tail: boolean;
  cellWidth: number;
  cellHeight: number;
  colors: Float32Array[];
  scaling: Float32Array;
  intervals: Float32Array[];
  blendSrc: number = 0;
  blendDst: number = 0;
  priorityPlane: number;
  /**
   * Even if the internal texture isn't loaded, it's fine to run emitters based on this emitter object.
   * 
   * The particles will simply be black.
   */
  ok: boolean = true;

  constructor(model: MdxModel, emitter: MdlxParticleEmitter2, index: number) {
    super(model, emitter, index);

    this.width = emitter.width;
    this.length = emitter.length;
    this.speed = emitter.speed;
    this.latitude = emitter.latitude;
    this.gravity = emitter.gravity;
    this.emissionRate = emitter.emissionRate;
    this.squirt = emitter.squirt;
    this.lifeSpan = emitter.lifeSpan;
    this.variation = emitter.variation;
    this.tailLength = emitter.tailLength;
    this.timeMiddle = emitter.timeMiddle;

    let replaceableId = emitter.replaceableId;

    this.columns = emitter.columns;
    this.rows = emitter.rows;

    if (replaceableId === 0) {
      this.internalTexture = model.textures[emitter.textureId];
    } else if (replaceableId === 1 || replaceableId === 2) {
      this.teamColored = 1;
    } else {
      this.internalTexture = model.viewer.load('ReplaceableTextures\\' + replaceableIds[replaceableId] + '.blp', model.pathSolver, model.solverParams);
    }

    this.replaceableId = emitter.replaceableId;

    let headOrTail = emitter.headOrTail;

    this.head = (headOrTail === 0 || headOrTail === 2);
    this.tail = (headOrTail === 1 || headOrTail === 2);

    this.cellWidth = 1 / emitter.columns;
    this.cellHeight = 1 / emitter.rows;
    this.colors = [];

    let colors = emitter.segmentColors;
    let alpha = emitter.segmentAlphas;

    for (let i = 0; i < 3; i++) {
      let color = colors[i];

      this.colors[i] = new Float32Array([color[0], color[1], color[2], alpha[i] / 255]);
    }

    this.scaling = emitter.segmentScaling;

    let headIntervals = emitter.headIntervals;
    let tailIntervals = emitter.tailIntervals;

    // Change to Float32Array instead of Uint32Array to be able to pass the intervals directly using uniform3fv().
    this.intervals = [
      new Float32Array(headIntervals[0]),
      new Float32Array(headIntervals[1]),
      new Float32Array(tailIntervals[0]),
      new Float32Array(tailIntervals[1]),
    ];

    let blendModes = emitterFilterMode(emitter.filterMode, this.model.viewer.gl);

    this.blendSrc = blendModes[0];
    this.blendDst = blendModes[1];

    this.priorityPlane = emitter.priorityPlane;
  }

  getWidth(out: Float32Array, instance: MdxComplexInstance) {
    return this.getScalarValue(out, 'KP2N', instance, this.width);
  }

  getLength(out: Float32Array, instance: MdxComplexInstance) {
    return this.getScalarValue(out, 'KP2W', instance, this.length);
  }

  getSpeed(out: Float32Array, instance: MdxComplexInstance) {
    return this.getScalarValue(out, 'KP2S', instance, this.speed);
  }

  getLatitude(out: Float32Array, instance: MdxComplexInstance) {
    return this.getScalarValue(out, 'KP2L', instance, this.latitude);
  }

  getGravity(out: Float32Array, instance: MdxComplexInstance) {
    return this.getScalarValue(out, 'KP2G', instance, this.gravity);
  }

  getEmissionRate(out: Float32Array, instance: MdxComplexInstance) {
    return this.getScalarValue(out, 'KP2E', instance, this.emissionRate);
  }

  getVisibility(out: Float32Array, instance: MdxComplexInstance) {
    return this.getScalarValue(out, 'KP2V', instance, 1);
  }

  getVariation(out: Float32Array, instance: MdxComplexInstance) {
    return this.getScalarValue(out, 'KP2R', instance, this.variation);
  }
}
