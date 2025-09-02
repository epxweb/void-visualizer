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

  // エネルギー量を円の直径にマッピング
  const mapMax = 255;
  const bassDiameter = map(bass, 0, mapMax, 20, height * 0.6);
  const midDiameter = map(mid, 0, mapMax, 20, height * 0.6);
  const trebleDiameter = map(treble, 0, mapMax, 20, height * 0.6);

  // 3つの円を描画
  noStroke();
  fill(255);
  
  const y = height / 2;
  const spacing = width / 4;

  ellipse(spacing, y, bassDiameter, bassDiameter);       // Bass
  ellipse(spacing * 2, y, midDiameter, midDiameter);   // Mid
  ellipse(spacing * 3, y, trebleDiameter, trebleDiameter); // Treble
  
  // ラベル表示
  fill(150);
  textSize(20);
  textAlign(CENTER, CENTER);
  text("BASS", spacing, y + height * 0.4);
  text("MID", spacing * 2, y + height * 0.4);
  text("TREBLE", spacing * 3, y + height * 0.4);
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
