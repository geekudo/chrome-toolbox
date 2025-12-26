const defaults = {
  enableChatGPT: true,
  enableGemini: true,
  enableGemManagerSearch: true,
  enableGoogleChat: true
};

const elements = {
  enableChatGPT: document.getElementById('enableChatGPT'),
  enableGemini: document.getElementById('enableGemini'),
  enableGemManagerSearch: document.getElementById('enableGemManagerSearch'),
  enableGoogleChat: document.getElementById('enableGoogleChat')
};

const setCheckboxes = (settings) => {
  for (const [key, element] of Object.entries(elements)) {
    if (!element) {
      continue;
    }
    element.checked = Boolean(settings[key]);
  }
};

const registerHandlers = () => {
  for (const [key, element] of Object.entries(elements)) {
    if (!element) {
      continue;
    }
    element.addEventListener('change', () => {
      chrome.storage.sync.set({ [key]: element.checked });
    });
  }
};

const init = () => {
  if (!chrome?.storage?.sync) {
    return;
  }

  chrome.storage.sync.get(defaults, (settings) => {
    setCheckboxes(settings);
  });

  registerHandlers();
};

init();
