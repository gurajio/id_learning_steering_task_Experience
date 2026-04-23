# 同一IDステアリング課題 実験システム

`test.html` をブラウザで開くと実験を開始できます。

## ファイル構成

- `test.html`
  - 画面のHTML構造
  - CSSとJavaScriptの読み込み
- `css/styles.css`
  - レイアウト、ボタン、パネル、キャンバス周辺の見た目
- `js/config.js`
  - 実験条件の設定
  - W、A、試行数、終点停止時間
- `js/geometry.js`
  - 経路生成
  - 点が経路内・円内にあるかの判定
  - マウス座標からキャンバス座標への変換
- `js/renderer.js`
  - キャンバス描画
  - 経路、開始点、終点、軌跡、条件ラベルの描画
- `js/ui.js`
  - 進行表示、条件一覧、条件別概要、ログ表示の更新
- `js/dataExport.js`
  - CSV / JSON 生成
  - ファイル保存処理
- `js/experiment.js`
  - 実験状態の管理
  - 試行開始、移動記録、成功・失敗判定、条件ブロック進行
- `js/main.js`
  - 初期化
  - クリック、ポインタ移動、キーボード、保存ボタンのイベント登録

## 条件を変更したい場合

`js/config.js` の `conditions` を編集してください。

```js
{ id: "C1", name: "条件1", label: "狭いW・短いA", width: 36, amplitude: 216, trials: 30 }
```

このシステムでは `steeringId` は `amplitude / width` から自動計算されます。
