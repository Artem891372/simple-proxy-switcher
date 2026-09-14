chrome.runtime.sendMessage({ type: 'checkProxy' }, (response) => {
  console.log('Content script response:', response);
});