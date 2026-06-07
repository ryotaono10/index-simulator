# Index Simulator

CSV で用意した指数の価格履歴を読み込み、毎月積立の結果を比較する静的 Web サイトです。`docs/` 配下だけで完結するので、そのまま GitHub Pages の公開対象にできます。

## 構成

- `docs/index.html`
- `docs/app.js`
- `docs/styles.css`
- `docs/assets/`
- `docs/.nojekyll`

`app.py` には依存しません。GitHub Pages では `docs/` ディレクトリだけを配信対象にします。

## できること

- 複数指数の CSV を同時に読み込んで比較
- 毎月の積立額、期間を指定してシミュレーション
- 投資元本、最終評価額、損益、騰落率を表示
- 積立評価額の推移をグラフ表示

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

## ローカル確認

サーバーなしでも `docs/index.html` をブラウザで直接開けます。必要なら簡易サーバーで `docs/` を配信して確認しても構いませんが、公開構成自体は静的ファイルのみです。

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

この版では外部 API からの自動取得はまだ入れていません。理由は、指数データの提供元によって以下がぶれるためです。

- API キーの要否
- 配当込み/配当なし
- 調整後終値の有無
- 利用規約

次の段階としては、取得元を 1 つに固定して `docs/assets/` にサンプルデータを置くか、別途データ更新フローを追加するのが自然です。
