let mic, fft;
let isAudioStarted = false;

// --- Scene Management ---
let currentScene = 1;

// --- Scene 2: Particle Burst ---
let particles = [];
let prevBass = 0;

// Particle Class
class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(1, 5));
    this.lifespan = 255; // 寿命
  }

  // 動きを更新
  update(mid) {
    const speedMultiplier = map(mid, 0, 255, 0.8, 1.5);
    this.vel.mult(speedMultiplier);
    this.pos.add(this.vel);
    this.lifespan -= 2;
  }

  // 描画
  draw(treble) {
    const size = map(treble, 0, 255, 1, 8);
    noStroke();
    fill(255, this.lifespan);
    ellipse(this.pos.x, this.pos.y, size, size);
  }

  // 寿命が尽きたか
  isDead() {
    return this.lifespan < 0;
  }
}


function setup() {
  createCanvas(windowWidth, windowHeight);
  
  background(0);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(24);
  text("Click to start audio", width / 2, height / 2);
}

function draw() {
  if (!isAudioStarted) return;

  background(0);
  fft.analyze();

  const bass = fft.getEnergy("bass");
  const mid = fft.getEnergy("mid");
  const treble = fft.getEnergy("treble");

  // シーンに応じて描画関数を呼び出し
  if (currentScene === 1) {
    drawScene1(bass, mid, treble);
  } else if (currentScene === 2) {
    drawScene2(bass, mid, treble);
  }
  
  // シーン番号を左上に表示
  fill(255, 100);
  textSize(16);
  textAlign(LEFT, TOP);
  text(`Scene ${currentScene} (Press 1 or 2 to switch)`, 10, 10);
}

// --- Scene 1: Wavy Lines ---
function drawScene1(bass, mid, treble) {
  const lineWeight = map(bass, 0, 255, 0.5, 4);
  const numLines = int(map(bass, 0, 255, 1, 15));
  const waveAmplitude = map(mid, 0, 255, 10, 250);
  const noiseAmount = map(treble, 0, 255, 0, 100);

  stroke(255);
  noFill();
  strokeWeight(lineWeight);

  for (let i = 0; i < numLines; i++) {
    const yOffset = map(i, 0, numLines, height * 0.2, height * 0.8);
    beginShape();
    for (let x = 0; x <= width; x += 10) {
      const wave = sin(frameCount * 0.02 + x * 0.01) * waveAmplitude;
      const pNoise = (noise(x * 0.005, i * 0.1, frameCount * 0.01) - 0.5) * 100;
      const glitch = (random() - 0.5) * noiseAmount;
      const y = yOffset + wave + pNoise + glitch;
      vertex(x, y);
    }
    endShape();
  }
}

// --- Scene 2: Particle Burst ---
function drawScene2(bass, mid, treble) {
  // ビート検出（簡易版）
  const beatThreshold = 20; // 反応のしきい値
  const minBassLevel = 140; // 最低限のBassレベル
  if (bass > prevBass + beatThreshold && bass > minBassLevel) {
    const particleCount = int(map(bass, minBassLevel, 255, 5, 30));
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(width / 2, height / 2));
    }
  }
  prevBass = bass;

  // パーティクルの更新と描画
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(mid);
    particles[i].draw(treble);
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }
}

function mousePressed() {
  if (!isAudioStarted) {
    mic = new p5.AudioIn();
    mic.start();
    fft = new p5.FFT();
    fft.setInput(mic);
    userStartAudio();
    isAudioStarted = true;
    console.log("Audio input started.");
  }
}

function keyPressed() {
  if (key === '1') {
    currentScene = 1;
  } else if (key === '2') {
    currentScene = 2;
    particles = []; // シーン切り替え時にパーティクルをリセット
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
