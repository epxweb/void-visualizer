// scenes/TriTile.js
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0/build/three.module.js';
import { map } from '../core/utils.js';

/**
 * TriTileSceneクラス
 * 三角形のタイルが敷き詰められた平面上をカメラが移動し、音に反応してタイルが点灯するビジュアルシーン。
 * [修正] タイル描画ロジックを全面的に見直し、全画面に正しく配置。
 */
export class TriTileScene {
  /**
   * @param {THREE.Scene} scene - レンダリング対象のメインシーン。
   * @param {object} params - Tweakpaneで操作するパラメータオブジェクト。
   * @param {THREE.Camera} camera - レンダリングに使用するカメラ。
   */
  constructor(scene, params, camera) {
    this.threeScene = scene;
    this.params = params;
    this.camera = camera;

    // このシーン固有の定数
    this.TILE_SIZE = 2.5;
    this.GRID_WIDTH = 44; // 画面を確実に埋めるために少し大きめに設定
    this.GRID_HEIGHT = 24;

    this.tileGroup = new THREE.Group();
    this.tiles = null;
    this.tileStates = []; // 各タイルの状態を管理 { life: number }

    this.init();
  }

  /**
   * シーンの初期化処理。
   */
  init() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    const triangleHeight = (Math.sqrt(3) / 2) * this.TILE_SIZE;
    // グリッド全体の中心を0,0にするためのオフセットを計算
    const totalWidth = this.GRID_WIDTH * this.TILE_SIZE * 0.5;
    const totalHeight = this.GRID_HEIGHT * triangleHeight;
    const offsetX = -totalWidth / 2;
    const offsetY = -totalHeight / 2;
    const baseColor = new THREE.Color(this.params.visual.backgroundColor);

    let tileIndex = 0;
    for (let y = 0; y < this.GRID_HEIGHT; y++) {
      for (let x = 0; x < this.GRID_WIDTH; x++) {
        const px = x * this.TILE_SIZE * 0.5 + offsetX;
        const py = y * triangleHeight + offsetY;
        
        let p1, p2, p3;

        if ((x + y) % 2 === 0) {
          // 上向きの三角形 ▲
          p1 = new THREE.Vector3(px, py, 0);
          p2 = new THREE.Vector3(px + this.TILE_SIZE, py, 0);
          p3 = new THREE.Vector3(px + this.TILE_SIZE / 2, py + triangleHeight, 0);
        } else {
          // 下向きの三角形 ▼
          p1 = new THREE.Vector3(px + this.TILE_SIZE / 2, py, 0);
          p2 = new THREE.Vector3(px, py + triangleHeight, 0);
          p3 = new THREE.Vector3(px + this.TILE_SIZE, py + triangleHeight, 0);
        }
        
        positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);

        for (let i = 0; i < 3; i++) {
          colors.push(baseColor.r, baseColor.g, baseColor.b);
        }
        
        this.tileStates[tileIndex++] = { life: 0, idle: Math.random() * Math.PI * 2 };
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.tiles = new THREE.Mesh(geometry, material);
    this.tileGroup.add(this.tiles);
    this.threeScene.add(this.tileGroup);
  }

  /**
   * シーンの更新処理。
   * @param {object} audioData - 解析されたオーディオデータ { bass, mid, treble }。
   * @param {number} time - 経過時間。
   */
  update(audioData, time) {
    const { bass, mid, treble } = audioData;

    const moveSpeed = map(mid, 0, 1, 0.01, 0.1);
    this.tileGroup.position.x = Math.sin(time * 0.1) * 10 * moveSpeed;
    this.tileGroup.position.y = Math.cos(time * 0.08) * 10 * moveSpeed;

    const colors = this.tiles.geometry.attributes.color;
    const foregroundColor = new THREE.Color(this.params.visual.foregroundColor);
    const backgroundColor = new THREE.Color(this.params.visual.backgroundColor);
    
    const bassPulse = map(bass, 0.6, 1.0, 0, 0.4); 
    const trebleThreshold = 0.12; 
    const trebleMultiplier = 50;

    if (treble > trebleThreshold) {
      const flashCount = Math.floor(map(treble, trebleThreshold, 1.0, 1, trebleMultiplier));
      for (let i = 0; i < flashCount; i++) {
        const tileIndex = Math.floor(Math.random() * this.tileStates.length);
        if (this.tileStates[tileIndex]) {
            this.tileStates[tileIndex].life = 1.0;
        }
      }
    }

    for (let i = 0; i < this.tileStates.length; i++) {
      const state = this.tileStates[i];
      if (state.life > 0) {
        state.life -= 0.05;
      } else {
        state.life = 0;
      }

      const idleBrightness = (Math.sin(time * 0.5 + state.idle) + 1) / 2 * 0.05;
      const totalBrightness = state.life + idleBrightness + bassPulse;

      const finalColor = backgroundColor.clone().lerp(foregroundColor, totalBrightness);
      
      colors.setXYZ(i * 3 + 0, finalColor.r, finalColor.g, finalColor.b);
      colors.setXYZ(i * 3 + 1, finalColor.r, finalColor.g, finalColor.b);
      colors.setXYZ(i * 3 + 2, finalColor.r, finalColor.g, finalColor.b);
    }
    colors.needsUpdate = true;
  }
  
  updateForegroundColor(color) {
    // 処理はupdateに任せる
  }

  show() {
    this.tileGroup.visible = true;
  }

  hide() {
    this.tileGroup.visible = false;
  }

  dispose() {
    this.tiles.geometry.dispose();
    this.tiles.material.dispose();
    this.threeScene.remove(this.tileGroup);
  }
}