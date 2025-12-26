# AGENTS.md

## 目的
ChatGPT、Gemini、Google Chat の送信操作を `Ctrl + Enter` に統一する Chrome 拡張を作成する。

## 対象
- ChatGPT (https://chat.openai.com/ など)
- Gemini (https://gemini.google.com/)
- Google Chat (https://chat.google.com/)

## 要件
- 通常の `Enter` は改行とする。
- `Ctrl + Enter` で送信（Mac でも `Ctrl + Enter` を送信に割り当てる）。
- 対象サービス以外では動作しない。
- サイト側のデフォルトの送信挙動を上書きするため、適切に `preventDefault` と `stopImmediatePropagation` を使う。

## 実装方針
- Manifest V3 の content script で各サイトの入力欄に `keydown` リスナーを付与する。
- 入力欄のセレクタは各サービスごとに定義し、監視には `MutationObserver` を使って動的に挿入された要素にも対応する。
- 送信は「送信ボタンの click」または「Enter 発火に近い UI 操作」で行う。
- 設定画面は不要。シンプルに固定キー（Ctrl/Cmd + Enter）で送信する。

## 注意点
- ChatGPT / Gemini は UI 更新が頻繁なため、セレクタ変更に強い実装にする。
- Google Chat は iframe 内に入力欄があるケースがあるため、必要なら `all_frames` を有効化する。
- OS 判定は `navigator.platform` を使い、Mac でも `event.ctrlKey` を `Ctrl` として扱う。

## 出力物
- `manifest.json`
- 各サイト向け content script (例: `chatgpt-content.js`, `gemini-content.js`, `chat-content.js`)
- 必要に応じて `README.md`
