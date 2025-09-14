// scenes/ElevatorShaft.js
import * as THREE from 'three';
import { map } from '../core/utils.js';

/**
 * ElevatorShaftSceneクラス
 * 無限に上昇するエレベーターシャフトを表現するビジュアルシーン。
 */
export class ElevatorShaftScene {
  constructor(scene, params, camera) {
    this.threeScene = scene;
    this.params = params;
    this.camera = camera;

    this.sceneGroup = new THREE.Group();

    // Shaft
    this.shaftSegments = [];
    this.NUM_SHAFT_SEGMENTS = 10;
    this.SHAFT_HEIGHT = 5;
    this.SHAFT_RADIUS = 3;

    // Elevator
    this.elevatorUnit = null;
    this.elevatorFloor = null;
    this.bassAttackEffect = 0;

    // Background buildings
    this.buildingLayers = [];
    this.windowGeometry = null; // disposeするためにプロパティとして保持
    this.windowMaterial = null; // disposeするためにプロパティとして保持

    this.init();
  }

  init() {
    // Shaft
    const shaftGeometry = new THREE.CylinderGeometry(this.SHAFT_RADIUS, this.SHAFT_RADIUS, this.SHAFT_HEIGHT, 6, 4, true);
    const shaftEdges = new THREE.EdgesGeometry(shaftGeometry);
    const shaftMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor), transparent: true, opacity: 0.3 });

    for (let i = 0; i < this.NUM_SHAFT_SEGMENTS; i++) {
      const segment = new THREE.LineSegments(shaftEdges, shaftMaterial);
      segment.position.y = i * this.SHAFT_HEIGHT - (this.NUM_SHAFT_SEGMENTS * this.SHAFT_HEIGHT / 2);
      this.shaftSegments.push(segment);
      this.sceneGroup.add(segment);
    }

    // Elevator Unit
    const elevatorGeometry = new THREE.CylinderGeometry(this.SHAFT_RADIUS * 0.95, this.SHAFT_RADIUS * 0.95, 7.5, 6);
    const elevatorMaterial = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color(this.params.visual.foregroundColor),
        transparent: true,
        opacity: 0.2,
        wireframe: true
    });
    this.elevatorUnit = new THREE.Mesh(elevatorGeometry, elevatorMaterial);
    this.elevatorUnit.position.y = 0;
    this.sceneGroup.add(this.elevatorUnit);

    // Elevator Floor
    const floorGeometry = new THREE.CircleGeometry(this.SHAFT_RADIUS * 0.95, 6);
    const floorMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.params.visual.foregroundColor),
        transparent: true,
        opacity: 0.2
    });
    this.elevatorFloor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.elevatorFloor.position.y = -3.75; // Position at the bottom of the elevator unit
    this.elevatorFloor.rotation.x = -Math.PI / 2;
    this.elevatorFloor.rotation.z = Math.PI / 6;
    this.elevatorUnit.add(this.elevatorFloor); // Add floor as a child of the unit

    // Background Buildings with Parallax
    this.windowGeometry = new THREE.PlaneGeometry(0.8, 1.6);
    this.windowMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.params.visual.foregroundColor) });

    const layers = [
        { z: -10, speedFactor: 1.0, scale: 1.0, count: 40 },
        { z: -20, speedFactor: 0.5, scale: 1.0, count: 60 },
        { z: -30, speedFactor: 0.2, scale: 1.0, count: 80 }
    ];

    layers.forEach(layer => {
        // カメラの視野に基づいて必要な描画幅を動的に計算
        const distance = Math.abs(this.camera.position.z - layer.z);
        const vFov = (this.camera.fov * Math.PI) / 180;
        const height = 2 * Math.tan(vFov / 2) * distance;
        const width = height * this.camera.aspect;
        
        const extents = { x: width * 1.2, y: 60 }; // 横幅を動的に設定

        const createMesh = () => {
            const instancedMesh = new THREE.InstancedMesh(this.windowGeometry, this.windowMaterial, layer.count);
            const matrix = new THREE.Matrix4();
            const color = new THREE.Color();

            for (let i = 0; i < layer.count; i++) {
                matrix.setPosition(
                    (Math.random() - 0.5) * extents.x,
                    (Math.random() - 0.5) * extents.y, // Centered at y=0
                    layer.z
                );
                matrix.scale(new THREE.Vector3(layer.scale, layer.scale, layer.scale));
                instancedMesh.setMatrixAt(i, matrix);
                instancedMesh.setColorAt(i, color.setScalar(0.1));
            }
            this.sceneGroup.add(instancedMesh);
            return instancedMesh;
        };

        const mesh1 = createMesh();
        const mesh2 = createMesh();
        mesh2.position.y = extents.y; // mesh2をmesh1の真上に配置
        
        this.buildingLayers.push({ 
            mesh1: mesh1, 
            mesh2: mesh2,
            speedFactor: layer.speedFactor,
            yRange: extents.y
        });
    });
    
    this.threeScene.add(this.sceneGroup);
  }

  update(audioData) {
    const { bass, mid, treble, bassAttack } = audioData;

    // Mid: Elevator speed
    const speed = map(mid, 0, 1, 0.08, 0.8);

    // Shaft segment looping
    const totalShaftHeight = this.NUM_SHAFT_SEGMENTS * this.SHAFT_HEIGHT;
    const halfHeight = totalShaftHeight / 2;
    this.shaftSegments.forEach(segment => {
        segment.position.y -= speed;
        if (segment.position.y < -halfHeight) {
            segment.position.y += totalShaftHeight;
        }
    });

    // Background buildings looping with parallax
    this.buildingLayers.forEach(layer => {
        layer.mesh1.position.y -= speed * layer.speedFactor;
        layer.mesh2.position.y -= speed * layer.speedFactor;

        // Check and loop mesh1
        if (layer.mesh1.position.y < -layer.yRange) {
            layer.mesh1.position.y = layer.mesh2.position.y + layer.yRange;
        }
        // Check and loop mesh2
        if (layer.mesh2.position.y < -layer.yRange) {
            layer.mesh2.position.y = layer.mesh1.position.y + layer.yRange;
        }
    });

    // Bass: Elevator unit lighting
    if (bassAttack > 0.1) this.bassAttackEffect = 1.0;
    // Sustained bass affects the wireframe's glow
    this.elevatorUnit.material.opacity = map(bass, 0, 1, 0.2, 0.8);
    // Bass attack makes the floor flash
    this.elevatorFloor.material.opacity = 0.2 + this.bassAttackEffect * 0.5;
    this.bassAttackEffect *= 0.85; // 少し早く減衰させる

    // Treble: Background windows flickering
    const color = new THREE.Color();
    const baseColor = new THREE.Color(this.params.visual.foregroundColor);

    this.buildingLayers.forEach(layer => {
        [layer.mesh1, layer.mesh2].forEach(mesh => {
            let needsUpdate = false;
            // trebleの強さに応じて、点灯/消灯を判断する閾値を設定
            const flickerThreshold = 1.0 - map(treble, 0.2, 1.0, 0.0, 0.95);

            for (let i = 0; i < mesh.count; i++) {
                // 各窓がランダムに閾値を超えたら点灯
                if (Math.random() > flickerThreshold) {
                    const brightness = map(Math.random(), 0, 1, 0.1, 0.8);
                    mesh.setColorAt(i, color.set(baseColor).multiplyScalar(brightness));
                    needsUpdate = true;
                } else {
                    // それ以外は暗い状態
                    mesh.setColorAt(i, color.set(baseColor).multiplyScalar(0.1));
                    needsUpdate = true;
                }
            }
            if (needsUpdate) {
                mesh.instanceColor.needsUpdate = true;
            }
        });
    });
  }

  updateForegroundColor(color) {
    const newColor = new THREE.Color(color);
    // Shaft material is shared
    if(this.shaftSegments.length > 0) {
        this.shaftSegments[0].material.color.set(newColor);
    }
    this.elevatorUnit.material.color.set(newColor);
    // We update window colors in update loop, so no need to set here
  }

  show() {
    this.sceneGroup.visible = true;
  }

  hide() {
    this.sceneGroup.visible = false;
  }

  dispose() {
    // Dispose geometries
    if (this.shaftSegments.length > 0) this.shaftSegments[0].geometry.dispose();
    this.elevatorUnit.geometry.dispose();
    if (this.elevatorFloor) this.elevatorFloor.geometry.dispose();
    if (this.windowGeometry) this.windowGeometry.dispose();

    // Dispose materials
    if (this.shaftSegments.length > 0) this.shaftSegments[0].material.dispose();
    this.elevatorUnit.material.dispose();
    if (this.elevatorFloor) this.elevatorFloor.material.dispose();
    if (this.windowMaterial) this.windowMaterial.dispose();

    // Remove all meshes from the scene
    this.sceneGroup.children.forEach(child => {
        if(child.isInstancedMesh) {
            child.dispose(); // InstancedMesh has its own dispose method
        }
    });

    this.threeScene.remove(this.sceneGroup);
  }
}