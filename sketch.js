let mic;
let fft;
let isAudioStarted = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 初期表示: ユーザーに操作を促す
  background(0);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(24);
  text("Click to start audio", width / 2, height / 2);
}

function draw() {
  // オーディオが開始されていなければ描画を更新しない
  if (!isAudioStarted) {
    return;
  }

  // 背景を黒で塗りつぶす
  background(0);

  // 周波数データを解析
  fft.analyze();

  // 各周波数帯域のエネルギー量を取得 (0-255)
  const bass = fft.getEnergy("bass");
  const mid = fft.getEnergy("mid");
  const treble = fft.getEnergy("treble");

  // --- Wavy Lines シーンの描画ロジック ---
  
  // Bass: 線の太さと本数をコントロール
  const lineWeight = map(bass, 0, 255, 0.5, 4);
  const numLines = int(map(bass, 0, 255, 1, 15));

  // Mid: 波のうねりの大きさをコントロール
  const waveAmplitude = map(mid, 0, 255, 10, 250);

  // Treble: 波の細かな振動（ノイズ）をコントロール
  const noiseAmount = map(treble, 0, 255, 0, 100);

  stroke(255); // 線の色を白に
  noFill();
  strokeWeight(lineWeight);

  // 画面に複数の線を描画
  for (let i = 0; i < numLines; i++) {
    const yOffset = map(i, 0, numLines, height * 0.2, height * 0.8);

    beginShape();
    for (let x = 0; x <= width; x += 10) {
      // sin波で基本的なうねりを作成
      const wave = sin(frameCount * 0.02 + x * 0.01) * waveAmplitude;
      
      // Perlinノイズで不規則な動きを追加
      const pNoise = (noise(x * 0.005, i * 0.1, frameCount * 0.01) - 0.5) * 100;

      // Trebleに応じたランダムなノイズ（グリッチ感）
      const glitch = (random() - 0.5) * noiseAmount;

      const y = yOffset + wave + pNoise + glitch;
      vertex(x, y);
    }
    endShape();
  }
}

// ユーザーが画面をクリックしたときにオーディオを開始する
function mousePressed() {
  if (!isAudioStarted) {
    // p5.AudioInを初期化し、マイク入力を開始
    mic = new p5.AudioIn();
    mic.start();
    
    // FFTを初期化し、入力をマイクに設定
    fft = new p5.FFT();
    fft.setInput(mic);

    // AudioContextを開始/再開する
    userStartAudio();
    
    isAudioStarted = true;
    console.log("Audio input started.");
  }
}

// ウィンドウサイズが変更されたときにキャンバスをリサイズする
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
