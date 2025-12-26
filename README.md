# Chrome Toolbox

ChatGPT / Gemini / Google Chat の送信操作を `Ctrl + Enter` に統一する Chrome 拡張です。通常の `Enter` は改行のままにし、誤送信を減らします。

## 主な機能

- `Ctrl + Enter` で送信、`Enter` は改行
- ChatGPT / Gemini / Google Chat のみで動作
- サイトごとに ON/OFF を切り替え可能（拡張ポップアップ）
- Gemini の Gem マネージャーに検索バーを追加（jsmigemo でローマ字検索対応）
- Mac でも `Ctrl + Enter` を送信に統一

## インストール（開発者モード）

1. Chrome で `chrome://extensions` を開く
2. 右上の「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」から `extension/` を選択

## 使い方

- `Enter`: 改行
- `Ctrl + Enter`: 送信
- 拡張アイコンのポップアップでサイト別に ON/OFF 可能
- Gem 検索の ON/OFF もポップアップから切り替え可能

## 対象サイト

- `https://chat.openai.com/*`
- `https://chatgpt.com/*`
- `https://gemini.google.com/*`
- `https://chat.google.com/*`

## ディレクトリ構成

```
.
├─ extension/          # Chrome 拡張本体
│  ├─ manifest.json
│  ├─ common.js
│  ├─ chatgpt-content.js
│  ├─ gemini-content.js
│  ├─ chat-content.js
│  ├─ popup.html
│  ├─ popup.css
│  ├─ popup.js
│  └─ icons/
├─ docs/
└─ tmp/
```

## 開発メモ

- DOM 変更に強いよう `MutationObserver` で入力欄を監視
- 送信は送信ボタンのクリックを優先し、無ければフォーム送信にフォールバック
- 設定は `chrome.storage.sync` に保存（Chrome 終了後も保持）
- Gem 検索は `jsmigemo` と `migemo-compact-dict` を同梱
