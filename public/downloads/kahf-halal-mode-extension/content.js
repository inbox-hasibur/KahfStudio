console.log('[Kahf Halal Mode] Initialized on page');
chrome.storage.local.get(['enabled'], (result) => {
  const isEnabled = result.enabled !== false;
  if (isEnabled) {
    console.log('[Kahf Halal Mode] Audio filter active');
  }
});