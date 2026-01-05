(() => {
  if (window.__ctrlEnterSenderInit) {
    return;
  }

  const initCtrlEnterSender = (config) => {
    // サイトごとの設定（入力欄・送信ボタン・デバッグ設定）
    const inputSelectors = config.inputSelectors || [];
    const sendButtonSelectors = config.sendButtonSelectors || [];
    const disableExecCommand = Boolean(config.disableExecCommand);
    const preferBrowserDefaultNewline = Boolean(config.preferBrowserDefaultNewline);
    const debug = Boolean(config.debug);
    const siteLabel = config.siteLabel || 'site';
    const settingKey = config.settingKey || null;

    // デバッグログは明示的に有効化した時だけ出す
    const log = (...args) => {
      if (debug) {
        console.log(`[ctrl-enter][${siteLabel}]`, ...args);
      }
    };

    // 既にイベントを付けた要素は再バインドしない
    const boundElements = new Set();
    let enabled = false;
    let observer = null;

    // 画面上に見えている送信ボタンを探す
    const findSendButton = () => {
      for (const selector of sendButtonSelectors) {
        const button = document.querySelector(selector);
        if (button && button.offsetParent !== null) {
          return button;
        }
      }
      return null;
    };

    const dispatchShiftEnter = (element) => {
      const downEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(downEvent);
      const upEvent = new KeyboardEvent('keyup', {
        key: 'Enter',
        code: 'Enter',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(upEvent);
    };

    // 通常の Enter は改行として挿入する
    const insertNewline = (event) => {
      const target = event.target;
      if (target instanceof HTMLTextAreaElement) {
        const start = target.selectionStart ?? target.value.length;
        const end = target.selectionEnd ?? target.value.length;
        target.setRangeText('\n', start, end, 'end');
        target.dispatchEvent(new Event('input', { bubbles: true }));
        log('inserted newline into textarea');
        return;
      }

      if (target instanceof HTMLElement) {
        const editable = target.closest('[contenteditable="true"]');
        if (editable) {
          const before = editable.innerHTML;
          // まず Shift+Enter 相当を試す（UI 依存の改行処理に寄せる）
          dispatchShiftEnter(editable);
          const after = editable.innerHTML;
          if (before !== after) {
            log('inserted newline via shift+enter');
            return;
          }

          // 反応がない場合はラインブレークを直接挿入
          if (!disableExecCommand) {
            document.execCommand('insertLineBreak');
            log('inserted newline via execCommand');
          }
        }
      }
    };

    // Enter/Control+Enter の動作をここで上書きする
    const handleKeydown = (event) => {
      log('keydown', {
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        isComposing: event.isComposing,
        targetTag: event.target?.tagName,
        targetType: event.target?.getAttribute?.('type'),
        targetEditable: event.target?.isContentEditable
      });

      if (event.isComposing || event.key !== 'Enter') {
        return;
      }

      // Shift+Enter はサイト側の挙動に任せる
      if (event.shiftKey && !event.ctrlKey) {
        return;
      }

      // Ctrl+Enter だけ送信にする（Mac でも ctrlKey を使う）
      const shouldSend = event.ctrlKey;
      if (!shouldSend) {
        if (preferBrowserDefaultNewline) {
          event.stopImmediatePropagation();
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        insertNewline(event);
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      // 送信ボタンがあればクリックで送信
      const sendButton = findSendButton();
      if (sendButton) {
        log('sending via button click');
        sendButton.click();
        return;
      }

      // 送信ボタンがない場合はフォーム送信にフォールバック
      const form = event.currentTarget?.closest?.('form');
      if (form) {
        log('sending via form submit');
        if (typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        } else {
          form.submit();
        }
      }
    };

    // 対象要素に一度だけリスナーを付ける
    const attachListener = (element) => {
      if (boundElements.has(element)) {
        return;
      }

      boundElements.add(element);
      element.addEventListener('keydown', handleKeydown, true);
      log('listener attached', element.tagName);
    };

    // 付けたリスナーをすべて外す（無効化時に使用）
    const detachAll = () => {
      for (const element of boundElements) {
        element.removeEventListener('keydown', handleKeydown, true);
      }
      boundElements.clear();
    };

    // 既存の DOM に対して入力欄を探索する
    const scanAndAttach = (root = document) => {
      for (const selector of inputSelectors) {
        root.querySelectorAll(selector).forEach(attachListener);
      }
    };

    const startObserving = () => {
      if (observer) {
        return;
      }
      // DOM 追加に追従して動的に挿入された入力欄にも対応する
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (!(node instanceof Element)) {
              continue;
            }

            if (node.matches && inputSelectors.some((selector) => node.matches(selector))) {
              attachListener(node);
            }

            scanAndAttach(node);
          }
        }
      });

      observer.observe(document.documentElement, { childList: true, subtree: true });
    };

    const stopObserving = () => {
      if (!observer) {
        return;
      }
      observer.disconnect();
      observer = null;
    };

    const applyEnabledState = (nextEnabled) => {
      if (nextEnabled === enabled) {
        return;
      }
      enabled = nextEnabled;
      if (enabled) {
        scanAndAttach();
        startObserving();
        log('initialized');
      } else {
        stopObserving();
        detachAll();
        log('disabled');
      }
    };

    if (settingKey && chrome?.storage?.sync) {
      chrome.storage.sync.get({ [settingKey]: true }, (result) => {
        applyEnabledState(Boolean(result[settingKey]));
      });

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync') {
          return;
        }
        if (!changes[settingKey]) {
          return;
        }
        applyEnabledState(Boolean(changes[settingKey].newValue));
      });
    } else {
      applyEnabledState(true);
    }
  };

  window.__ctrlEnterSenderInit = initCtrlEnterSender;
})();
