# Index Simulator

CSV で用意した指数の価格履歴を読み込み、毎月積立の結果を比較する静的 Web サイトです。`docs/` 配下だけで完結するので、そのまま GitHub Pages の公開対象にできます。

## 構成

- `docs/index.html`
- `docs/app.js`
- `docs/styles.css`
- `docs/assets/`
- `docs/assets/indices.json`
- `docs/.nojekyll`

`app.py` には依存しません。GitHub Pages では `docs/` ディレクトリだけを配信対象にします。

## できること

- 複数指数の CSV を同時に読み込んで比較
- `docs/assets/indices.json` に置いた静的 JSON データを読み込み
- 毎月の積立額、期間を指定してシミュレーション
- 投資元本、最終評価額、損益、騰落率を表示
- 積立評価額の推移をグラフ表示

## 読み込みモード

画面上で次の 2 つを切り替えられます。

- `CSVアップロード`
- `サンプル内蔵データ`

`サンプル内蔵データ` は `docs/assets/indices.json` を `fetch` して読み込みます。GitHub Pages ではそのまま動きます。

ローカルで `docs/index.html` を `file://` で直接開いた場合、ブラウザによっては `fetch` が制限されて静的 JSON を読めないことがあります。その場合でも CSV アップロード機能は使えます。

## 想定 CSV 形式

以下のような日次データを想定しています。

```csv
Date,Close
2019-01-31,2704.10
2019-02-28,2784.49
2019-03-29,2834.40
```

使える列名:

- 日付: `date`, `Date`
- 終値: `close`, `Close`, `adj close`, `Adj Close`, `price`, `Price`

アプリ側で月末データに丸めて積立計算します。

## 想定 JSON 形式

`docs/assets/indices.json` は次のような形式です。

```json
{
  "updatedAt": "2026-06-07",
  "datasets": [
    {
      "id": "sp500-sample",
      "name": "S&P 500 サンプル",
      "meta": {
        "source": "sample-static-json"
      },
      "rows": [
        { "date": "2024-01-31", "close": 4845.65 }
      ]
    }
  ]
}
```

`rows` は `date` と `close` を持つ配列です。

## ローカル確認

サーバーなしでも `docs/index.html` をブラウザで直接開けます。CSV アップロード機能はそのまま使えます。

静的 JSON 読み込みも確認したい場合は、任意の簡易 HTTP サーバーで `docs/` を配信してください。GitHub Pages 上ではこの問題はありません。

## GitHub Pages で公開する手順

1. このディレクトリを GitHub リポジトリとして用意する
2. 内容を GitHub に push する
3. GitHub の対象リポジトリで `Settings > Pages` を開く
4. `Build and deployment` の `Source` で `Deploy from a branch` を選ぶ
5. ブランチは `main`、フォルダは `/docs` を選ぶ
6. 保存して数分待つ
7. 公開 URL にアクセスする

公開 URL は通常 `https://<ユーザー名>.github.io/<リポジトリ名>/` です。

## 補足

この版では、公開ページが API キーを直接持たない構成を前提にしています。将来的な自動取得は以下の形を想定しています。

- GitHub Actions が定期実行される
- `FRED` などの API から指数データを取得する
- API キーが必要なら GitHub Secrets を使う
- 取得結果を `docs/assets/indices.json` に保存する
- GitHub Pages はその静的 JSON を読むだけにする

外部 API からの自動取得先を選ぶ際は、以下の差異に注意が必要です。

- API キーの要否
- 配当込み/配当なし
- 調整後終値の有無
- 利用規約

次の段階としては、取得元を 1 つに固定して GitHub Actions の更新スクリプトを追加するのが自然です。
