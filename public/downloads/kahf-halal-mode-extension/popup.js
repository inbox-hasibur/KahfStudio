document.getElementById('toggle').addEventListener('change', (e) => {
  chrome.storage.local.set({ enabled: e.target.checked });
});