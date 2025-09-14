// scenes/AudioGraph.js
import * as THREE from 'three';
import { map } from '../core/utils.js';

/**
 * GraphDisplayクラス
 * 個々のグラフ表示を管理するヘルパークラス。
 */
class GraphDisplay {
  constructor(scene, params, labelText) {
    this.params = params;
    this.group = new THREE.Group();
    this.line = null;
    this.border = null;
    this.label = null;

    this.NUM_POINTS = 120;
    this.width = 0;
    this.height = 0;

    this.init(labelText);
    scene.add(this.group);
  }

  init(labelText) {
    const material = new THREE.LineBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor) });

    // Graph Line
    const positions = new Float32Array(this.NUM_POINTS * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.line = new THREE.Line(geometry, material);
    this.group.add(this.line);

    // Border
    const borderGeometry = new THREE.BufferGeometry();
    borderGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(5 * 3), 3));
    this.border = new THREE.LineLoop(borderGeometry, material);
    this.group.add(this.border);
    
    // Label
    this.label = this.createSprite(labelText);
    this.group.add(this.label);
  }

  createSprite(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 48;
    canvas.width = 300; // ★キャンバス幅を拡張 (256 -> 300)
    canvas.height = 128;
    context.font = `bold ${fontSize}px sans-serif`;
    context.fillStyle = this.params.visual.foregroundColor;
    context.fillText(text, 10, fontSize);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.5, 0.75, 1);
    return sprite;
  }

  update(value) {
    const positions = this.line.geometry.attributes.position.array;
    for (let i = 0; i < this.NUM_POINTS - 1; i++) {
        positions[i * 3 + 1] = positions[(i + 1) * 3 + 1]; // Shift Y values to the left
    }
    positions[(this.NUM_POINTS - 1) * 3 + 1] = map(value, 0, 1, 0, this.height); // Add new value at the end
    this.line.geometry.attributes.position.needsUpdate = true;
  }

  setLayout(x, y, width, height) {
    this.width = width;
    this.height = height;
    this.group.position.set(x, y, 0);

    // Update line x-positions
    const linePositions = this.line.geometry.attributes.position.array;
    for (let i = 0; i < this.NUM_POINTS; i++) {
        linePositions[i * 3] = map(i, 0, this.NUM_POINTS - 1, 0, width);
    }
    this.line.geometry.attributes.position.needsUpdate = true;

    // Update border
    const borderPositions = this.border.geometry.attributes.position.array;
    borderPositions[0] = 0; borderPositions[1] = 0; borderPositions[2] = 0;
    borderPositions[3] = width; borderPositions[4] = 0; borderPositions[5] = 0;
    borderPositions[6] = width; borderPositions[7] = height; borderPositions[8] = 0;
    borderPositions[9] = 0; borderPositions[10] = height; borderPositions[11] = 0;
    borderPositions[12] = 0; borderPositions[13] = 0; borderPositions[14] = 0;
    this.border.geometry.attributes.position.needsUpdate = true;

    // Update label position
    // ラベルのXスケール(1.5)とキャンバス上のfillTextのオフセット(10px)を考慮して調整
    // (canvasWidth / 2 - textOffsetX) * spriteScaleFactor / canvasWidth
    // Three.js Spriteの中心がSpriteの原点となるため、左端に合わせるにはその分ずらす
    const labelOffsetX = (this.label.scale.x / 2); // スケールを考慮したスプライトの幅の半分
    const textCanvasOffsetX = 10 / this.label.material.map.image.width * this.label.scale.x; // キャンバス内のテキストオフセットをワールド座標に変換
    this.label.position.set(labelOffsetX - textCanvasOffsetX, height, 0); // ★位置を調整
  }

  updateForegroundColor(color) {
    this.line.material.color.set(color);
    this.border.material.color.set(color);
    // Sprite color is harder to update dynamically, would need to redraw canvas
  }
  
  dispose() {
    this.line.geometry.dispose();
    this.line.material.dispose();
    this.border.geometry.dispose();
    this.label.material.map.dispose();
    this.label.material.dispose();
  }
}

/**
 * AudioGraphSceneクラス
 * オーディオの各データをリアルタイムグラフとして表示するビジュアルシーン。
 */
export class AudioGraphScene {
  constructor(scene, params, camera) {
    this.threeScene = scene;
    this.params = params;
    this.camera = camera;
    
    this.sceneGroup = new THREE.Group();
    this.graphs = {};
    this.lastAspect = 0; 

    this.init();
    this.updateLayout();
  }

  init() {
    const graphNames = ['TREBLE', 'MID', 'BASS', 'TREBLE ATK', 'MID ATK', 'BASS ATK'];
    graphNames.forEach(name => {
      this.graphs[name] = new GraphDisplay(this.sceneGroup, this.params, name);
    });
    this.threeScene.add(this.sceneGroup);
  }

  updateLayout() {
    const distance = this.camera.position.z;
    const vFov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * this.camera.aspect;

    const margin = 0.8;
    const numRows = 3;
    const numCols = 2;

    const totalMarginX = (numCols + 1) * margin;
    const totalMarginY = (numRows + 1) * margin;

    const graphWidth = (width - totalMarginX) / numCols;
    const graphHeight = (height - totalMarginY) / numRows;

    const startX = -width / 2 + margin;
    const startY = height / 2 - margin - graphHeight;

    this.graphs['TREBLE'].setLayout(startX, startY, graphWidth, graphHeight);
    this.graphs['MID'].setLayout(startX, startY - (graphHeight + margin), graphWidth, graphHeight);
    this.graphs['BASS'].setLayout(startX, startY - 2 * (graphHeight + margin), graphWidth, graphHeight);
    
    const secondColX = startX + graphWidth + margin;
    this.graphs['TREBLE ATK'].setLayout(secondColX, startY, graphWidth, graphHeight);
    this.graphs['MID ATK'].setLayout(secondColX, startY - (graphHeight + margin), graphWidth, graphHeight);
    this.graphs['BASS ATK'].setLayout(secondColX, startY - 2 * (graphHeight + margin), graphWidth, graphHeight);
  }

  update(audioData) {
    if (this.camera.aspect !== this.lastAspect) {
      this.updateLayout();
      this.lastAspect = this.camera.aspect;
    }

    const { treble, mid, bass, trebleAttack, midAttack, bassAttack } = audioData;
    this.graphs['TREBLE'].update(treble);
    this.graphs['MID'].update(mid);
    this.graphs['BASS'].update(bass);
    this.graphs['TREBLE ATK'].update(trebleAttack);
    this.graphs['MID ATK'].update(midAttack);
    this.graphs['BASS ATK'].update(bassAttack);
  }
  
  updateForegroundColor(color) {
    Object.values(this.graphs).forEach(graph => graph.updateForegroundColor(color));
  }

  show() {
    this.sceneGroup.visible = true;
    this.updateLayout(); // 表示されるときに再度レイアウトを計算
  }

  hide() {
    this.sceneGroup.visible = false;
  }

  dispose() {
    Object.values(this.graphs).forEach(graph => graph.dispose());
    this.threeScene.remove(this.sceneGroup);
  }
}