# Property Info Tracker - Claude Agent

このプロジェクトは、SUUMO物件情報を追跡・可視化するWebアプリケーションです。

## プロジェクト概要

- **技術スタック**: HTML5, CSS3, Vanilla JavaScript, Chart.js, Node.js (Axios, Cheerio)
- **デプロイ**: GitHub Pages
- **CI/CD**: GitHub Actions
- **対象ブラウザ**: モダンブラウザ（Chrome, Firefox, Safari, Edge）

### 言語とコメント

```yaml
言語設定:
  - すべての出力、説明、ドキュメントは日本語で記述
  - コード内のコメントも日本語で記述
  - 変数名や関数名は英語（説明的な命名を推奨）
  - ユーザーへの応答も日本語
```

### 絵文字の使用禁止

絵文字は一切使用しないでください。すべての箇所（コード、コメント、ドキュメント、コミットメッセージ、メール本文、件名など）で禁止です。

代替表記:
- 強調: `*テキスト*` または `【テキスト】`
- 箇条書き: `*` または `-`
- 区切り線: `=` または `-` の繰り返し

# 日本語コメントで明確に
# JST (日本標準時 = UTC+9)
JST = timezone(timedelta(hours=9))
```

## コミット規約

### プレフィックスルール

```yaml
fix: バグ修正
hotfix: クリティカルなバグ修正
add: 新規（ファイル）機能追加
update: 機能修正（バグではない）
change: 仕様変更
clean: 整理（リファクタリング等）
disable: 無効化（コメントアウト等）
remove: 削除（ファイル）
upgrade: バージョンアップ
revert: 変更取り消し
```

### コミットメッセージ例

```bash
fix: ダークテーマのボタンテキスト色を修正
add: 物件情報の変更通知機能を追加
update: グラフを棒グラフから線グラフに変更
clean: 未使用の変数を削除
```

### コミットとプッシュの実行

変更を行った際は、必ずコミットとプッシュを実行してください。

```bash
# PowerShell環境でのコマンド例
$env:Path += ";C:\Program Files\Git\bin"
cd "c:\Users\Tangeken\Documents\GitHub\property_info"
git add .
git commit -m "fix: バグの説明"
git push
```

コミット対象:
- 新規ファイルの作成
- 既存ファイルの編集・削除
- 機能の追加・修正
- バグ修正
- スタイル・UI変更
- ドキュメント更新

## ファイル構造

```
property_info/
├── .github/
│   ├── agents/
│   │   └── japanese.agent.md   # このファイル
│   └── workflows/
│       ├── add-property.yml    # 物件追加ワークフロー
│       ├── fetch-data.yml      # データ取得・デプロイワークフロー
│       └── remove-property.yml # 物件削除ワークフロー
├── data/
│   ├── properties.json         # 追跡対象の物件リスト
│   └── property_history.json   # 物件履歴データ
├── scripts/
│   ├── addProperty.ts          # 物件追加スクリプト
│   ├── common.ts               # 共通ユーティリティ（ファイルI/O、日付操作）
│   ├── fetchSuumoData.ts       # スクレイピングスクリプト
│   ├── removeProperty.ts       # 物件削除スクリプト
│   └── sendEmailNotification.ts # メール通知スクリプト
├── src/
│   ├── frontend/               # フロントエンドモジュール
│   │   ├── charts.ts           # グラフ描画
│   │   ├── data.ts             # データ取得・管理
│   │   ├── theme.ts            # テーマ管理
│   │   └── ui.ts               # UI操作・DOM操作
│   ├── shared/                 # 共通定義
│   │   └── types.ts            # 共通型定義（インターフェース）
│   └── app.ts                  # フロントエンド・エントリポイント
├── index.html                  # メインHTML
├── style.css                   # スタイルシート
├── package.json                # プロジェクト設定
├── tsconfig.json               # スクリプト用TS設定
├── tsconfig.frontend.json      # フロントエンド用TS設定
└── README.md                   # プロジェクト説明
```