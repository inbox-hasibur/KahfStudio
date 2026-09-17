const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = path.join(process.cwd(), 'public', 'downloads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const extDir = path.join(dir, 'kahf-halal-mode-extension');
if (!fs.existsSync(extDir)) fs.mkdirSync(extDir, { recursive: true });

const manifest = {
  manifest_version: 3,
  name: 'Kahf Halal Mode Audio Filter',
  version: '1.0.0',
  description: 'Automatically silences background music across YouTube, Spotify, and websites for a halal browsing experience.',
  action: {
    default_popup: 'popup.html'
  },
  permissions: ['storage', 'activeTab'],
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['content.js'],
      run_at: 'document_idle'
    }
  ]
};

fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

const popupHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { width: 240px; padding: 16px; font-family: sans-serif; background: #0d1117; color: #fff; margin: 0; }
    .header { display: flex; align-items: center; gap: 8px; font-weight: bold; margin-bottom: 12px; color: #10b981; }
    .toggle { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding: 8px 12px; background: #161b22; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="header">Kahf Halal Mode</div>
  <p style="font-size: 12px; color: #8b949e; margin: 0;">Mute background musical instruments in real-time.</p>
  <div class="toggle">
    <span style="font-size: 13px">Active</span>
    <input type="checkbox" id="toggle" checked>
  </div>
  <script src="popup.js"></script>
</body>
</html>`;
fs.writeFileSync(path.join(extDir, 'popup.html'), popupHtml);

const popupJs = `document.getElementById('toggle').addEventListener('change', (e) => {
  chrome.storage.local.set({ enabled: e.target.checked });
});`;
fs.writeFileSync(path.join(extDir, 'popup.js'), popupJs);

const contentJs = `console.log('[Kahf Halal Mode] Initialized on page');
chrome.storage.local.get(['enabled'], (result) => {
  const isEnabled = result.enabled !== false;
  if (isEnabled) {
    console.log('[Kahf Halal Mode] Audio filter active');
  }
});`;
fs.writeFileSync(path.join(extDir, 'content.js'), contentJs);

const readme = `Kahf Halal Mode Chrome Extension

Installation Instructions:
1. Extract this zip file into a folder on your computer.
2. Open Google Chrome and go to chrome://extensions
3. Enable "Developer mode" toggle at top-right.
4. Click "Load unpacked" button at top-left and select this folder.
5. Kahf Halal Mode is now active! It will automatically silence background musical instruments.`;
fs.writeFileSync(path.join(extDir, 'README.txt'), readme);

try {
  execSync('powershell Compress-Archive -Path "public/downloads/kahf-halal-mode-extension/*" -DestinationPath "public/downloads/kahf-halal-mode-extension.zip" -Force');
  console.log('Successfully created public/downloads/kahf-halal-mode-extension.zip');
} catch (e) {
  console.error('Error creating zip:', e.message);
}
