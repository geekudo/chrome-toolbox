(() => {
  // 共通ロジックが先に読み込まれている前提
  if (!window.__ctrlEnterSenderInit) {
    return;
  }

  window.__ctrlEnterSenderInit({
    siteLabel: 'gemini',
    settingKey: 'enableGemini',
    disableExecCommand: true,
    preferBrowserDefaultNewline: true,
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

  const DEFAULTS = {
    enableGemini: true,
    enableGemManagerSearch: true
  };

  const SEARCH_INPUT_ID = 'chrome-toolbox-gem-search';
  const SEARCH_STYLE_ID = 'chrome-toolbox-gem-search-style';

  let settings = { ...DEFAULTS };
  let gemSearchObserver = null;
  let migemoInstance = null;
  let migemoPromise = null;
  let resizeListenerAttached = false;

  const shouldEnableGemSearch = () => settings.enableGemini && settings.enableGemManagerSearch;

  const isGemManagerPage = () => location.href.includes('/gems/view');

  const getHeaderTitle = () => document.querySelector('h1.gds-headline-m');

  const ensureGemSearchStyles = () => {
    if (document.getElementById(SEARCH_STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = SEARCH_STYLE_ID;
    style.textContent = `
      .chrome-toolbox-gem-search {
        margin: 16px 0 24px 0;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        overflow: visible;
      }
      .chrome-toolbox-gem-search-input-container {
        position: relative;
        width: 100%;
        height: 48px;
        box-sizing: border-box;
        border-radius: 24px;
        border: 1px solid var(--gem-sys-color-outline, #747775);
        background-color: var(--gem-sys-color-surface-container-high, #f0f4f9);
        overflow: hidden;
        transition: background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      }
      .chrome-toolbox-gem-search-icon {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        pointer-events: none;
      }
      .chrome-toolbox-gem-search-input {
        width: 100%;
        height: 100%;
        padding: 0 44px 0 52px;
        box-sizing: border-box;
        display: block;
        border: none;
        background: transparent;
        color: var(--gem-sys-color-on-surface, #1f1f1f);
        font-family: "Google Sans", Roboto, sans-serif;
        font-size: 16px;
        outline: none;
        min-width: 0;
      }
      .chrome-toolbox-gem-search-input-container:focus-within {
        background-color: var(--gem-sys-color-surface, #fff);
        box-shadow: 0 1px 6px rgba(32, 33, 36, 0.28);
        border-color: transparent;
      }
      .chrome-toolbox-gem-search-clear {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--gem-sys-color-on-surface-variant, #5f6368);
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
      }
      .chrome-toolbox-gem-search-clear:hover {
        background: rgba(60, 64, 67, 0.08);
      }
    `;
    document.head.appendChild(style);
  };

  const setupSearchContainer = (wrapper, inputContainer, input) => {
    if (wrapper.dataset.chromeToolboxReady === 'true') {
      return;
    }

    let clearButton = inputContainer.querySelector('.chrome-toolbox-gem-search-clear');
    if (!clearButton) {
      clearButton = document.createElement('button');
      clearButton.type = 'button';
      clearButton.className = 'chrome-toolbox-gem-search-clear';
      clearButton.setAttribute('aria-label', '検索をクリア');
      clearButton.textContent = '×';
      inputContainer.appendChild(clearButton);
    }

    const updateClearVisibility = () => {
      clearButton.style.visibility = input.value ? 'visible' : 'hidden';
    };

    const clearSearch = () => {
      input.value = '';
      executeGemSearch('');
      updateClearVisibility();
      input.focus();
    };

    input.addEventListener('input', (event) => {
      executeGemSearch(event.target.value);
      updateClearVisibility();
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        clearSearch();
      }
    });

    clearButton.addEventListener('click', () => {
      clearSearch();
    });

    updateClearVisibility();
    wrapper.dataset.chromeToolboxReady = 'true';
  };

  const createSearchInput = () => {
    const container = document.createElement('div');
    container.className = 'chrome-toolbox-gem-search';

    const inputContainer = document.createElement('div');
    inputContainer.className = 'chrome-toolbox-gem-search-input-container';

    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'chrome-toolbox-gem-search-icon';

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('height', '24');
    svg.setAttribute('width', '24');
    svg.style.fill = 'var(--gem-sys-color-on-surface-variant, #444746)';
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute(
      'd',
      'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'
    );
    svg.appendChild(path);
    iconWrapper.appendChild(svg);

    const input = document.createElement('input');
    input.id = SEARCH_INPUT_ID;
    input.type = 'text';
    input.className = 'chrome-toolbox-gem-search-input';
    input.placeholder = 'Gem を検索 (名前、説明文 / ローマ字対応)';

    inputContainer.appendChild(iconWrapper);
    inputContainer.appendChild(input);
    container.appendChild(inputContainer);

    setupSearchContainer(container, inputContainer, input);

    return container;
  };

  const loadMigemo = async () => {
    if (migemoInstance) {
      return migemoInstance;
    }
    if (migemoPromise) {
      return migemoPromise;
    }
    if (!window.jsmigemo || !chrome?.runtime?.getURL) {
      return null;
    }

    const dictUrl = chrome.runtime.getURL('vendor/migemo-compact-dict');
    migemoPromise = fetch(dictUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`migemo dict fetch failed: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((buffer) => {
        const dict = new window.jsmigemo.CompactDictionary(buffer);
        const migemo = new window.jsmigemo.Migemo();
        migemo.setDict(dict);
        migemoInstance = migemo;
        return migemoInstance;
      })
      .catch((error) => {
        console.warn('[chrome-toolbox] migemo load failed', error);
        return null;
      });

    return migemoPromise;
  };

  const buildMatcher = async (query) => {
    const term = query.trim();
    if (!term) {
      return null;
    }

    const migemo = await loadMigemo();
    if (!migemo) {
      return {
        type: 'text',
        value: term.toLowerCase()
      };
    }

    try {
      const pattern = migemo.query(term);
      return {
        type: 'regex',
        value: new RegExp(pattern, 'i')
      };
    } catch {
      return {
        type: 'text',
        value: term.toLowerCase()
      };
    }
  };

  const matchText = (matcher, title, desc) => {
    if (!matcher) {
      return true;
    }
    if (matcher.type === 'regex') {
      return matcher.value.test(title) || matcher.value.test(desc);
    }
    const term = matcher.value;
    return title.toLowerCase().includes(term) || desc.toLowerCase().includes(term);
  };

  const executeGemSearch = async (query) => {
    const matcher = await buildMatcher(query);

    // カード形式のGem (Google製)
    const premadeCards = document.querySelectorAll('template-gallery-card');
    premadeCards.forEach((card) => {
      const title = card.querySelector('.template-gallery-card-title')?.textContent || '';
      const desc = card.querySelector('.template-gallery-card-content')?.textContent || '';
      const match = matchText(matcher, title, desc);
      card.style.display = match ? '' : 'none';
    });

    // リスト形式のGem (マイGem)
    const botRows = document.querySelectorAll('bot-list-row');
    botRows.forEach((row) => {
      const titleEl = row.querySelector('.bot-title .title') || row.querySelector('.bot-title');
      const title = titleEl?.textContent || '';
      const desc = row.querySelector('.bot-desc')?.textContent || '';
      const match = matchText(matcher, title, desc);
      row.style.display = match ? '' : 'none';
    });

    updateSectionVisibility(Boolean(matcher));
  };

  const updateSectionVisibility = (isFiltering) => {
    if (!isFiltering) {
      document.querySelectorAll('.premade-gems, .bot-list-container, .list-header').forEach((el) => {
        el.style.display = '';
      });
      document.querySelectorAll('template-gallery-card, bot-list-row').forEach((el) => {
        el.style.display = '';
      });
      return;
    }

    const premadeSection = document.querySelector('.premade-gems');
    if (premadeSection) {
      const visibleCards = premadeSection.querySelectorAll('template-gallery-card:not([style*="display: none"])');
      premadeSection.style.display = visibleCards.length > 0 ? '' : 'none';
    }

    const listContainers = document.querySelectorAll('.bot-list-container');
    listContainers.forEach((container) => {
      const visibleRows = container.querySelectorAll('bot-list-row:not([style*="display: none"])');
      const isVisible = visibleRows.length > 0;
      container.style.display = isVisible ? '' : 'none';

      let prev = container.previousElementSibling;
      while (prev && !prev.classList.contains('list-header')) {
        prev = prev.previousElementSibling;
      }
      if (prev && prev.classList.contains('list-header')) {
        prev.style.display = isVisible ? '' : 'none';
      }
    });
  };

  const insertSearchBar = () => {
    const existingInput = document.getElementById(SEARCH_INPUT_ID);
    if (existingInput) {
      const wrapper = existingInput.closest('.chrome-toolbox-gem-search');
      const inputContainer = existingInput.closest('.chrome-toolbox-gem-search-input-container') || wrapper;
      if (wrapper && inputContainer) {
        ensureGemSearchStyles();
        setupSearchContainer(wrapper, inputContainer, existingInput);
        syncSearchLayout();
      }
      return;
    }
    const headerTitle = getHeaderTitle();
    if (!headerTitle || !headerTitle.parentElement) {
      return;
    }

    ensureGemSearchStyles();
    const searchContainer = createSearchInput();
    headerTitle.parentElement.insertBefore(searchContainer, headerTitle.nextSibling);
    syncSearchLayout();
  };

  const removeSearchBar = () => {
    const input = document.getElementById(SEARCH_INPUT_ID);
    if (input) {
      input.closest('.chrome-toolbox-gem-search')?.remove();
    }
    const style = document.getElementById(SEARCH_STYLE_ID);
    if (style) {
      style.remove();
    }
    updateSectionVisibility(false);
  };

  const refreshGemSearch = () => {
    if (!shouldEnableGemSearch() || !isGemManagerPage()) {
      removeSearchBar();
      return;
    }
    insertSearchBar();
    syncSearchLayout();
  };

  const startGemSearchObserver = () => {
    if (gemSearchObserver) {
      return;
    }
    gemSearchObserver = new MutationObserver(() => {
      refreshGemSearch();
    });
    gemSearchObserver.observe(document.documentElement, { childList: true, subtree: true });
  };

  const syncSearchLayout = () => {
    const input = document.getElementById(SEARCH_INPUT_ID);
    if (!input) {
      return;
    }
    const container = input.closest('.chrome-toolbox-gem-search');
    if (!container) {
      return;
    }

    const listHeader = document.querySelector('.list-header');
    if (!listHeader) {
      container.style.marginLeft = '';
      container.style.marginRight = '';
      container.style.width = '';
      container.style.maxWidth = '';
      return;
    }

    const parent = container.parentElement;
    const parentRect = parent?.getBoundingClientRect();
    const headerRect = listHeader.getBoundingClientRect();
    if (!parentRect || headerRect.width === 0) {
      return;
    }

    const computed = parent ? getComputedStyle(parent) : null;
    const paddingLeft = computed ? parseFloat(computed.paddingLeft) || 0 : 0;
    const paddingRight = computed ? parseFloat(computed.paddingRight) || 0 : 0;
    const contentLeft = parentRect.left + paddingLeft;
    const contentRight = parentRect.right - paddingRight;
    const offsetLeft = Math.max(0, headerRect.left - contentLeft);
    // 親コンテナのコンテンツ領域内で収まる幅に抑え込む
    const availableWidth = Math.max(0, contentRight - headerRect.left);
    const targetWidth = Math.min(headerRect.width, availableWidth || headerRect.width);
    container.style.marginLeft = `${offsetLeft}px`;
    container.style.marginRight = '0';
    container.style.width = `${targetWidth}px`;
    container.style.maxWidth = `${targetWidth}px`;
  };

  const stopGemSearchObserver = () => {
    if (!gemSearchObserver) {
      return;
    }
    gemSearchObserver.disconnect();
    gemSearchObserver = null;
  };

  const applyGemSearchSetting = () => {
    if (shouldEnableGemSearch()) {
      startGemSearchObserver();
      refreshGemSearch();
      if (!resizeListenerAttached) {
        window.addEventListener('resize', syncSearchLayout);
        resizeListenerAttached = true;
      }
    } else {
      stopGemSearchObserver();
      removeSearchBar();
      if (resizeListenerAttached) {
        window.removeEventListener('resize', syncSearchLayout);
        resizeListenerAttached = false;
      }
    }
  };

  const handleGlobalKeydown = (event) => {
    if (!shouldEnableGemSearch() || !isGemManagerPage()) {
      return;
    }
    if (!event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
      return;
    }
    if (event.key.toLowerCase() !== 'k') {
      return;
    }
    const input = document.getElementById(SEARCH_INPUT_ID);
    if (!input) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    input.focus();
    input.select();
  };

  document.addEventListener('keydown', handleGlobalKeydown, true);

  if (!chrome?.storage?.sync) {
    applyGemSearchSetting();
    return;
  }

  chrome.storage.sync.get(DEFAULTS, (items) => {
    settings = {
      enableGemini: Boolean(items.enableGemini),
      enableGemManagerSearch: Boolean(items.enableGemManagerSearch)
    };
    applyGemSearchSetting();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') {
      return;
    }
    if (changes.enableGemini) {
      settings.enableGemini = Boolean(changes.enableGemini.newValue);
    }
    if (changes.enableGemManagerSearch) {
      settings.enableGemManagerSearch = Boolean(changes.enableGemManagerSearch.newValue);
    }
    applyGemSearchSetting();
  });
})();
