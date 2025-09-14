import * as THREE from 'three';
import { map } from '../core/utils.js';

/**
 * "Starry Lake" シーン
 * 静かな湖に星空と山が鏡面反射する風景。
 */
export class StarryLakeScene {
  /**
   * @param {THREE.Scene} scene - メインのシーンオブジェクト
   * @param {object} params - Tweakpaneで管理されるグローバルパラメータ
   * @param {THREE.Camera} camera - カメラオブジェクト
   */
  constructor(scene, params, camera) {
    this.threeScene = scene;
    this.params = params;
    this.camera = camera;

    this.group = new THREE.Group();

    // アニメーションやオーディオ連動で使用するプロパティ
    this.trebleAttackEffect = 0;
    this.time = 0;
    this.NUM_MOUNTAIN_POINTS = 128; // 波形の解像度
    this.bassHistory = new Array(this.NUM_MOUNTAIN_POINTS).fill(0);

    this.init();
  }

  /**
   * シーンの初期化。オブジェクトの生成と配置を行う。
   */
  init() {
    // 1. 背景 (空と湖)
    const planeWidth = 300;
    const planeHeight = 75;
    const zPosition = -60;

    const skyGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const skyMaterial = new THREE.MeshBasicMaterial({ color: 0x050518 });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.position.set(0, planeHeight / 2, zPosition);
    this.group.add(sky);

    const lakeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const lakeMaterial = new THREE.MeshBasicMaterial({ color: 0x020208 }); // 空より暗い色
    const lake = new THREE.Mesh(lakeGeometry, lakeMaterial);
    lake.position.set(0, -planeHeight / 2, zPosition);
    this.group.add(lake);

    // 2. 星空
    const starCount = 5000;
    const starVertices = [];
    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * 300;
      const y = Math.random() * 75; // 画面上半分
      const z = (Math.random() - 0.5) * 50 - 20;
      starVertices.push(x, y, z);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: this.params.visual.foregroundColor,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      depthWrite: false, // 深度バッファへの書き込みを無効化
    });
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.group.add(this.stars);

    // 星の反射 (clone()を使わず、明示的に新規作成する)
    const reflectionGeometry = this.stars.geometry; // ジオメトリは共有
    const reflectionMaterial = this.stars.material.clone();
    reflectionMaterial.opacity = 0.2;
    // depthWrite: false も引き継がれる
    this.starReflection = new THREE.Points(reflectionGeometry, reflectionMaterial);
    this.starReflection.scale.y = -1; // Y軸を中心に鏡面反転
    this.group.add(this.starReflection);

    // 3. 山の稜線 (動的なBufferGeometryで、塗りつぶされた波形を作成)
    const mountainWidth = 300;
    const vertices = new Float32Array(this.NUM_MOUNTAIN_POINTS * 2 * 3); // 稜線頂点 + 地平線頂点
    const indices = [];

    for (let i = 0; i < this.NUM_MOUNTAIN_POINTS; i++) {
      const x = (i / (this.NUM_MOUNTAIN_POINTS - 1) - 0.5) * mountainWidth;
      // 稜線と地平線の頂点を初期化 (Y=0)
      vertices[i * 3] = x;
      vertices[i * 3 + 1] = 0;
      vertices[i * 3 + 2] = 0;
      const baseVertexIndex = i + this.NUM_MOUNTAIN_POINTS;
      vertices[baseVertexIndex * 3] = x;
      vertices[baseVertexIndex * 3 + 1] = 0;
      vertices[baseVertexIndex * 3 + 2] = 0;
    }

    // 頂点インデックスを設定して面を張る
    for (let i = 0; i < this.NUM_MOUNTAIN_POINTS - 1; i++) {
      const topLeft = i;
      const topRight = i + 1;
      const bottomLeft = i + this.NUM_MOUNTAIN_POINTS;
      const bottomRight = i + 1 + this.NUM_MOUNTAIN_POINTS;
      indices.push(topLeft, bottomLeft, topRight);
      indices.push(topRight, bottomLeft, bottomRight);
    }

    const mountainGeometry = new THREE.BufferGeometry();
    mountainGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    mountainGeometry.setIndex(indices);

    const mountainMaterial = new THREE.MeshBasicMaterial({ color: this.params.visual.backgroundColor });
    this.mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
    this.mountain.position.z = -40;
    this.group.add(this.mountain);

    // 山の反射
    this.mountainReflection = new THREE.Mesh(mountainGeometry.clone(), mountainMaterial);
    this.mountainReflection.scale.y = -1;
    this.mountainReflection.position.z = -40;
    this.group.add(this.mountainReflection);

    this.threeScene.add(this.group);
  }

  /**
   * 毎フレーム呼び出される更新処理。
   * @param {object} audioData - オーディオ分析データ
   * @param {number} time - 経過時間
   */
  update(audioData, time) {
    this.time = time;
    const { bass, treble, trebleAttack } = audioData;

    // 1. カメラワーク (シーン全体をゆっくり上下にパン)
    this.group.position.y = Math.sin(time * 0.1) * 4;

    // 2. 星のまたたき (Treble連動)
    if (trebleAttack > 0.15) {
      this.trebleAttackEffect = 1.0;
    }
    this.stars.material.size = 0.15 + this.trebleAttackEffect * 0.3;
    this.starReflection.material.size = this.stars.material.size; // 反射した星のサイズも更新
    this.stars.material.opacity = map(treble, 0, 1, 0.4, 0.9) + this.trebleAttackEffect;
    this.starReflection.material.opacity = this.stars.material.opacity * 0.25;
    this.trebleAttackEffect *= 0.90;

    // 3. 山の隆起 (Bass連動) - スクロール波形に変更
    this.bassHistory.shift(); // 古いデータを削除
    this.bassHistory.push(bass); // 新しいデータを追加

    const positions = this.mountain.geometry.attributes.position.array;
    const reflectionPositions = this.mountainReflection.geometry.attributes.position.array;
    const maxHeight = 25; // 波形の最大の高さ

    for (let i = 0; i < this.NUM_MOUNTAIN_POINTS; i++) {
      const y = map(this.bassHistory[i], 0, 1, 0, maxHeight);
      positions[i * 3 + 1] = y;
      reflectionPositions[i * 3 + 1] = y;
    }
    this.mountain.geometry.attributes.position.needsUpdate = true;
    this.mountainReflection.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * シーンを表示する。
   */
  show() {
    this.group.visible = true;
  }

  /**
   * シーンを非表示にする。
   */
  hide() {
    this.group.visible = false;
  }

  /**
   * シーンのリソースを解放する。
   */
  dispose() {
    this.group.traverse(object => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    this.threeScene.remove(this.group);
  }

  /**
   * UIから前景色が変更された際に呼び出される。
   * @param {THREE.Color} color - 新しい前景色
   */
  updateForegroundColor(color) {
    if (this.stars && this.starReflection) {
      this.stars.material.color.set(color);
      this.starReflection.material.color.set(color);
    }
  }
}