// scenes/DigitalCurtain.js
import * as THREE from 'three';
import { map } from '../core/utils.js';

export class DigitalCurtainScene {
  constructor(scene, params, camera) {
    this.threeScene = scene;
    this.params = params;
    this.camera = camera;

    this.sceneGroup = new THREE.Group();
    this.gridSize = { x: 20, y: 12 };
    this.digitSpacing = { x: 1.8, y: 2.8 };
    this.instancedSegments = null;
    this.digitStates = [];
    this.bassAttackEffect = 0;

    // どのセグメント(a-g)を点灯させるか
    this.SEGMENT_MAP = {
      '0': [true, true, true, true, true, true, false],
      '1': [false, true, true, false, false, false, false],
      '2': [true, true, false, true, true, false, true],
      '3': [true, true, true, true, false, false, true],
      '4': [false, true, true, false, false, true, true],
      '5': [true, false, true, true, false, true, true],
      '6': [true, false, true, true, true, true, true],
      '7': [true, true, true, false, false, false, false],
      '8': [true, true, true, true, true, true, true],
      '9': [true, true, true, true, false, true, true],
    };

    this.init();
  }

  init() {
    const segmentWidth = 0.8;
    const segmentHeight = 0.15;
    const segmentGeometry = new THREE.PlaneGeometry(segmentWidth, segmentHeight);
    const segmentMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.params.visual.foregroundColor),
      side: THREE.DoubleSide
    });

    const totalInstances = this.gridSize.x * this.gridSize.y * 7;
    this.instancedSegments = new THREE.InstancedMesh(segmentGeometry, segmentMaterial, totalInstances);
    this.threeScene.add(this.instancedSegments);

    const dummy = new THREE.Object3D();
    let instanceIdx = 0;

    const totalWidth = this.gridSize.x * this.digitSpacing.x;
    const totalHeight = this.gridSize.y * this.digitSpacing.y;

    for (let y = 0; y < this.gridSize.y; y++) {
      for (let x = 0; x < this.gridSize.x; x++) {
        const digitX = (x - this.gridSize.x / 2 + 0.5) * this.digitSpacing.x;
        const digitY = (y - this.gridSize.y / 2 + 0.5) * this.digitSpacing.y;

        this.digitStates.push({
          currentDigit: Math.floor(Math.random() * 10),
          lastChange: 0,
          changeSpeed: Math.random() * 0.5 + 0.1,
          flash: 0,
          speedMultiplier: 1.0,
          darkenFactor: 1.0
        });

        const segmentPositions = [
          { x: 0, y: 1, r: 0 },    // a
          { x: 0.5, y: 0.5, r: -Math.PI / 2 }, // b
          { x: 0.5, y: -0.5, r: -Math.PI / 2 },// c
          { x: 0, y: -1, r: 0 },   // d
          { x: -0.5, y: -0.5, r: -Math.PI / 2 },// e
          { x: -0.5, y: 0.5, r: -Math.PI / 2 }, // f
          { x: 0, y: 0, r: 0 }     // g
        ];

        for (let i = 0; i < 7; i++) {
          dummy.position.set(digitX + segmentPositions[i].x, digitY + segmentPositions[i].y, 0);
          dummy.rotation.z = segmentPositions[i].r;
          dummy.updateMatrix();
          this.instancedSegments.setMatrixAt(instanceIdx++, dummy.matrix);
        }
      }
    }
    this.instancedSegments.instanceMatrix.needsUpdate = true;
  }

  update(audioData, time) {
    const { bass, mid, treble, bassAttack } = audioData;
    const color = new THREE.Color();
    const baseColor = new THREE.Color(this.params.visual.foregroundColor);

    if (bassAttack > 0.05) {
      this.digitStates.forEach(state => {
        if (Math.random() < 0.1) {
          state.flash = 1.0;
        }
      });
    }

    let instanceIdx = 0;
    for (let i = 0; i < this.gridSize.x * this.gridSize.y; i++) {
      const state = this.digitStates[i];

      if (state.speedMultiplier === 1.0 && Math.random() < map(mid, 0.3, 1.0, 0, 0.4)) {
        state.speedMultiplier = Math.random() * 20 + 20;
      }

      if (time - state.lastChange > 1 / (state.changeSpeed * state.speedMultiplier)) {
        state.currentDigit = Math.floor(Math.random() * 10);
        state.lastChange = time;
        if (state.speedMultiplier > 1.0) {
          state.speedMultiplier = 1.0;
        }
      }

      // trebleが強いほど、高い確率でセグメントを一時的に消灯させる 0.8が閾値、0.5が50%の確率
      if (Math.random() < map(treble, 0.2, 0.8, 0, 0.5)) {
        state.darkenFactor = 0.0; // 消灯トリガー
      }

      const segmentsToShow = this.SEGMENT_MAP[state.currentDigit.toString()];
      const brightness = (0.04 + map(bass, 0, 1, 0, 0.3) + state.flash * 1.5) * state.darkenFactor;

      for (let s = 0; s < 7; s++) {
        const isVisible = segmentsToShow[s];

        if (isVisible) {
          color.set(baseColor).multiplyScalar(brightness);
        } else {
          color.set(baseColor).multiplyScalar(0.02 * state.darkenFactor);
        }
        this.instancedSegments.setColorAt(instanceIdx++, color);
      }
      
      state.flash *= 0.9;
      if (state.darkenFactor < 1.0) {
        state.darkenFactor += 0.01; // 少しずつ元の明るさに戻る
      }
    }
    this.instancedSegments.instanceColor.needsUpdate = true;
  }

  updateForegroundColor(color) {
    // updateループ内で色を更新するため、ここでは何もしない
  }

  show() {
    this.instancedSegments.visible = true;
  }

  hide() {
    this.instancedSegments.visible = false;
  }

  dispose() {
    this.instancedSegments.geometry.dispose();
    this.instancedSegments.material.dispose();
    this.threeScene.remove(this.instancedSegments);
  }
}