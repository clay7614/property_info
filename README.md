# SUUMO 物件情報トラッカー

弁天町エリアの賃貸物件情報をリアルタイムで監視・追跡するWebアプリケーションです。

## 監視対象物件

1. **エスリードレジデンス弁天町グランデ**
   - https://suumo.jp/library/tf_27/sc_27107/to_1002517081/

2. **エスリード弁天町グランツ**
   - https://suumo.jp/library/tf_27/sc_27107/to_1002440443/

3. **フォーリアライズ弁天町クロス**
   - https://suumo.jp/library/tf_27/sc_27107/to_1002426103/

## 機能

- **物件情報表示**: 各物件の掲載中の物件数と入居時期の内訳を表示
- **SUUMOリンク**: ワンクリックでSUUMOの詳細ページへアクセス
- **履歴グラフ**: アクセスごとにデータを保存し、物件数の推移をグラフで表示
- **入居時期分析**: 入居時期の内訳（即入居可・相談・その他）の推移を可視化
- **データ管理**: ローカルストレージにデータを保存、エクスポート機能付き

## 使い方

1. GitHub Pagesにアクセス
2. 「データ更新」ボタンをクリックして最新情報を取得
3. 各物件カードで詳細を確認
4. グラフで過去の推移を確認

## ファイル構成

```
property_info/
├── index.html          # メインHTML
├── style.css           # スタイルシート
├── app.js              # JavaScript（メインロジック）
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Actions設定
└── README.md           # このファイル
```

## 技術スタック

- **HTML5 / CSS3**: レスポンシブデザイン
- **JavaScript (Vanilla)**: フレームワーク不使用
- **Chart.js**: グラフ描画
- **LocalStorage**: データ永続化
- **GitHub Actions**: 自動デプロイ
- **GitHub Pages**: ホスティング

## ローカルでの開発

```bash
# リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/property_info.git

# ディレクトリに移動
cd property_info

# ローカルサーバーを起動（Python 3の場合）
python -m http.server 8080

# ブラウザで開く
# http://localhost:8080
```

## 注意事項

- SUUMOからのデータ取得にはCORSプロキシを使用しています
- CORSプロキシの状態によってはデータ取得に失敗する場合があります
- データはブラウザのローカルストレージに保存されるため、ブラウザ/デバイスごとに別々の履歴が保持されます

## ライセンス

このプロジェクトは個人利用を目的としています。
SUUMOの利用規約に従ってご利用ください。

## 関連リンク

- [SUUMO物件ライブラリー](https://suumo.jp/library/)
- [Chart.js](https://www.chartjs.org/)
