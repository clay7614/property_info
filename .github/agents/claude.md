# Property Info Tracker - Claude Agent

このプロジェクトは、SUUMO物件情報を追跡・可視化するWebアプリケーションです。

## プロジェクト概要

- **技術スタック**: HTML5, CSS3, Vanilla JavaScript, Chart.js, Python (Playwright)
- **デプロイ**: GitHub Pages
- **CI/CD**: GitHub Actions
- **対象ブラウザ**: モダンブラウザ（Chrome, Firefox, Safari, Edge）

## コーディング規約

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

### JavaScriptコーディングスタイル

```javascript
// 命名規則
const CONSTANT_VALUE = 'value';  // 定数: UPPER_SNAKE_CASE
let variableName = 'value';      // 変数: camelCase
function functionName() {}       // 関数: camelCase

// 関数コメント
/**
 * データを読み込む
 * @returns {Promise<void>}
 */
async function loadData() {
    // 実装...
}

// エラーハンドリング
try {
    await fetchData();
} catch (error) {
    console.error('エラー詳細:', error);
    // ユーザーへのフィードバック
}
```

### CSSコーディングスタイル

```css
/* CSS変数を活用したテーマ対応 */
:root {
    --primary-color: #2563eb;
    --text-primary: #1e293b;
}

[data-theme="dark"] {
    --primary-color: #3b82f6;
    --text-primary: #f1f5f9;
}

/* BEM記法を推奨 */
.component-name {}
.component-name__element {}
.component-name--modifier {}

/* コメントは日本語で */
/* ヘッダー */
.header {}
```

### Pythonコーディングスタイル

```python
# 型ヒントを使用
def fetch_property_data(property_info: dict) -> dict:
    """
    物件データを取得
    
    Args:
        property_info: 物件情報の辞書
        
    Returns:
        取得した物件データ
    """
    pass

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
│   │   └── claude.md           # このファイル
│   └── workflows/
│       ├── fetch-data.yml      # データ取得ワークフロー
│       └── deploy-pages.yml    # GitHub Pagesデプロイ
├── data/
│   └── property_history.json   # 物件履歴データ
├── scripts/
│   └── fetch_suumo_playwright.py  # スクレイピングスクリプト
├── index.html                  # メインHTML
├── app.js                      # メインJavaScript
├── style.css                   # スタイルシート
└── README.md                   # プロジェクト説明
```

## 開発ガイドライン

### レスポンシブデザイン

- モバイルファーストアプローチ
- ブレークポイント: 768px（タブレット）、1024px（デスクトップ）
- flexbox/gridを活用

### パフォーマンス最適化

- 画像の遅延読み込み
- 不要なDOM操作の削減
- イベントリスナーの適切な管理（メモリリーク防止）
- Chart.jsインスタンスの適切な破棄と再生成

### アクセシビリティ

- セマンティックHTML要素の使用
- 適切なARIA属性の追加
- キーボード操作のサポート
- カラーコントラスト比の確保（WCAG 2.1 AA準拠）

### テーマ対応

- CSS変数を使用したテーマ実装
- ライトモード・ダークモードの両方をサポート
- ユーザー設定をlocalStorageに保存

### データ管理

- localStorageを使用したクライアント側キャッシュ
- 最大200件の履歴保持
- タイムスタンプはJST（日本標準時）で記録

### エラーハンドリング

```javascript
// ユーザーフレンドリーなエラーメッセージ
try {
    await loadData();
} catch (error) {
    console.error('エラー:', error);
    showError('データの読み込みに失敗しました。');
}
```

## テスト方針

- 手動テスト: ブラウザでの動作確認
- クロスブラウザテスト: Chrome, Firefox, Safari, Edge
- モバイルテスト: Chrome DevTools, 実機確認

## プロジェクト特有の注意事項

### 物件データの取得

- Playwrightを使用したブラウザ自動化
- 「もっと見る」ボタンの展開処理（トグルボタンに注意）
- 入居時期データの正確な抽出（即入居可、相談、年月日の3パターン）

### 26年3月入居の特別扱い

- UI上で紫色で強調表示
- 変更通知で優先的に表示
- サマリーカードで独立表示

### GitHub Actions

- 日本時間 7:00, 12:00, 17:00に自動実行
- データ取得→コミット→プッシュ→GitHub Pagesデプロイ

## 参考リンク

- [Chart.js Documentation](https://www.chartjs.org/)
- [Playwright Documentation](https://playwright.dev/)
- [GitHub Pages Documentation](https://docs.github.com/pages)
