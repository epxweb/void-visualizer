# Void Visualizer v.1.3.0

リアルタイム音声入力に反応する、DJのためのミニマルな簡易VJ Webアプリです。  
ブラウザで開いて、DJ時にOBSのウィンドウキャプチャのソースとして利用することを想定しています。  
音声入力の仕組み上、オーディオインターフェースにループバックなどの機能が必要なことがあります。

A minimal VJ web app for DJs that reacts to real-time audio input.  
It is designed to be opened in a browser and used as a window capture source in OBS during a DJ set.  
Due to the nature of audio input, a loopback function on your audio interface may be required.

## 🎛️ DEMO
[https://epxweb.github.io/void-visualizer/](https://epxweb.github.io/void-visualizer/)

## ✨ Features

-   **リアルタイム音声解析**: マイクやOSのオーディオ入力から音声を取得し、**低域・中音域・高域**の3帯域に分割してビジュアルに反映します。  
    **Real-time Audio Analysis**: Captures audio from your microphone or OS audio input and splits it into **low, mid, and high** frequency bands to reflect in the visuals.
-   **多彩なビジュアルシーン**: 音楽の特性に応じて様々な表情を見せる、複数のビジュアルシーンを搭載しています。  
    **Diverse Visual Scenes**: Features multiple visual scenes that change their expression according to the characteristics of the music.
-   **UIコントロールパネル**: 各種パラメータ（感度、エフェクト強度、色など）をリアルタイムに調整可能です。  
    **UI Control Panel**: Allows real-time adjustment of various parameters (sensitivity, effect intensity, colors, etc.).
-   **シーン管理機能**: 最大5つのシーンをスロットに登録し、手動または自動でスムーズに切り替えることができます。  
    **Scene Management**: Register up to five scenes in slots and switch between them smoothly, either manually or automatically.
-   **オートシーン再生**: 1から5までのスロットに登録したEmptyを除く各シーンをシーケンシャルに連続再生します。シーン遷移のインターバル時間とクロスフェード時間が設定できます。ランダム再生も可能です。  
    **Auto Scene Playback**: Sequentially plays back scenes registered in slots 1 through 5 (excluding "Empty"). You can set the interval and crossfade duration for transitions. Random playback is also available.
-   **ストロボ機能**: 低音の入力に反応して画面全体を発光させる機能です。感度と明るさを設定できます。  
    **Strobe Effect**: A function that flashes the entire screen in response to low-frequency input. Sensitivity and brightness can be adjusted.
-   **バックグラウンド再生**: 非アクティブウィンドウの状態でも映像を再生可能なため、OBSの映像ソースとして活用できます。また、映像配信設定・CPU負荷を考慮して、バックグラウンド再生時のフレームレートを60/30/15fpsから設定可能です。  
    **Background Playback**: Continues to render visuals even when the window is inactive, making it ideal for use as a source in OBS. You can also set the background frame rate to 60, 30, or 15 fps to manage CPU load and streaming settings.
-   スマートフォン未対応です。  
    Not compatible with smartphones.
-   **順次実装予定**: 追加ビジュアルシーン。  
    **Coming Soon**: Additional visual scenes.

## 🚀 How to Use

1.  アプリケーションを開くと表示される「Click to start audio」をクリックして、マイクへのアクセスを許可してください。  
    When you open the application, click "Click to start audio" and grant microphone access.
2.  画面右上に表示されるコントロールパネルで、各種パラメータを調整します。  
    Adjust the various parameters using the control panel in the upper right corner of the screen.
3.  キーボードショートカットで、より直感的な操作が可能です。  
    Use keyboard shortcuts for more intuitive control.

### Keyboard Shortcuts

-   **`1` - `5`**: 対応するスロットのシーンに即時切り替え。  
    Instantly switch to the scene in the corresponding slot.
-   **`f`**: フルスクリーン表示のON/OFF(full screen)。  
    Toggle full screen mode.
-   **`h`**: UI非表示のON/OFF(hidden)。  
    Toggle UI visibility (hide/show).

## 🎭 Default Scenes (v1.4.0)

現在、以下の9つのシーンが実装されています。  
The following 9 scenes are currently implemented.

### Wavy Lines
-   **概要**: 画面を横切る複数の波打つ線で構成されます。  
    **Overview**: Composed of multiple wavy lines crossing the screen.
-   **低域 (Bass)**: 線の数に影響。  
    **Bass**: Affects the number of lines.
-   **中域 (Mid)**: 線の波の大きさに影響。  
    **Mid**: Affects the amplitude of the waves.
-   **高域 (Treble)**: 線のノイズ感・グリッチ感に影響。  
    **Treble**: Affects the noise/glitchiness of the lines.

### Pulsing Polygon
-   **概要**: 画面中央で脈動・回転する多角形で構成されます。  
    **Overview**: Composed of a pulsating, rotating polygon in the center of the screen.
-   **低域 (Bass)**: 多角形の大きさ（脈動）に影響。  
    **Bass**: Affects the size (pulsation) of the polygon.
-   **中域 (Mid)**: 多角形の回転速度に影響。  
    **Mid**: Affects the rotation speed of the polygon.
-   **高域 (Treble)**: 多角形の頂点の歪み（トゲの鋭さ）に影響。  
    **Treble**: Affects the distortion of the polygon's vertices (sharpness of spikes).

### Infinite Tunnel
- **概要**: 画面奥に向かって無限に続くワイヤーフレームのトンネル。音楽の疾走感を表現する。  
  **Overview**: A wireframe tunnel extending infinitely toward the back of the screen, expressing the sensation of speed in music.
- **低域 (Bass)**: ビートに合わせてトンネルの半径が一瞬拡大する。  
  **Bass**: The tunnel's radius momentarily expands with the beat.
- **中域 (Mid)**: トンネルを突き進むスピードが変化する。  
  **Mid**: The speed of travel through the tunnel changes.
- **高域 (Treble)**: ワイヤーフレームに歪みやグリッチ（ねじれ）を加える。  
  **Treble**: Adds distortion and glitches (twists) to the wireframe.

### Rotating Rings
- **概要**: ステレオスピーカーをイメージした、複数の同心円がそれぞれ回転する。  
  **Overview**: Multiple concentric circles, inspired by stereo speakers, each rotating independently.
- **低域 (Bass)**: 円の線の太さが脈動するように変化する。  
  **Bass**: The thickness of the circles' lines pulsates.
- **中域 (Mid)**: 各円の回転速度や回転方向が変化する。  
  **Mid**: The rotation speed and direction of each circle change.
- **高域 (Treble)**: 円周上にノイズやギザギザした乱れを加える。  
  **Treble**: Adds noise and jagged distortions to the circumference of the circles.

### Wireframe Mirrorball
- **概要**: 画面中央に配置されたワイヤーフレームのミラーボールから、放射状に無数の直線が放たれる。クラシックなモチーフをミニマルに再解釈したビジュアル。  
  **Overview**: A visual that reinterprets a classic motif in a minimal way, with countless straight lines radiating from a wireframe mirrorball in the center of the screen.
- **低域 (Bass)**: 放射される直線が一斉に長く、そして明るくなる。  
  **Bass**: The radiated lines simultaneously become longer and brighter.
- **中域 (Mid)**: ミラーボール本体の回転速度が変化する。  
  **Mid**: The rotation speed of the mirrorball itself changes.
- **高域 (Treble)**: 放射される直線の本数や角度がランダムに変化する。  
  **Treble**: The number and angle of the radiated lines change randomly.

### Warping Grid
- **概要**: 画面全体に広がるグリッド（格子）が、回転しながら拡大・縮小を繰り返す。  
  **Overview**: A grid covering the entire screen that repeatedly expands and contracts while rotating.
- **低域 (Bass)**: ビートに合わせてグリッド全体が拡大・縮小する。  
  **Bass**: The entire grid expands and contracts with the beat.
- **中域 (Mid)**: グリッドの回転速度が変化する。  
  **Mid**: The rotation speed of the grid changes.
- **高域 (Treble)**: 格子の交点がランダムに明滅する。  
  **Treble**: The intersections of the grid randomly blink.

### Pulsing 3D Grid
- **概要**: 立方体の3Dグリッド上にプロットされた多数の円形の点が、ビートに合わせてリズミカルに脈動する。`WarpingGrid`シーンの3次元的な発展形。  
  **Overview**: A three-dimensional evolution of the `WarpingGrid` scene, where numerous circular points plotted on a cubic 3D grid pulsate rhythmically with the beat.
- **低域 (Bass)**: 全ての点のサイズが一斉に拡大・縮小し、力強い脈動感を表現する。  
  **Bass**: The size of all points expands and contracts in unison, creating a powerful pulsating effect.
- **中域 (Mid)**: グリッド全体がZ軸周りをゆっくりと回転する。  
  **Mid**: The entire grid slowly rotates around the Z-axis.
- **高域 (Treble)**: 各点の色や不透明度がランダムに明滅し、きらびやかな印象を与える。  
  **Treble**: The color and opacity of each point randomly blink, creating a sparkling impression.

### Tri Tile
- **概要**: 無数に敷き詰められた正三角形のタイル上を浮遊するようにカメラが移動し、音に反応してタイルがリズミカルに明滅する。  
  **Overview**: The camera glides over a field of countless equilateral triangles, which rhythmically flash in response to the audio.
- **低域 (Bass)**: すべてのタイルが一斉に、そして瞬間的に発光するパルスエフェクトを発生させる。  
  **Bass**: Triggers a pulse effect, causing all tiles to flash in unison momentarily.
- **中域 (Mid)**: タイルの上をカメラが移動する速度が変化する。  
  **Mid**: Changes the speed of the camera's movement across the tiles.
- **高域 (Treble)**: ランダムに選択されたタイルが、前景（白）色で強く点灯する。  
  **Treble**: Causes randomly selected tiles to light up brightly in the foreground color.

### Solar System
- **概要**: 3D空間に浮かぶミニマルな太陽系。中央の恒星の周りを惑星が公転し、カメラもその周りを滑らかに旋回する。  
  **Overview**: A minimal solar system floating in 3D space. Planets orbit a central star, and the camera smoothly revolves around the scene.
- **低域 (Bass)**: 中央の恒星が、ビートに合わせて力強く脈動（拡大・縮小）する。  
  **Bass**: The central star pulsates powerfully in size with the beat.
- **中域 (Mid)**: 惑星たちが恒星の周りを公転する速度が変化する。  
  **Mid**: Changes the speed at which the planets orbit the star.
- **高域 (Treble)**: 背景の星々が、きらめくように明るさを変化させる。  
  **Treble**: The background stars twinkle, changing their brightness.

## 📏 Scene Development Guide

新規にビジュアルシーンを開発する場合は、下記のシーン開発ガイドを参照してください。  
[./scene_development_guide.md](./scene_development_guide.md)

When developing new visual scenes, please refer to the scene development guide below.  
[./scene_development_guide.md](./scene_development_guide.md)

## 💻 Tech Stack

-   **描画 (Graphics)**: Three.js (WebGL)
-   **音声処理 (Audio Processing)**: Web Audio API
-   **UI**: Tweakpane
-   **言語 (Languages)**: HTML5, CSS3, JavaScript (ES Modules)

## 📄 License

Copyright (c) 2025 R-9 / EPX studio.

This project is licensed under the GNU General Public License.

This project utilizes third-party libraries under the following licenses:

-   **Three.js**: [MIT License](https://github.com/mrdoob/three.js/blob/dev/LICENSE)
-   **Tweakpane**: [MIT License](https://github.com/cocopon/tweakpane/blob/master/LICENSE)