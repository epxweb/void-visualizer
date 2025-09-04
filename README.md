# Void Visualizer v.1.0.0

リアルタイム音声入力に反応する、DJのためのミニマルな簡易VJ Webアプリです。  
ブラウザで開いて、DJ時にOBSのウィンドウキャプチャのソースとして利用することを想定しています。  
音声入力の仕組み上、オーディオインターフェースにループバックなどの機能が必要なことがあります。

## 🎛️ DEMO
[https://epxweb.github.io/void-visualizer/](https://epxweb.github.io/void-visualizer/)

## ✨ Features

-   **リアルタイム音声解析**: マイクやOSのオーディオ入力から音声を取得し、**低域・中音域・高域**の3帯域に分割してビジュアルに反映します。
-   **多彩なビジュアルシーン**: 音楽の特性に応じて様々な表情を見せる、複数のビジュアルシーンを搭載しています。
-   **UIコントロールパネル**: 各種パラメータ（感度、エフェクト強度、色など）をリアルタイムに調整可能です。
-   **シーン管理機能**: 最大5つのシーンをスロットに登録し、手動または自動でスムーズに切り替えることができます。
-   スマートフォン未対応です。
-   v.1.1以降で実装予定：グレインアニメーション、ストロボ機能、emptyスロット、ランダム再生オプション、追加ビジュアルシーン

## 🚀 How to Use

1.  アプリケーションを開くと表示される「Click to start audio」をクリックして、マイクへのアクセスを許可してください。
2.  画面右上に表示されるコントロールパネルで、各種パラメータを調整します。
3.  キーボードショートカットで、より直感的な操作が可能です。

### キーボードショートカット

-   **`1` - `5`**: 対応するスロットのシーンに即時切り替え。
-   **`f`**: フルスクリーン表示のON/OFF(full screen)。
-   **`h`**: UI非表示のON/OFF(hidden)。

## 🎭 Default Scenes (v1.0.0)

現在、以下の5つのシーンが実装されています。

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

### Rotating Rings
- **概要**: レコード盤をイメージした、複数の同心円がそれぞれ回転する。
- **低域 (Bass)**: 円の線の太さが脈動するように変化する。
- **中域 (Mid)**: 各円の回転速度や回転方向が変化する。
- **高域 (Treble)**: 円周上にノイズやギザギザした乱れを加える。

### Warping Grid
- **概要**: 画面全体に広がるグリッド（格子）が、回転しながら拡大・縮小を繰り返す。
- **低域 (Bass)**: ビートに合わせてグリッド全体が拡大・縮小する。
- **中域 (Mid)**: グリッドの回転速度が変化する。
- **高域 (Treble)**: 格子の交点がランダムに明滅する。

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
