# Void - Audio Visualizer v.1.4.2

リアルタイム音声入力に反応する、DJのためのミニマルな簡易VJ Webアプリです。  
ブラウザで開いて、DJ時にOBSのウィンドウキャプチャのソースとして利用することを想定しています。  
音声入力の仕組み上、オーディオインターフェースにループバックなどの機能が必要なことがあります。

## 🌐 公式サイト
[https://epxstudio.com/void/](https://epxstudio.com/void/)

## 🎛️ デモ
[https://epxweb.github.io/void-visualizer/](https://epxweb.github.io/void-visualizer/)

## ✨ 特徴

-   **リアルタイム音声解析**: マイクやOSのオーディオ入力から音声を取得し、**低域・中音域・高域**の3帯域に分割してビジュアルに反映します。
-   **多彩なビジュアルシーン**: 音楽の特性に応じて様々な表情を見せる、複数のビジュアルシーンを搭載しています。
-   **UIコントロールパネル**: 各種パラメータ（感度、エフェクト強度、色など）をリアルタイムに調整可能です。
-   **シーン管理機能**: 最大5つのシーンをスロットに登録し、手動または自動でスムーズに切り替えることができます。
-   **設定の保存・読み込み機能**: 各種パラメータやスロットのシーン構成をJSONファイルとしてローカルに保存し、いつでも復元できます。これにより、お気に入りの設定をプリセットとして管理可能です。
-   **オートシーン再生**: 1から5までのスロットに登録したEmptyを除く各シーンをシーケンシャルに連続再生します。シーン遷移のインターバル時間とクロスフェード時間が設定できます。ランダム再生も可能です。
-   **ストロボ機能**: 低音の入力に反応して画面全体を発光させる機能です。感度と明るさを設定できます。
-   **バックグラウンド再生**: 非アクティブウィンドウの状態でも映像を再生可能なため、OBSの映像ソースとして活用できます。また、映像配信設定・CPU負荷を考慮して、バックグラウンド再生時のフレームレートを60/30/15fpsから設定可能です。
-   **順次実装予定**: 追加ビジュアルシーン。

## 🚀 使いかた

1.  アプリケーションを開くと表示される「Click to start audio」をクリックして、マイクへのアクセスを許可してください。
2.  画面右上に表示されるコントロールパネルで、各種パラメータを調整します。
3.  キーボードショートカットで、より直感的な操作が可能です。

### キーボードショートカット

-   **`1` - `5`**: 対応するスロットのシーンに即時切り替え。
-   **`f`**: フルスクリーン表示のON/OFF(full screen)。
-   **`h`**: UI非表示のON/OFF(hidden)。

### スマートフォン操作

-   ダブルタップでUI非表示のON/OFF。
-   左右スワイプで再生スロットの切り替え。

## 🎭 デフォルトシーン (v1.4.3)

現在、以下の18個のシーンが実装されています。

### Wavy Lines
-   **概要**: 画面を横切る複数の波打つ線で構成されます。
-   **低域 (Bass)**: 線の数に影響。
-   **中域 (Mid)**: 線の波の大きさに影響。
-   **高域 (Treble)**: 線のノイズ感・グリッチ感に影響。

### Pulsing Polygon
-   **概要**: 画面中央で脈動・回転する多角形で構成されます。
-   **低域 (Bass)**: 多角形の大きさ（脈動）に影響。
-   **中域 (Mid)**: 多角形の回転速度に影響。
-   **高域 (Treble)**: 多角形の頂点の歪み（トゲの鋭さ）に影響。

### Infinite Tunnel
- **概要**: 画面奥に向かって無限に続くワイヤーフレームのトンネル。音楽の疾走感を表現する。
- **低域 (Bass)**: ビートに合わせてトンネルの半径が一瞬拡大する。
- **中域 (Mid)**: トンネルを突き進むスピードが変化する。
- **高域 (Treble)**: ワイヤーフレームに歪みやグリッチ（ねじれ）を加える。

### Rough Speakers
- **概要**: ステレオスピーカーをイメージした複数の同心円がそれぞれ振動する。
- **低域 (Bass)**: 円の線の太さが脈動するように変化する。
- **中域 (Mid)**: 円の線の明るさが変化する。
- **高域 (Treble)**: 円周上にノイズやギザギザした乱れを加える。

### Wireframe Mirrorball
- **概要**: 画面中央に配置されたワイヤーフレームのミラーボールから、放射状に無数の直線が放たれる。クラシックなモチーフをミニマルに再解釈したビジュアル。
- **低域 (Bass)**: 放射される直線が一斉に長く、そして明るくなる。
- **中域 (Mid)**: ミラーボール本体の回転速度が変化する。
- **高域 (Treble)**: 放射される直線の本数や角度がランダムに変化する。

### Warping Grid
- **概要**: 画面全体に広がるグリッド（格子）が、回転しながら拡大・縮小を繰り返す。
- **低域 (Bass)**: ビートに合わせてグリッド全体が拡大・縮小する。
- **中域 (Mid)**: グリッドの回転速度が変化する。
- **高域 (Treble)**: 格子の交点がランダムに明滅する。

### Pulsing 3D Grid
- **概要**: 立方体の3Dグリッド上にプロットされた多数の円形の点が、ビートに合わせてリズミカルに脈動する。`WarpingGrid`シーンの3次元的な発展形。
- **低域 (Bass)**: 全ての点のサイズが一斉に拡大・縮小し、力強い脈動感を表現する。
- **中域 (Mid)**: グリッド全体がZ軸周りをゆっくりと回転する。
- **高域 (Treble)**: 各点の色や不透明度がランダムに明滅し、きらびやかな印象を与える。

### Tri Tile
- **概要**: 無数に敷き詰められた正三角形のタイル上を浮遊するようにカメラが移動し、音に反応してタイルがリズミカルに明滅する。
- **低域 (Bass)**: すべてのタイルが一斉に、そして瞬間的に発光するパルスエフェクトを発生させる。
- **中域 (Mid)**: タイルの上をカメラが移動する速度が変化する。
- **高域 (Treble)**: ランダムに選択されたタイルが、前景（白）色で強く点灯する。

### Solar System
- **概要**: 3D空間に浮かぶミニマルな太陽系。中央の恒星の周りを惑星が公転し、カメラもその周りを滑らかに旋回する。
- **低域 (Bass)**: 中央の恒星が、ビートに合わせて力強く脈動（拡大・縮小）する。
- **中域 (Mid)**: 惑星たちが恒星の周りを公転する速度が変化する。
- **高域 (Treble)**: 背景の星々が、きらめくように明るさを変化させる。

### Lunar Phases
- **概要**: 3x3のグリッドに配置された9つの月が、それぞれの周波数帯域に同期して満ち欠けを繰り返す、グラフィカルなシーン。
- **低域 (Bass)**: グリッド下段の月が、低域のエネルギー量に応じて満ち欠けのサイクルを変化させる。アタックを検知すると閃光を放つ。
- **中域 (Mid)**: グリッド中段の月が、中域のエネルギー量に応じて満ち欠けのサイクルを変化させる。アタックを検知すると閃光を放つ。
- **高域 (Treble)**: グリッド上段の月が、高域のエネルギー量に応じて満ち欠けのサイクルを変化させる。アタックを検知すると閃光を放つ。

### Elevator Shaft
- **概要**: 3Dワイヤーフレームの六角柱シャフト内をエレベーターが無限に上昇していく様子を真横から描く。背景に流れるビル群の窓明かりが、都会的でリミナルな高揚感を演出する。
- **低域 (Bass)**: キックドラムのアタックに合わせ、エレベーターの床面が力強く閃光を放つ。
- **中域 (Mid)**: エレベーターの上昇速度をコントロールする。
- **高域 (Treble)**: 背景に広がるビル群の窓が、ハイハットのリズムに合わせてランダムに明滅する。

### ASCII Dance
- **概要**: 画面を埋め尽くすASCII文字が、雲のようにうごめきながら音に反応する、タイポグラフィベースのビジュアル。
- **低域 (Bass)**: 文字全体の明るさが変化し、ビートに合わせて閃光のように明滅する。
- **中域 (Mid)**: 文字の雲がうごめく速度が変化する。
- **高域 (Treble)**: 文字がグリッチのようにランダムな記号へ高速に入れ替わる。

### Projected Orbs
-   **概要**: 壁面に投影されたミラーボールの光の反射を表現したシーン。前景・背景の2層のオーブ（光の玉）が、それぞれ異なる速度と明るさで動き回り、奥行きのある空間を演出します。
-   **低域 (Bass)**: ビートのアタックに合わせ、全てのオーブが瞬間的に拡大します。
-   **中域 (Mid)**: オーブが壁面を移動する速度が変化します。
-   **高域 (Treble)**: オーブが白くきらめくように発光します。

### Reactive Smoke
- **概要**: シェーダーを用いて生成される、ノイズで構成された煙のような不定形なビジュアル。
- **低域 (Bass)**: 煙全体の密度や広がりが変化し、アタックを検知すると閃光を放つ。
- **中域 (Mid)**: 煙が渦を巻く速度が変化する。
- **高域 (Treble)**: 煙を構成するノイズの粒子感を変化させる。

### Digital Curtain
-   **概要**: グリッド状に配置された多数の7セグメントディスプレイが、デジタルな雨のように明滅しながら数字を変化させる。
-   **低域 (Bass)**: 点灯しているセグメント全体の明るさが変化し、強いアタックを検知すると一部の数字がランダムに閃光を放つ。
-   **中域 (Mid)**: 一部の数字がスロットマシンのように、一瞬だけ高速でランダムに変化する。
-   **高域 (Treble)**: 一部の数字がグリッチのように、一瞬だけ完全に消灯する。

### Heavy Rain
- **概要**: 激しく地面を叩く雨を真上から描いたシーン。高音域に連動する無数の雨の軌跡と、低音域が作り出す波紋がシンクロします。
- **低域 (Bass)**: 地面に広がる波紋の数や大きさに影響します。
- **中域 (Mid)**: 雨が降る速度と波紋が広がる速度をコントロールします。
- **高域 (Treble)**: 画面奥から降り注ぐ雨の軌跡の数や激しさに影響します。

### Mirrored Lake
- **概要**: 静かな湖の湖面に、満点の星空と山の稜線が鏡のように映り込む、静謐な風景を描きます。
- **低域 (Bass)**: オーディオの周波数スペクトル全体に山のシルエットが反応し、リズミカルにその稜線を変化させます。
- **中域 (Mid)**: 星空が上下に流れる速度が変化します。空の星は上へ、湖面の星は下へと移動します。
- **高域 (Treble)**: 星全体の明るさが変化し、きらめきを表現します。

### Audio Graph
-   **概要**: オーディオ解析データ（`bass`, `mid`, `treble`とそれぞれのアタック値）を、システムパフォーマンスモニターのような6つのリアルタイムライングラフとして可視化します。
-   **低域 (Bass)**: 左下のグラフに`bass`のエネルギー量が、右下のグラフに`bassAttack`の値がリアルタイムで描画されます。
-   **中域 (Mid)**: 左中央のグラフに`mid`のエネルギー量が、右中央のグラフに`midAttack`の値がリアルタイムで描画されます。
-   **高域 (Treble)**: 左上のグラフに`treble`のエネルギー量が、右上のグラフに`trebleAttack`の値がリアルタイムで描画されます。

## 📏 シーン開発ガイド

新規にビジュアルシーンを開発する場合は、下記のシーン開発ガイドを参照してください。  
[./scene_development_guide.md](./scene_development_guide.md)

## 💻 技術スタック

-   **描画 (Graphics)**: Three.js (WebGL)
-   **音声処理 (Audio Processing)**: Web Audio API
-   **UI**: Tweakpane
-   **言語 (Languages)**: HTML5, CSS3, JavaScript (ES Modules)

## 📄 ライセンス

Copyright (c) 2025 R-9 / EPX studio.

This project is licensed under the GNU General Public License.

This project utilizes third-party libraries under the following licenses:

-   **Three.js**: [MIT License](https://github.com/mrdoob/three.js/blob/dev/LICENSE)
-   **Tweakpane**: [MIT License](https://github.com/cocopon/tweakpane/blob/master/LICENSE)

---

# Void - Audio Visualizer v.1.4.2

A minimal VJ web app for DJs that reacts to real-time audio input.  
It is designed to be opened in a browser and used as a window capture source in OBS during a DJ set.  
Due to the nature of audio input, a loopback function on your audio interface may be required.

## 🌐 Official Website
[https://epxstudio.com/void/](https://epxstudio.com/void/)

## 🎛️ Demo
[https://epxweb.github.io/void-visualizer/](https://epxweb.github.io/void-visualizer/)

## ✨ Features

-   **Real-time Audio Analysis**: Captures audio from your microphone or OS audio input and splits it into **low, mid, and high** frequency bands to reflect in the visuals.
-   **Diverse Visual Scenes**: Features multiple visual scenes that change their expression according to the characteristics of the music.
-   **UI Control Panel**: Allows real-time adjustment of various parameters (sensitivity, effect intensity, colors, etc.).
-   **Scene Management**: Register up to five scenes in slots and switch between them smoothly, either manually or automatically.
-   **Save/Load Settings**: Save your current parameter and scene slot configurations as a local JSON file, allowing you to restore them at any time. This enables you to manage your favorite settings as presets.
-   **Auto Scene Playback**: Sequentially plays back scenes registered in slots 1 through 5 (excluding "Empty"). You can set the interval and crossfade duration for transitions. Random playback is also available.
-   **Strobe Effect**: A function that flashes the entire screen in response to low-frequency input. Sensitivity and brightness can be adjusted.
-   **Background Playback**: Continues to render visuals even when the window is inactive, making it ideal for use as a source in OBS. You can also set the background frame rate to 60, 30, or 15 fps to manage CPU load and streaming settings.
-   **Coming Soon**: Additional visual scenes.

## 🚀 How to Use

1.  When you open the application, click "Click to start audio" and grant microphone access.
2.  Adjust the various parameters using the control panel in the upper right corner of the screen.
3.  Use keyboard shortcuts for more intuitive control.

### Keyboard Shortcuts

-   **`1` - `5`**: Instantly switch to the scene in the corresponding slot.
-   **`f`**: Toggle full screen mode.
-   **`h`**: Toggle UI visibility (hide/show).

### Smartphone Controls

-   Double Tap to hide UI.
-   Horizontal swipe to change between slots.

## 🎭 Default Scenes (v1.4.3)

The following 18 scenes are currently implemented.

### Wavy Lines
-   **Overview**: Composed of multiple wavy lines crossing the screen.
-   **Bass**: Affects the number of lines.
-   **Mid**: Affects the amplitude of the waves.
-   **Treble**: Affects the noise/glitchiness of the lines.

### Pulsing Polygon
-   **Overview**: Composed of a pulsating, rotating polygon in the center of the screen.
-   **Bass**: Affects the size (pulsation) of the polygon.
-   **Mid**: Affects the rotation speed of the polygon.
-   **Treble**: Affects the distortion of the polygon's vertices (sharpness of spikes).

### Infinite Tunnel
- **Overview**: A wireframe tunnel extending infinitely toward the back of the screen, expressing the sensation of speed in music.
- **Bass**: The tunnel's radius momentarily expands with the beat.
- **Mid**: The speed of travel through the tunnel changes.
- **Treble**: Adds distortion and glitches (twists) to the wireframe.

### Rough Speakers
- **Overview**: Multiple concentric circles, inspired by stereo speakers, each rotating independently.
- **Bass**: The thickness of the circles' lines pulsates.
- **Mid**: Affects the brightness of the circles' lines.
- **Treble**: Adds noise and jagged distortions to the circumference of the circles.

### Wireframe Mirrorball
- **Overview**: A visual that reinterprets a classic motif in a minimal way, with countless straight lines radiating from a wireframe mirrorball in the center of the screen.
- **Bass**: The radiated lines simultaneously become longer and brighter.
- **Mid**: The rotation speed of the mirrorball itself changes.
- **Treble**: The number and angle of the radiated lines change randomly.

### Warping Grid
- **Overview**: A grid covering the entire screen that repeatedly expands and contracts while rotating.
- **Bass**: The entire grid expands and contracts with the beat.
- **Mid**: The rotation speed of the grid changes.
- **Treble**: The intersections of the grid randomly blink.

### Pulsing 3D Grid
- **Overview**: A three-dimensional evolution of the `WarpingGrid` scene, where numerous circular points plotted on a cubic 3D grid pulsate rhythmically with the beat.
- **Bass**: The size of all points expands and contracts in unison, creating a powerful pulsating effect.
- **Mid**: The entire grid slowly rotates around the Z-axis.
- **Treble**: The color and opacity of each point randomly blink, creating a sparkling impression.

### Tri Tile
- **Overview**: The camera glides over a field of countless equilateral triangles, which rhythmically flash in response to the audio.
- **Bass**: Triggers a pulse effect, causing all tiles to flash in unison momentarily.
- **Mid**: Changes the speed of the camera's movement across the tiles.
- **Treble**: Causes randomly selected tiles to light up brightly in the foreground color.

### Solar System
- **Overview**: A minimal solar system floating in 3D space. Planets orbit a central star, and the camera smoothly revolves around the scene.
- **Bass**: The central star pulsates powerfully in size with the beat.
- **Mid**: Changes the speed at which the planets orbit the star.
- **Treble**: The background stars twinkle, changing their brightness.

### Lunar Phases
- **Overview**: A graphical scene where nine moons arranged in a 3x3 grid wax and wane in sync with their respective frequency bands.
- **Bass**: The bottom row of moons cycles through its phases according to the bass energy level. It emits a flash when an attack is detected.
- **Mid**: The middle row of moons cycles through its phases according to the mid-range energy level. It emits a flash when an attack is detected.
- **Treble**: The top row of moons cycles through its phases according to the treble energy level. It emits a flash when an attack is detected.

### Elevator Shaft
- **Overview**: Depicts a side-view of an elevator endlessly ascending within a 3D wireframe hexagonal shaft. The scrolling city lights in the background create an urban, liminal, and uplifting atmosphere.
- **Bass**: The elevator floor emits a powerful flash in sync with bass attacks.
- **Mid**: Controls the ascent speed of the elevator.
- **Treble**: The windows of the background buildings flicker randomly in time with the high-frequency rhythms.

### ASCII Dance
- **Overview**: A typography-based visual where a full-screen grid of ASCII characters reacts to the sound, moving like a cloud.
- **Bass**: Affects the overall brightness of the characters, causing them to flash like a strobe with the beat.
- **Mid**: Controls the speed of the cloud-like movement of the characters.
- **Treble**: Triggers a glitch effect, causing characters to rapidly change to random symbols.

### Projected Orbs
-   **Overview**: A scene that expresses the reflection of light from a disco ball projected onto a wall. It creates a sense of depth with two layers of orbs (balls of light), one in the foreground and one in the background, moving at different speeds and brightnesses.
-   **Bass**: All orbs instantly expand with each beat's attack.
-   **Mid**: The speed at which the orbs move across the wall changes.
-   **Treble**: The orbs emit a bright, sparkling white light.

### Reactive Smoke
- **Overview**: A formless, smoke-like visual composed of noise generated using shaders.
- **Bass**: Changes the overall density and spread of the smoke, and emits a flash upon detecting an attack.
- **Mid**: Changes the speed at which the smoke swirls.
- **Treble**: Changes the graininess of the noise that constitutes the smoke.

### Digital Curtain
-   **Overview**: A grid of numerous 7-segment displays flickers and changes numbers, reminiscent of digital rain.
-   **Bass**: Affects the overall brightness of lit segments. A strong attack triggers a random subset of digits to flash brightly.
-   **Mid**: Causes a random selection of digits to momentarily change numbers at high speed, like a slot machine.
-   **Treble**: Causes a random selection of digits to momentarily turn off completely, creating a glitch-like blackout effect.

### Heavy Rain
- **Overview**: A scene depicting heavy rain hitting the ground from a top-down perspective. Countless streaks of rain linked to high frequencies synchronize with ripples created by the low frequencies.
- **Bass**: Affects the number and size of the ripples spreading on the ground.
- **Mid**: Controls the speed of the falling rain and the spreading ripples.
- **Treble**: Affects the number and intensity of the rain streaks pouring from the back of the screen.

### Mirrored Lake
  **Overview**: Depicts a serene landscape where a star-filled sky and mountain ridge are reflected like a mirror on the surface of a quiet lake.
  **Bass**: The mountain silhouette reacts to the entire audio frequency spectrum, rhythmically changing its ridgeline.
  **Mid**: Affects the vertical scrolling speed of the stars. Stars in the sky move upwards, while their reflections in the lake move downwards.
  **Treble**: Changes the overall brightness of the stars, creating a shimmering effect.

### Audio Graph
- **Overview**: Visualizes the raw audio analysis data (`bass`, `mid`, `treble`, and their respective attack values) as six real-time line graphs, resembling a system performance monitor.
- **Bass**: The `bass` energy level is drawn in the bottom-left graph, and the `bassAttack` value is drawn in the bottom-right graph in real-time.
- **Mid**: The `mid` energy level is drawn in the center-left graph, and the `midAttack` value is drawn in the center-right graph in real-time.
- **Treble**: The `treble` energy level is drawn in the top-left graph, and the `trebleAttack` value is drawn in the top-right graph in real-time.

## 📏 Scene Development Guide (JP)

When developing new visual scenes, please refer to the scene development guide below (Currently only in Japanese).  
[./scene_development_guide.md](./scene_development_guide.md)

## 💻 Tech Stack

-   **Graphics**: Three.js (WebGL)
-   **Audio Processing**: Web Audio API
-   **UI**: Tweakpane
-   **Languages**: HTML5, CSS3, JavaScript (ES Modules)

## 📄 License

Copyright (c) 2025 R-9 / EPX studio.

This project is licensed under the GNU General Public License.

This project utilizes third-party libraries under the following licenses:

-   **Three.js**: [MIT License](https://github.com/mrdoob/three.js/blob/dev/LICENSE)
-   **Tweakpane**: [MIT License](https://github.com/cocopon/tweakpane/blob/master/LICENSE)