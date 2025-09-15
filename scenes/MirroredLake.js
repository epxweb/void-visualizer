// scenes/MirroredLake.js
import * as THREE from 'three';
import { map } from '../core/utils.js';

export class MirroredLakeScene {
  constructor(scene, params, camera) {
    this.threeScene = scene;
    this.params = params;
    this.camera = camera;

    this.sceneGroup = new THREE.Group();
    
    this.background = null;
    this.stars = null;
    this.reflectedStars = null;
    this.NUM_STARS = 2000;
    this.starTexture = null;
    this.mountain = null;
    this.reflectedMountain = null;

    this.STAR_Y_RANGE = 100;

    this.init();
  }

  createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }

  init() {
    // 1. Background (Sky & Lake)
    const bgGeometry = new THREE.PlaneGeometry(500, 200);
    const bgMaterial = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vWorldPosition;
            void main() {
                float horizon = 0.0;
                float skyHeight = 50.0;
                vec3 baseColor = vec3(0.0, 0.0, 0.0);
                vec3 finalColor;

                if (vWorldPosition.y > horizon) { // Sky
                    float intensity = pow(clamp(vWorldPosition.y / skyHeight, 0.0, 1.0), 0.4) * 0.2;
                    finalColor = baseColor + intensity;
                } else { // Lake
                    float intensity = pow(clamp(abs(vWorldPosition.y) / skyHeight, 0.0, 1.0), 0.4) * 0.08;
                    finalColor = baseColor + intensity;
                }
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `,
    });
    this.background = new THREE.Mesh(bgGeometry, bgMaterial);
    this.background.position.z = -60;
    this.background.renderOrder = -1;
    this.sceneGroup.add(this.background);

    // 2. Stars & Reflection
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    const starColors = [];
    
    for (let i = 0; i < this.NUM_STARS; i++) {
        const x = (Math.random() - 0.5) * 400;
        const y = Math.random() * this.STAR_Y_RANGE;
        const z = (Math.random() - 0.5) * 50 - 20;

        starPositions.push(x, y, z);
        
        const brightness = Math.random() * 0.5 + 0.5;
        starColors.push(brightness, brightness, brightness);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    this.starTexture = this.createStarTexture();
    const starMaterial = new THREE.PointsMaterial({
        size: 0.5,
        map: this.starTexture,
        color: new THREE.Color(this.params.visual.foregroundColor),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
    });
    
    this.stars = new THREE.Points(starGeometry, starMaterial);
    
    this.reflectedStars = new THREE.Points(starGeometry, starMaterial.clone());
    this.reflectedStars.scale.y = -1;
    this.reflectedStars.material.opacity = 0.4;

    this.stars.renderOrder = 0;
    this.reflectedStars.renderOrder = 0;
    
    this.sceneGroup.add(this.stars);
    this.sceneGroup.add(this.reflectedStars);

    // 3. Mountains & Reflection
    const mountainMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x000000), transparent: true });
    const placeholderShape = new THREE.Shape();
    this.mountain = new THREE.Mesh(new THREE.ShapeGeometry(placeholderShape), mountainMaterial);
    this.reflectedMountain = new THREE.Mesh(new THREE.ShapeGeometry(placeholderShape), mountainMaterial);
    this.mountain.position.z = -20;
    this.reflectedMountain.position.z = -20;

    this.mountain.renderOrder = 1;
    this.reflectedMountain.renderOrder = 1;
    
    this.sceneGroup.add(this.mountain);
    this.sceneGroup.add(this.reflectedMountain);

    this.threeScene.add(this.sceneGroup);
  }

  update(audioData, time) {
    const { mid, treble, frequencyData } = audioData;

    if (!frequencyData) return;

    // 1. Update Mountains
    const distance = Math.abs(this.camera.position.z - this.mountain.position.z);
    const vFov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * this.camera.aspect;

    const mountainShape = new THREE.Shape();
    mountainShape.moveTo(-width / 2, 0); 
    const pointsToShow = Math.floor(frequencyData.length * 0.5); 
    
    for(let i = 0; i < pointsToShow; i++) {
        const x = map(i, 0, pointsToShow - 1, -width / 2, width / 2);
        const y = map(frequencyData[i], 0, 255, 0, height * 0.3);
        mountainShape.lineTo(x, y);
    }
    mountainShape.lineTo(width / 2, 0);
    mountainShape.lineTo(-width / 2, 0);
    this.mountain.geometry.dispose();
    this.mountain.geometry = new THREE.ShapeGeometry(mountainShape);
    
    const reflectedShape = new THREE.Shape();
    reflectedShape.moveTo(-width / 2, 0);
    for(let i = 0; i < pointsToShow; i++) {
        const x = map(i, 0, pointsToShow - 1, -width / 2, width / 2);
        const y = map(frequencyData[i], 0, 255, 0, -height * 0.3);
        reflectedShape.lineTo(x, y);
    }
    reflectedShape.lineTo(width / 2, 0);
    reflectedShape.lineTo(-width / 2, 0);
    this.reflectedMountain.geometry.dispose();
    this.reflectedMountain.geometry = new THREE.ShapeGeometry(reflectedShape);

    // 2. Update Stars
    const speed = map(mid, 0, 1, 0.0, 0.1);
    const starPositions = this.stars.geometry.attributes.position.array;

    for (let i = 0; i < this.NUM_STARS; i++) {
        starPositions[i * 3 + 1] += speed;

        // Y座標が範囲を超えたら、反対側（Y=0）に戻す
        if (starPositions[i * 3 + 1] > this.STAR_Y_RANGE) {
            starPositions[i * 3 + 1] -= this.STAR_Y_RANGE;
        }
    }
    this.stars.geometry.attributes.position.needsUpdate = true;

    // 3. Update Star Opacity
    const starOpacity = map(treble, 0.0, 0.5, 0.2, 2.0);
    this.stars.material.opacity = starOpacity;
    this.reflectedStars.material.opacity = starOpacity * 0.3;
  }
  
  updateForegroundColor(color) {
    const newColor = new THREE.Color(color);
    this.stars.material.color.set(newColor);
    this.reflectedStars.material.color.set(newColor);
  }

  show() {
    this.sceneGroup.visible = true;
  }

  hide() {
    this.sceneGroup.visible = false;
  }

  dispose() {
    this.background.geometry.dispose();
    this.background.material.dispose();
    this.stars.geometry.dispose();
    this.stars.material.dispose();
    this.reflectedStars.material.dispose();
    this.starTexture.dispose();
    this.mountain.geometry.dispose();
    this.mountain.material.dispose();
    this.reflectedMountain.geometry.dispose();
    this.reflectedMountain.material.dispose();
    this.threeScene.remove(this.sceneGroup);
  }
}