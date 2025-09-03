# Void Visualizer v.1.0.0

リアルタイム音声入力に反応する簡易VJ目的のWebアプリケーションです。
DJ時にOBSのブラウザソースとして利用されることなどを想定しています。

## ✨ Features

-   **リアルタイム音声解析**: マイクやOSのオーディオ入力から音声を取得し、**低域・中音域・高域**の3帯域に分割してビジュアルに反映します。
-   **多彩なビジュアルシーン**: 音楽の特性に応じて様々な表情を見せる、複数のビジュアルシーンを搭載しています。
-   **UIコントロールパネル**: 各種パラメータ（感度、エフェクト強度、色など）をリアルタイムに調整可能です。
-   **シーン管理機能**: 最大5つのシーンをスロットに登録し、手動または自動でスムーズに切り替えることができます。

## 🚀 How to Use

1.  アプリケーションを開くと表示される「Click to start audio」をクリックして、マイクへのアクセスを許可してください。
2.  画面右上に表示されるコントロールパネルで、各種パラメータを調整します。
3.  キーボードショートカットで、より直感的な操作が可能です。

### キーボードショートカット

-   **`1` - `5`**: 対応するスロットのシーンに即時切り替え。
-   **`f`**: フルスクリーン表示のON/OFF。

## 🎭 Default Scenes (v1.0.0)

現在、以下の3つのシーンが実装されています。

### 1. Wavy Lines
-   **概要**: 画面を横切る複数の波打つ線で構成されます。
-   **低域 (Bass)**: 線の数に影響。
-   **中域 (Mid)**: 線の波の大きさに影響。
-   **高域 (Treble)**: 線のノイズ感・グリッチ感に影響。

### 2. Particle Burst
-   **概要**: 画面中央からパーティクル（光の粒）が爆発するように広がります。
-   **低域 (Bass)**: ビートを検知し、パーティクルが発生するきっかけとなります。
-   **中域 (Mid)**: パーティクルの速度の減衰率に影響。
-   **高域 (Treble)**: パーティクルのサイズに影響。

### 3. Pulsing Polygon
-   **概要**: 画面中央で脈動・回転する多角形で構成されます。
-   **低域 (Bass)**: 多角形の大きさ（脈動）に影響。
-   **中域 (Mid)**: 多角形の回転速度に影響。
-   **高域 (Treble)**: 多角形の頂点の歪み（トゲの鋭さ）に影響。

## 💻 Tech Stack

-   **描画**: Three.js (WebGL)
-   **音声処理**: Web Audio API
-   **UI**: Tweakpane
-   **言語**: HTML5, CSS3, JavaScript (ES Modules)

## 📄 License

Copyright (c) 2025 R-9 / EPX studio.

This project is licensed under the GNU General Public License.

This project utilizes third-party libraries under the following licenses:

-   **Three.js**: [MIT License](https://github.com/mrdoob/three.js/blob/dev/LICENSE)
-   **Tweakpane**: [MIT License](https://github.com/cocopon/tweakpane/blob/master/LICENSE)
