let mic;
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

  // 音量レベルを取得 (0.0 ~ 1.0)
  const level = mic.getLevel();
  
  // 背景を黒で塗りつぶす
  background(0);
  
  // 円の直径を音量レベルに応じて変化させる
  // levelは小さい値なので、大きくマッピングする
  const diameter = map(level, 0, 1, 50, windowWidth * 0.8);
  
  // 円を描画
  noStroke();
  fill(255); // 白
  ellipse(width / 2, height / 2, diameter, diameter);
}

// ユーザーが画面をクリックしたときにオーディオを開始する
function mousePressed() {
  if (!isAudioStarted) {
    // p5.AudioInを初期化し、マイク入力を開始
    mic = new p5.AudioIn();
    mic.start();
    
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
