(() => {
  // 共通ロジックが先に読み込まれている前提
  if (!window.__ctrlEnterSenderInit) {
    return;
  }

  window.__ctrlEnterSenderInit({
    siteLabel: 'gemini',
    settingKey: 'enableGemini',
    // Gemini の入力欄候補（textarea/contenteditable 両対応）
    inputSelectors: [
      'rich-textarea textarea',
      'rich-textarea [contenteditable="true"]',
      'textarea[aria-label*="prompt"]',
      'textarea[aria-label*="message"]',
      'div[contenteditable="true"][aria-label*="prompt"]',
      'div[contenteditable="true"][role="textbox"]'
    ],
    // 送信ボタン候補（日本語ラベルも含む）
    sendButtonSelectors: [
      'button[aria-label*="Send"]',
      'button[aria-label*="Submit"]',
      'button[aria-label*="Run"]',
      'button[aria-label*="送信"]',
      'button[aria-label*="プロンプト"]',
      'button.send-button',
      'button.submit',
      'button[type="submit"]'
    ]
  });
})();
