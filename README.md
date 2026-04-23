# 同一IDステアリング課題 実験システム

右角に曲がるステアリング課題をブラウザ上で実施するための小さな実験アプリです。参加者IDを入力して実験を開始すると、条件ごとに複数試行を行い、成功・失敗、移動時間、終点座標、軌跡データをCSVまたはJSONで保存できます。

`test.html` をブラウザで開くと、そのまま実験を開始できます。ビルド手順や外部ライブラリは不要です。

## 実験内容

- 90度に曲がる通路を、開始円から終了円まで進みます。
- 終了円に到達した時点で試行完了になります。
- 通路から外れても試行は継続します。逸脱の有無、回数、合計時間、最大はみ出し量はログと保存データに記録されます。
- 条件は `js/config.js` の `conditions` で管理されています。

## 操作方法

1. `test.html` をブラウザで開きます。
2. 参加者IDを入力します。
3. 「実験開始」ボタンを押します。
4. 開始円から終了円まで、表示された通路に沿って操作します。
5. 試行が終わると次の開始円が表示されます。次の開始円を押した瞬間から次試行のMT計測が始まります。
6. 実験後、CSVまたはJSONを保存します。途中で中止した場合も、記録済みの結果を保存できます。

キーボード操作:

- `Escape`: 実行中の試行を中断します。
- `Enter`: 次の試行または次の条件へ進みます。

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `test.html` | 画面のHTML構造、CSSとJavaScriptの読み込み順を定義します。 |
| `css/styles.css` | レイアウト、サイドバー、ボタン、統計パネル、キャンバス、ログの見た目を定義します。 |
| `js/config.js` | 実験条件、試行数、停止判定時間などの設定を定義します。 |
| `js/geometry.js` | 経路生成、座標変換、円内判定、通路内判定などの幾何計算を担当します。 |
| `js/dataExport.js` | 実験結果をCSV/JSONへ変換し、ファイルとして保存します。 |
| `js/renderer.js` | キャンバス上に通路、開始円、終了円、軌跡、ポインタ、条件ラベルを描画します。 |
| `js/ui.js` | 画面上のメッセージ、条件一覧、進行状況、集計表、ログを更新します。 |
| `js/experiment.js` | 実験状態、試行開始、移動記録、成功・失敗判定、条件進行を管理します。 |
| `js/main.js` | 初期化とイベント登録を行い、各モジュールを接続します。 |

## ページと読み込まれる関数

このアプリの画面は `test.html` の1ページ構成です。`test.html` では次の順番でJavaScriptを読み込みます。

1. `js/config.js`
2. `js/geometry.js`
3. `js/dataExport.js`
4. `js/renderer.js`
5. `js/ui.js`
6. `js/experiment.js`
7. `js/main.js`

読み込み順には意味があります。`main.js` が最後に読み込まれ、`Config`、`Geometry`、`DataExport`、`Renderer`、`Ui`、`Experiment` を組み合わせてアプリを起動します。

## 主要モジュールと関数

### `js/config.js`

- `window.SteeringTask.Config`
  - 実験全体の設定オブジェクトです。
  - `targetDwellMs`: 以前の停止判定用設定です。現在の実装では終点到達時に試行完了します。
  - `conditions`: 条件ID、条件名、通路幅 `width`、振幅 `amplitude`、試行数 `trials` を定義します。
  - `steeringId`: 各条件の `amplitude / width` から自動計算されます。

### `js/geometry.js`

- `makePath(canvas, condition)`
  - キャンバスサイズと条件から、開始点、角、終了点を持つL字型経路を生成します。
- `getCanvasPoint(canvas, event)`
  - ブラウザ上のポインタイベント座標をキャンバス座標へ変換します。
- `isInsideCircle(point, center, radius)`
  - 点が開始円または終了円の内側にあるか判定します。
- `isInsideCorridor(point, path, width)`
  - 点が通路幅の内側にあるか判定します。
- `getCorridorDeviation(point, path, width)`
  - 点が通路から何px外れているかを計算します。通路内の場合は `outsidePx` が0になります。
- `pointToSegmentDistance(point, a, b)`
  - 点と線分の最短距離を計算します。通路内判定の内部で使われます。

### `js/renderer.js`

- `draw({ canvas, state, condition, pointer })`
  - キャンバス全体を再描画する入口です。
- `drawIdle(ctx, canvas)`
  - 実験開始前の待機表示を描画します。
- `drawCorridor(ctx, path, condition)`
  - 通路の外枠と通路本体を描画します。
- `drawEndpointLabels(ctx, path, condition)`
  - 開始円、終了円、START/ENDラベルを描画します。
- `drawTrajectory(ctx, trial)`
  - 実行中の軌跡を描画します。成功時は緑、失敗時は赤で表示します。
- `drawPointer(ctx, pointer)`
  - 現在のポインタ位置を描画します。
- `drawConditionLabel(ctx, condition)`
  - 現在条件の幅、振幅、IDをキャンバス左上に表示します。

### `js/ui.js`

- `collectElements()`
  - HTML要素をまとめて取得します。
- `setMessage(elements, text, tone)`
  - 上部メッセージを更新します。`fail` や `break` の表示にも使います。
- `update(elements, payload)`
  - 条件、試行数、成功数、失敗数、条件一覧、集計表をまとめて更新します。
- `renderConditionList(elements, conditions, state)`
  - サイドバーの条件一覧を描画します。
- `renderSummary(elements, conditions, results)`
  - 条件ごとの平均MTとエラー率を集計表に描画します。
- `updateLog(elements, row)`
  - 直近試行の結果をログに追加します。
- `setInitialLog(elements)`
  - ログ表示を初期状態に戻します。

### `js/experiment.js`

- `Experiment({ elements, config, geometry, renderer, ui })`
  - 実験制御オブジェクトを作成します。
- `currentCondition()`
  - 現在の条件を返します。
- `draw(pointer)`
  - 現在状態をもとにキャンバスを再描画します。
- `resetExperiment()`
  - 実験状態、結果、UIを初期化します。
- `startExperiment()`
  - 参加者IDを確認し、最初の試行を準備します。
- `nextTrial()`
  - 次の試行または次の条件へ進みます。
- `startTrial(point, event)`
  - 開始円内から試行を開始し、軌跡記録を作成します。
- `recordMove(point)`
  - ポインタ移動を軌跡に追加し、通路逸脱を記録し、終了円到達を判定します。
- `completeTrial(point)`
  - pointerup時に終点到達を確認します。通常は終了円に入った時点で試行完了します。
- `failTrial(errorType, point)`
  - 試行失敗を記録します。
- `abortActiveTrial()`
  - 実行中の試行を手動中断します。
- `abortExperiment()`
  - 実験全体を途中終了し、記録済みデータを保存できる状態にします。

内部関数:

- `prepareTrial()`: 現在条件から新しい経路を作ります。
- `commitTrial(trial)`: 試行結果を保存用データへ変換して `state.results` に追加します。
- `advanceAfterTrial(failed)`: 試行後に次の試行、条件ブレイク、実験終了へ進めます。
- `finishExperiment()`: 実験終了状態へ切り替えます。
- `updateUi()`: UI全体を現在状態に合わせて更新します。

### `js/dataExport.js`

- `makeCsv(results)`
  - `state.results` をCSV文字列へ変換します。
- `makeJson({ participantId, conditions, results })`
  - 実験条件と結果をJSON文字列へ変換します。
- `download(filename, text, type)`
  - Blobを作成し、ブラウザからファイル保存を開始します。
- `makeFilename(participantId, extension)`
  - 参加者IDと日時を含む保存ファイル名を作成します。
- `csvEscape(value)`
  - CSV用に値をエスケープします。

### `js/main.js`

- `DOMContentLoaded` イベント内でアプリを初期化します。
- `Ui.collectElements()` でHTML要素を取得します。
- `Experiment(...)` で実験制御を作成します。
- キャンバスの `pointerdown`、`pointermove`、`pointerup`、`pointercancel` を実験処理へ接続します。
- 開始、次へ、保存、全画面ボタンのクリックイベントを登録します。
- 中止ボタンのクリックイベントを登録し、途中終了後もCSV/JSON保存できるようにします。
- `resize` と `keydown` のイベントを登録します。
- 最後に `experiment.resetExperiment()` を呼び、初期画面を描画します。

## 保存されるデータ

CSVとJSONには、主に次の情報が保存されます。

| 項目 | 内容 |
| --- | --- |
| `participantId` | 参加者ID |
| `conditionId` / `conditionName` / `conditionLabel` | 条件情報 |
| `width` | 通路幅 |
| `amplitude` | 経路の振幅 |
| `steeringId` | `amplitude / width` |
| `conditionOrder` | 条件順 |
| `trialInCondition` | 条件内の試行番号 |
| `totalTrial` | 実験全体での試行番号 |
| `startedAtIso` | 試行開始日時 |
| `mtMs` | 移動時間 |
| `success` | 成功したかどうか |
| `errorType` | 失敗理由 |
| `endpointX` / `endpointY` | 試行終了時の座標 |
| `deviated` | 通路から一度でも外れたかどうか |
| `deviationCount` | 通路外へ出た区間の数 |
| `deviationTotalMs` | 通路外にいた合計時間 |
| `maxDeviationPx` | 最大はみ出し量 |
| `deviationEvents` | 各逸脱区間の開始時刻、終了時刻、継続時間、最大はみ出し量 |
| `trajectory` | x, y, t を持つ軌跡データ |

## 条件を変更する方法

条件を変える場合は `js/config.js` の `conditions` を編集します。

```js
{ id: "C1", name: "条件1", label: "狭いW・短いA", width: 36, amplitude: 216, trials: 40 }
```

`steeringId` は `amplitude / width` から自動計算されます。試行数を変更したい場合は `trials` を変更してください。
