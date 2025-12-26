(() => {
  // 共通ロジックが先に読み込まれている前提
  if (!window.__ctrlEnterSenderInit) {
    return;
  }

  window.__ctrlEnterSenderInit({
    siteLabel: 'chat',
    // Google Chat の入力欄候補（iframe 内にも適用される）
    inputSelectors: [
      'div[contenteditable="true"][role="textbox"]',
      'div[role="textbox"][aria-label]',
      'textarea[aria-label*="message"]',
      'textarea[aria-label*="Message"]',
      'textarea[aria-label*="reply"]',
      'textarea[aria-label*="Reply"]'
    ],
    // 送信ボタン候補（日本語ラベルも含む）
    sendButtonSelectors: [
      'button[aria-label*="Send"]',
      'button[aria-label*="Reply"]',
      'button[aria-label*="Send message"]',
      'button[aria-label*="メッセージを送信"]',
      'button[aria-label*="送信"]',
      'button[type="submit"]'
    ]
  });
})();
