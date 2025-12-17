# SUUMO 物件情報トラッカー

弁天町エリアの賃貸物件情報をリアルタイムで監視・追跡するWebアプリケーションです。

## 監視対象物件

1. [**エスリードレジデンス弁天町グランデ**](https://suumo.jp/library/tf_27/sc_27107/to_1002517081/)
2. [**エスリード弁天町グランツ**](https://suumo.jp/library/tf_27/sc_27107/to_1002440443/)
3. [**フォーリアライズ弁天町クロス**](https://suumo.jp/library/tf_27/sc_27107/to_1002426103/)

## URL

[SUUMO 物件情報トラッカー](https://clay7614.github.io/property_info/)

## 機能

- **物件情報表示**: 各物件の掲載中の物件数と入居時期の内訳を表示
- **SUUMOリンク**: ワンクリックでSUUMOの詳細ページへアクセス
- **履歴グラフ**: アクセスごとにデータを保存し、物件数の推移をグラフで表示
- **入居時期分析**: 入居時期の内訳（即入居可・相談・その他）の推移を可視化
- **データ管理**: ローカルストレージにデータを保存、エクスポート機能付き

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

## 関連リンク

- [SUUMO物件ライブラリー](https://suumo.jp/library/)
- [Chart.js](https://www.chartjs.org/)
