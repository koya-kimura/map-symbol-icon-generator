# 地図記号アイコン出力ツール

地図記号をテーマにした19カテゴリのモノクロアイコンを大量生成し、カテゴリ別フォルダーでZIPダウンロードできるVite + TypeScriptプロジェクトです。p5.jsを用いてシンボルを描画し、JSZipとFileSaver.jsで一括出力を行います。

## 主な機能

- 19種の地図記号カテゴリを選択し、PNGアイコンを一括生成
- 生成枚数と出力ピクセルサイズを任意に指定（最大6000枚 / 512px）
- カテゴリごとのプレビュー更新と生成処理の途中キャンセル
- カテゴリ別フォルダーに整理されたZIPファイルを自動ダウンロード
- 使い方をまとめたガイドページとハンバーガーメニューによるページ遷移

## 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーを起動 (http://localhost:5173)
npm run dev

# 型チェックと本番ビルド
npm run build

# ビルド済みアプリのプレビュー
npm run preview
```

## プロジェクト構成

- `index.html`: アイコン生成UIのエントリーポイント
- `guide.html`: 操作手順をまとめた説明ページ
- `src/main.ts`: 生成処理、UI制御、ZIPパッケージング
- `src/p5-sketch/generator.ts`: 地図記号アイコンを描画するp5.jsスケッチ
- `src/navigation.ts`: ハンバーガーメニューの挙動制御
- `src/style.css`: 緑と黄色を基調にした全体デザイン

## アイコンカテゴリ一覧

| ID | キー | ラベル |
| --- | --- | --- |
| 0 | city-hall | 市役所/役所 |
| 1 | police-box | 交番 |
| 2 | high-school | 高等学校 |
| 3 | post-office | 郵便局 |
| 4 | hospital | 病院 |
| 5 | shrine | 神社 |
| 6 | temple | 寺院 |
| 7 | museum | 博物館 |
| 8 | factory | 工場 |
| 9 | nursing-home | 老人ホーム |
| 10 | lighthouse | 灯台 |
| 11 | castle-ruins | 城跡 |
| 12 | hot-spring | 温泉 |
| 13 | fishing-port | 漁港 |
| 14 | orchard | 果樹園 |
| 15 | broadleaf-forest | 広葉樹林 |
| 16 | coniferous-forest | 針葉樹林 |
| 17 | library | 図書館 |
| 18 | windmill | 風車 |

## ライセンス

このリポジトリのコードはプロジェクト利用者の要件に合わせて調整してください。外部ライブラリのライセンス（p5.js,JSZip,FileSaver.jsなど）は各プロジェクトの規約に従います。
