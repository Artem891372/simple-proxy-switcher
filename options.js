document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['proxySettings', 'whitelist', 'blacklist'], (data) => {
    const settings = data.proxySettings || {};
    document.getElementById('host').value = settings.host || '';
    document.getElementById('port').value = settings.port || '';
    document.getElementById('type').value = settings.type || 'http';
    document.getElementById('username').value = settings.username || '';
    document.getElementById('password').value = settings.password || '';
    document.getElementById('whitelist').value = (data.whitelist || []).join('\n');
    document.getElementById('blacklist').value = (data.blacklist || []).join('\n');
  });

  document.getElementById('saveButton').addEventListener('click', () => {
    const proxySettings = {
      host: document.getElementById('host').value,
      port: document.getElementById('port').value,
      type: document.getElementById('type').value,
      username: document.getElementById('username').value,
      password: document.getElementById('password').value
    };

    const whitelist = document.getElementById('whitelist').value
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const blacklist = document.getElementById('blacklist').value
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Проверяем, что черный и белый списки не заполнены одновременно
    if (whitelist.length > 0 && blacklist.length > 0) {
      alert('Ошибка: Нельзя использовать черный и белый списки одновременно. Выберите только один.');
      return;
    }

    chrome.storage.sync.set({
      proxySettings,
      whitelist,
      blacklist
    }, () => {
      alert('Настройки сохранены!');
    });
  });
});