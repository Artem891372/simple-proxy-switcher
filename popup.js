document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('proxyToggle');
  const openOptionsButton = document.getElementById('openOptionsButton');
  
  chrome.storage.sync.get('enabled', (data) => {
    toggle.checked = data.enabled || false;
  });

  toggle.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: toggle.checked });
  });

  openOptionsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});