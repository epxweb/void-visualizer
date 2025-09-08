## シーン開発ガイド (Scene Development Guide)

本プロジェクトに新しいビジュアルシーンを追加する開発者は、以下の規約に従う必要があります。これにより、すべてのシーンが`sceneManager`によって正しく管理され、パフォーマンスが維持されます。

### 1. 基本構造

新しいシーンは、必ずJavaScriptのES6クラスとして作成してください。ファイルは`scenes/`ディレクトリに配置します。

```javascript
// scenes/MyNewScene.js
import * as THREE from '...';
import { map } from '../core/utils.js'; // 必要に応じて共通関数をインポート

export class MyNewScene {
  // ...
}
```

### 2. 必須メソッド

すべてのシーンクラスには、以下のメソッドを実装する必要があります。

1.  **`constructor(scene, params, camera)`**

      - `scene`: レンダリング対象のメインとなる`THREE.Scene`オブジェクト。
      - `params`: Tweakpaneで管理されているグローバルパラメータ。
      - `camera`: レンダリングに使用する`THREE.Camera`オブジェクト。ウィンドウサイズに応じたレスポンシブな計算に利用します。
      - このメソッド内で、受け取ったオブジェクトをクラスのプロパティとして保持し、`this.init()`を呼び出すのが標準的な実装です。

2.  **`init()`**

      - シーンで利用するThree.jsのオブジェクト（`Mesh`, `Line`, `Points`など）の生成と初期化を行います。
      - 生成したオブジェクトは、`this.threeScene.add(...)`を使ってメインシーンに追加します。

3.  **`update(audioData, time)`**

      - 毎フレーム呼び出される、シーンの心臓部です。
      - `audioData` と `time`（経過時間）を元に、オブジェクトのサイズ、位置、色などを変更するアニメーション処理を記述します。
      - **`audioData`オブジェクトには、以下のプロパティが含まれます:**
          - `bass`, `mid`, `treble`: 各周波数帯の**現在のエネルギー量**（0.0〜1.0）。滑らかな動きや持続的な変化に適しています。
          - `bassAttack`, `midAttack`, `trebleAttack`: 各周波数帯の**瞬間的なエネルギー量の増加分**（0.0以上）。キックドラムのアタックなど、瞬間的なイベントに反応する、メリハリのある動きの実装に最適です。

4.  **`show()` / `hide()`**

      - シーン全体の表示・非表示を切り替えるためのメソッドです。
      - シーンのルートとなるオブジェクト（`THREE.Group`など）の`visible`プロパティを`true`または`false`に設定します。

5.  **`dispose()`**

      - **【重要】** シーンがスロットから解除され、不要になった際に呼び出されます。
      - `init()`で作成したThree.jsのオブジェクト（ジオメトリ、マテリアルなど）が使用していたメモリを解放する処理を必ず記述してください。これを怠るとメモリリークの原因となります。
      - 最後に`this.threeScene.remove(...)`で、オブジェクトをシーンから削除します。

    ```javascript
    dispose() {
      // 例:
      this.myObject.geometry.dispose();
      this.myObject.material.dispose();
      this.threeScene.remove(this.myObject);
    }
    ```

### 3. 設計に関する推奨事項

#### 3.1. 実装のカプセル化

パフォーマンスとメンテナンス性の観点から、各シーンの実装は自身のJavaScriptファイル内で完結させることを原則とします。特定のシーンのためだけに`main.js`にポストプロセッシングのパスを追加したり、グローバルな変数を導入したりすることは避けてください。これにより、各シーンは完全にモジュール化され、追加や削除、更新が容易になります。

#### 3.2. `THREE.Group`の利用

シーン内で複数のオブジェクト（`Mesh`, `Line`など）を生成する場合、それらを`THREE.Group`のインスタンスにまとめ、そのGroupをシーンのルートオブジェクトとして扱うことを強く推奨します。これにより、`show()` / `hide()`メソッドではGroupの`visible`プロパティを切り替えるだけ、`dispose()`メソッドではGroupの子要素をループ処理するだけで済むようになり、コードの保守性が向上します。

#### 3.3. アタック値を利用した効果的なアニメーション

`bassAttack`などのアタック値を利用することで、より音楽に同期したダイナミックな表現が可能になります。推奨される実装パターンは以下の通りです。

1.  `constructor`で、エフェクトの強度を保持するためのプロパティを初期化します。
2.  `update`メソッド内で、アタック値が閾値を超えたら、そのプロパティに値をセット（または加算）します。
3.  アニメーション計算で、そのプロパティ値をエフェクトの強度として利用します。
4.  `update`メソッドの最後に、プロパティ値を一定の割合で減衰させます。これにより、エフェクトが数フレームかけて自然に消えるようになります。

```javascript
// 例: WavyLines.js での実装パターン

class MyScene {
  constructor(...) {
    // ...
    this.bassAttackEffect = 0; // 1. エフェクト強度を保持するプロパティ
  }

  update(audioData, time) {
    const { bassAttack } = audioData;

    // 2. アタックを検出したらエフェクト値を更新
    if (bassAttack > 0.1) {
      this.bassAttackEffect = bassAttack * 2.0;
    }
    
    // 3. アニメーション計算にエフェクト値を利用
    const yOffset = baseOffset + this.bassAttackEffect;
    // ...

    // 4. 最後にエフェクト値を減衰させる
    this.bassAttackEffect *= 0.90;
  }
}
```

### 4. 任意の共通メソッド

以下のメソッドは必須ではありませんが、UIとの連携や共通機能を実装する際に、この命名規則に従うことを推奨します。

1.  **`updateForegroundColor(color)`**
      - UIのカラーピッカーなどから前景色が変更された際に、`sceneManager`から呼び出されます。
      - 引数として`THREE.Color`オブジェクトを受け取り、シーン内のマテリアルの色を更新する処理を記述します。

### 5. パフォーマンスに関する考慮事項

本アプリケーションはリアルタイムでの60fps描画を目標としています。新しいシーンを開発する際は、以下の点に注意してください。

  - **オブジェクトの再利用**: `update`メソッド内で頻繁にオブジェクトを新規作成 (`new THREE.Mesh(...)`など) と破棄を行うと、ガベージコレクションが頻発しパフォーマンスが低下する原因となります。`PulsingPolygon`のエコーエフェクトのように、あらかじめオブジェクトを複数生成しておく「オブジェクトプーリング」の手法を検討してください。
  - **ジオメトリとマテリアルの共有**: 同じ形状や材質のオブジェクトが多数存在する場合、ジオメトリやマテリアルのインスタンスを可能な限り共有することで、メモリ使用量とCPU負荷を削減できます。

### 6. 登録方法

作成したシーンクラスをアプリケーションで利用可能にするには、`main.js` の `sceneManager` の定義を修正するだけです。

1.  **`main.js` を開く**: `sceneManager` オブジェクト内の `init()` メソッドを探します。
2.  **`availableScenes` に行を追加**: `availableScenes` オブジェクトに、新しいシーンのエントリを追加します。キーにはUIに表示される名前、値には**ファイルへのパス**と**クラス名**を正確に指定してください。

    ```javascript
    // main.js の sceneManager.init(...) 内

    this.availableScenes = {
      'Wavy Lines': { path: './scenes/WavyLines.js', className: 'WavyLinesScene' },
      // ... 既存のシーン定義 ...
      'Elevator Shaft': { path: './scenes/ElevatorShaft.js', className: 'ElevatorShaftScene' },
      'My New Scene': { path: './scenes/MyNewScene.js', className: 'MyNewScene' }, // ← このように一行追加
      'Empty': null
    };
    ```

これだけで、アプリケーションは新しいシーンを自動的に認識し、UIのドロップダウンリストに追加します。