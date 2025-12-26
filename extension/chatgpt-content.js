(() => {
  // 共通ロジックが先に読み込まれている前提
  if (!window.__ctrlEnterSenderInit) {
    return;
  }

  window.__ctrlEnterSenderInit({
    siteLabel: 'chatgpt',
    settingKey: 'enableChatGPT',
    // ChatGPT の入力欄候補（UI 変更に備えて複数セレクタ）
    inputSelectors: [
      'textarea#prompt-textarea',
      'div#prompt-textarea[contenteditable="true"]',
      'textarea[data-id="prompt-textarea"]',
      'textarea[data-testid="prompt-textarea"]',
      'textarea[placeholder*="Message"]',
      'div[contenteditable="true"][data-testid="prompt-textarea"]',
      'div[contenteditable="true"][aria-label="Message"]'
    ],
    // 送信ボタン候補（表示中の要素を優先）
    sendButtonSelectors: [
      'button[data-testid="send-button"]',
      'button[aria-label="Send message"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="Send"]',
      'button[type="submit"]'
    ]
  });
})();
