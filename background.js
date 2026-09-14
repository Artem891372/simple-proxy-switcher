chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['proxySettings', 'whitelist', 'blacklist', 'enabled'], (data) => {
    if (!data.proxySettings) {
      chrome.storage.sync.set({
        proxySettings: { host: '', port: '', username: '', password: '', type: 'http' },
        whitelist: [],
        blacklist: [],
        enabled: false
      });
    }
  });
});

let authListener = null; // Для хранения слушателя авторизации

function setProxy(settings, enabled, whitelist, blacklist) {
  // Очищаем предыдущий слушатель авторизации
  if (authListener && chrome.webRequest && chrome.webRequest.onAuthRequired) {
    chrome.webRequest.onAuthRequired.removeListener(authListener);
    authListener = null;
  }

  // Очищаем настройки прокси, если расширение выключено или хост/порт не указаны
  if (!enabled || !settings.host || !settings.port) {
    chrome.proxy.settings.clear({ scope: 'regular' }, () => {
      console.log('Proxy settings cleared');
    });
    return;
  }

  // Определяем режим: черный список или белый список
  const isBlacklistMode = blacklist && blacklist.length > 0;
  const isWhitelistMode = !isBlacklistMode && whitelist && whitelist.length > 0;

  let config;
  if (isBlacklistMode) {
    // Черный список: прокси только для доменов из черного списка
    config = {
      mode: 'fixed_servers',
      rules: {
        proxyForHttp: {
          scheme: settings.type,
          host: settings.host,
          port: parseInt(settings.port)
        },
        proxyForHttps: {
          scheme: settings.type,
          host: settings.host,
          port: parseInt(settings.port)
        },
        bypassList: [] // Прокси применяется ко всем, но авторизация ограничивает домены
      }
    };
  } else if (isWhitelistMode) {
    // Белый список: прокси для всех, кроме доменов из белого списка
    config = {
      mode: 'fixed_servers',
      rules: {
        proxyForHttp: {
          scheme: settings.type,
          host: settings.host,
          port: parseInt(settings.port)
        },
        proxyForHttps: {
          scheme: settings.type,
          host: settings.host,
          port: parseInt(settings.port)
        },
        bypassList: whitelist
      }
    };
  } else {
    // Ни черный, ни белый список не указаны: отключаем прокси
    chrome.proxy.settings.clear({ scope: 'regular' }, () => {
      console.log('Proxy settings cleared');
    });
    return;
  }

  chrome.proxy.settings.set(
    { value: config, scope: 'regular' },
    () => console.log('Proxy set:', config)
  );

  // Настраиваем авторизацию, если указаны username и password
  if (settings.username && settings.password && chrome.webRequest && chrome.webRequest.onAuthRequired) {
    authListener = (details, callback) => {
      const url = new URL(details.url);
      if (isBlacklistMode) {
        // В режиме черного списка авторизация только для доменов из черного списка
        const isBlacklisted = blacklist.some(pattern => url.hostname.includes(pattern.replace('*.', '')));
        if (isBlacklisted) {
          callback({
            authCredentials: {
              username: settings.username,
              password: settings.password
            }
          });
        } else {
          callback({});
        }
      } else if (isWhitelistMode) {
        // В режиме белого списка авторизация для всех, кроме доменов из белого списка
        const isWhitelisted = whitelist.some(pattern => url.hostname.includes(pattern.replace('*.', '')));
        if (!isWhitelisted) {
          callback({
            authCredentials: {
              username: settings.username,
              password: settings.password
            }
          });
        } else {
          callback({});
        }
      } else {
        callback({});
      }
    };
    chrome.webRequest.onAuthRequired.addListener(
      authListener,
      { urls: ['<all_urls>'] },
      ['asyncBlocking']
    );
  }
}

function updateDeclarativeNetRequestRules(blacklist, whitelist, enabled) {
  const rules = [];

  if (enabled && blacklist && blacklist.length > 0) {
    // В режиме черного списка создаём правила только для него
    blacklist.forEach((domain, index) => {
      rules.push({
        id: index + 1,
        priority: 1,
        action: { type: 'allow' },
        condition: {
          domains: [domain],
          resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest']
        }
      });
    });
  }

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: Array.from({ length: 100 }, (_, i) => i + 1), // Удаляем старые правила
    addRules: rules
  }, () => console.log('Declarative Net Request rules updated:', rules));
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.proxySettings || changes.enabled || changes.whitelist || changes.blacklist) {
    chrome.storage.sync.get(['proxySettings', 'enabled', 'whitelist', 'blacklist'], (data) => {
      setProxy(data.proxySettings, data.enabled, data.whitelist, data.blacklist);
      updateDeclarativeNetRequestRules(data.blacklist, data.whitelist, data.enabled);
    });
  }
});

// Инициализация правил при запуске
chrome.storage.sync.get(['proxySettings', 'enabled', 'whitelist', 'blacklist'], (data) => {
  setProxy(data.proxySettings, data.enabled, data.whitelist, data.blacklist);
  updateDeclarativeNetRequestRules(data.blacklist, data.whitelist, data.enabled);
});