/**
 * シーントランジションを管理するクラス。
 */
export class Transitioner {
  constructor() {
    this.isActive = false;
    this.progress = 0;
    this.fromScene = null;
    this.toScene = null;
    this.toSlotIndex = -1;
  }

  /**
   * トランジションを開始する。
   * @param {object} fromScene - トランジション元のシーン。
   * @param {object} toScene - トランジション先のシーン。
   * @param {number} toSlotIndex - トランジション先のシーンのスロット番号。
   */
  start(fromScene, toScene, toSlotIndex) {
    if (this.isActive || !fromScene || !toScene || fromScene === toScene) {
      return false;
    }
    this.isActive = true;
    this.progress = 0;
    this.fromScene = fromScene;
    this.toScene = toScene;
    this.toSlotIndex = toSlotIndex;
    return true;
  }

  /**
   * トランジションを停止（完了）する。
   */
  stop() {
    this.isActive = false;
    this.progress = 0;
    this.fromScene = null;
    this.toScene = null;
    this.toSlotIndex = -1;
  }

  /**
   * トランジションの進行状況を更新する。
   * @param {number} deltaTime - 前フレームからの経過時間。
   * @param {number} duration - トランジションの総時間。
   */
  update(deltaTime, duration) {
    if (!this.isActive) return;
    
    this.progress += deltaTime / duration;
    if (this.progress >= 1.0) {
      this.progress = 1.0;
    }
  }
}