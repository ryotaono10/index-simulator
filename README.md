# Index Simulator

あらかじめ `docs/assets/csv/` に保存した指数 CSV を読み込み、毎月積立の結果を比較する静的 Web サイトです。`docs/` 配下だけで完結するので、そのまま GitHub Pages の公開対象にできます。

## 構成

- `docs/index.html`
- `docs/app.js`
- `docs/styles.css`
- `docs/assets/`
- `docs/assets/csv/`
- `docs/assets/csv/catalog.json`
- `docs/.nojekyll`

`app.py` には依存しません。GitHub Pages では `docs/` ディレクトリだけを配信対象にします。

## できること

- `docs/assets/csv/` に置いた指数 CSV を選択して読み込み
- 毎月の積立額、期間を指定してシミュレーション
- 投資元本、最終評価額、損益、騰落率を表示
- 積立評価額の推移をグラフ表示

## 同梱データ

現時点で同梱しているデータセット:

- `S&P 500`
- `NASDAQ-100`
- `SOX`

いずれも FRED 経由で取得した日次データです。

`FANG+` と `オールカントリー` は、今回の環境で安定して機械取得できる公開CSV取得元をまだ確定できていないため未同梱です。

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

## CSV カタログ形式

`docs/assets/csv/catalog.json` は次のような形式です。

```json
{
  "updatedAt": "2026-06-07",
  "datasets": [
    {
      "id": "sp500",
      "name": "S&P 500",
      "file": "sp500.csv",
      "meta": {
        "source": "FRED",
        "seriesId": "SP500"
      }
    }
  ]
}
```

CSV を追加する場合は、`catalog.json` に名前とファイル名を追記してください。

## ローカル確認

`docs/index.html` を `file://` で直接開くと、ブラウザによっては `fetch` 制限で `catalog.json` や CSV を読めません。ローカル確認時も任意の簡易 HTTP サーバーで `docs/` を配信してください。GitHub Pages 上ではこの問題はありません。

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
- `FRED` などの公開データから指数データを取得する
- API キーが必要なら GitHub Secrets を使う
- 取得結果を `docs/assets/csv/` と `docs/assets/csv/catalog.json` に保存する
- GitHub Pages はその静的 CSV を読むだけにする

外部 API からの自動取得先を選ぶ際は、以下の差異に注意が必要です。

- API キーの要否
- 配当込み/配当なし
- 調整後終値の有無
- 利用規約

次の段階としては、取得元を 1 つに固定して GitHub Actions の更新スクリプトを追加するのが自然です。
