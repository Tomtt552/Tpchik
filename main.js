const { app, BrowserWindow, ipcMain, screen, globalShortcut, shell, dialog, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
let mainWindow;
let islandWindow;
let singBoxProcess = null;
let singBoxPath = '';
let islandClickThrough = false;
let lastTrackState = { title: 'Ничего не играет', artist: 'Fusion Desktop', playing: false, currentTime: 0, duration: 0, source: 'Локальная музыка' };
let windowsMediaActive = false;
let windowsMediaPollTimer = null;
let windowsMediaPollBusy = false;

const SERVICE_HOSTS = [
  'youtube.com', 'youtube-nocookie.com', 'googlevideo.com',
  'soundcloud.com', 'sndcdn.com', 'yandex.ru', 'yandex.net',
  'vk.com', 'userapi.com', 'vkuseraudio.net', 'telegram.org', 't.me'
];
function isTrustedServiceURL(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && SERVICE_HOSTS.some(host => u.hostname === host || u.hostname.endsWith(`.${host}`));
  } catch { return false; }
}
function installBasicAdFilter(ses) {
  const blockedHosts = ['doubleclick.net', 'googlesyndication.com', 'adservice.google.com', 'adnxs.com', 'taboola.com', 'outbrain.com', 'popads.net', 'exoclick.com'];
  ses.webRequest.onBeforeRequest((details, callback) => {
    let blocked = false;
    try { const host = new URL(details.url).hostname.toLowerCase(); blocked = blockedHosts.some(domain => host === domain || host.endsWith(`.${domain}`)); } catch {}
    callback({ cancel: blocked });
  });
}
function isMainSender(event) {
  return !!mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents;
}
function isIslandSender(event) {
  return !!islandWindow && !islandWindow.isDestroyed() && event.sender === islandWindow.webContents;
}

function getPcTelemetry() {
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve({ supported: false, error: 'PC Monitor пока поддерживает Windows 10/11.' });
    const script = path.join(__dirname, 'pc-monitor.ps1');
    const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script], { windowsHide: true });
    let stdout = '', settled = false;
    const finish = value => { if (settled) return; settled = true; resolve(value); };
    const timeout = setTimeout(() => { try { child.kill(); } catch {} finish({ supported: false, error: 'Превышено время ожидания системной телеметрии.' }); }, 8000);
    child.stdout.on('data', chunk => { stdout += chunk.toString(); if (stdout.length > 65536) { try { child.kill(); } catch {} finish({ supported: false, error: 'Слишком большой ответ PowerShell.' }); } });
    child.on('error', () => { clearTimeout(timeout); finish({ supported: false, error: 'Не удалось запустить PowerShell.' }); });
    child.on('close', () => {
      clearTimeout(timeout);
      try { finish(JSON.parse(stdout.trim().split(/\r?\n/).filter(Boolean).pop())); }
      catch { finish({ supported: false, error: 'Не удалось прочитать системные показатели.' }); }
    });
  });
}

ipcMain.handle('fusion:pc-telemetry', event => {
  if (!isMainSender(event)) return { supported: false, error: 'Недоверенный вызов.' };
  return getPcTelemetry();
});

function runWindowsMediaSession(action = 'poll') {
  return new Promise(resolve => {
    if (process.platform !== 'win32') return resolve(null);
    const script = path.join(__dirname, 'windows-media-session.ps1');
    const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Action', action], { windowsHide: true });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); if (stdout.length > 65536) child.kill(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); if (stderr.length > 8192) child.kill(); });
    child.on('error', () => resolve(null));
    child.on('close', () => {
      try { resolve(JSON.parse(stdout.trim().split(/\r?\n/).filter(Boolean).pop())); }
      catch { resolve(null); }
    });
  });
}
async function pollWindowsMediaSession() {
  if (windowsMediaPollBusy || process.platform !== 'win32' || app.isQuitting) return;
  windowsMediaPollBusy = true;
  try {
    const media = await runWindowsMediaSession('poll');
    if (media?.available) {
      windowsMediaActive = true;
      lastTrackState = {
        title: String(media.title || 'Неизвестный трек').slice(0, 180),
        artist: [media.artist, media.album].filter(Boolean).join(' · ').slice(0, 120) || 'Windows Media Session',
        playing: Boolean(media.playing),
        currentTime: Math.max(0, Number(media.currentTime) || 0),
        duration: Math.max(0, Number(media.duration) || 0),
        source: String(media.source || 'Windows Media Session').slice(0, 80),
        art: typeof media.art === 'string' && /^data:image\/(png|jpeg|webp);base64,/i.test(media.art) ? media.art.slice(0, 2800000) : '',
        album: String(media.album || '').slice(0, 160), level: lastTrackState.level || 0, spectrum: lastTrackState.spectrum || []
      };
      if (islandWindow && !islandWindow.isDestroyed()) islandWindow.webContents.send('fusion:island-state', lastTrackState);
    } else if (windowsMediaActive) {
      windowsMediaActive = false;
      lastTrackState = { title: 'Ничего не играет', artist: 'Windows Media Session', playing: false, currentTime: 0, duration: 0, source: 'Windows Media Session', art: '', level: 0, spectrum: [] };
      if (islandWindow && !islandWindow.isDestroyed()) islandWindow.webContents.send('fusion:island-state', lastTrackState);
    }
  } finally { windowsMediaPollBusy = false; }
}
async function sendMediaCommand(action) {
  if (windowsMediaActive && ['toggle-play', 'next', 'previous'].includes(action)) {
    await runWindowsMediaSession(action);
    setTimeout(pollWindowsMediaSession, 250);
    return true;
  }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('fusion:island-action', action);
  return false;
}


function audioLibraryDir() {
  const dir = path.join(app.getPath('userData'), 'music-library');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function importAudioPaths(paths) {
  const dir = audioLibraryDir();
  const allowed = new Set(['.mp3','.wav','.flac','.m4a','.aac','.ogg','.opus','.wma','.aiff','.aif']);
  const imported = [];
  for (const raw of (Array.isArray(paths) ? paths : []).slice(0, 500)) {
    if (typeof raw !== 'string') continue;
    try {
      const source = path.resolve(raw);
      const ext = path.extname(source).toLowerCase();
      if (!allowed.has(ext) || !fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
      const base = path.basename(source, ext).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100) || 'Track';
      let target = path.join(dir, `${base}${ext}`), n = 1;
      while (fs.existsSync(target)) { target = path.join(dir, `${base} (${n++})${ext}`); }
      fs.copyFileSync(source, target);
      imported.push({ name: path.basename(target, ext), path: target, url: pathToFileURL(target).href, size: fs.statSync(target).size });
    } catch {}
  }
  return imported;
}

const WALLPAPER_EXT = new Set(['.png','.jpg','.jpeg','.webp','.gif','.mp4','.webm']);
ipcMain.handle('fusion:choose-wallpaper', async event => {
  if (!isMainSender(event)) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выбрать обои Fusion', properties: ['openFile'],
    filters: [{ name: 'Изображения и видео', extensions: ['png','jpg','jpeg','webp','gif','mp4','webm'] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const source = result.filePaths[0];
  const ext = path.extname(source).toLowerCase();
  if (!WALLPAPER_EXT.has(ext)) return null;
  const dir = path.join(app.getPath('userData'), 'wallpapers');
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `wallpaper${ext}`);
  fs.copyFileSync(source, target);
  return { url: pathToFileURL(target).href, type: ['.mp4','.webm'].includes(ext) ? 'video' : 'image', name: path.basename(source) };
});

ipcMain.handle('fusion:import-audio', async event => {
  if (!isMainSender(event)) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Добавить музыку в Fusion', properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Аудиофайлы', extensions: ['mp3','wav','flac','m4a','aac','ogg','opus','wma','aiff','aif'] }]
  });
  return result.canceled ? [] : importAudioPaths(result.filePaths);
});
ipcMain.handle('fusion:import-paths', (event, paths) => {
  if (!isMainSender(event)) return [];
  return importAudioPaths(paths);
});

// User-selected wallpaper files are copied into the app's private data folder.
function wallpaperDir() { const dir = path.join(app.getPath('userData'), 'wallpapers'); fs.mkdirSync(dir, { recursive: true }); return dir; }
ipcMain.handle('fusion:select-wallpaper', async event => {
  if (!isMainSender(event)) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выбрать обои Fusion', properties: ['openFile'],
    filters: [{ name: 'Изображения и видео', extensions: ['png','jpg','jpeg','webp','gif','mp4','webm','m4v'] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const source = result.filePaths[0];
  const ext = path.extname(source).toLowerCase();
  const allowed = new Set(['.png','.jpg','.jpeg','.webp','.gif','.mp4','.webm','.m4v']);
  if (!allowed.has(ext)) return null;
  const target = path.join(wallpaperDir(), `wallpaper-${Date.now()}${ext}`);
  fs.copyFileSync(source, target);
  return { url: pathToFileURL(target).href, type: ['.mp4','.webm','.m4v'].includes(ext) ? 'video' : 'image', name: path.basename(source) };
});


// Windows desktop loopback source. The renderer captures only audio; the tiny video
// track required by Chromium's desktop-capture constraints is immediately stopped.
ipcMain.handle('fusion:get-system-audio-source', async event => {
  if (!isMainSender(event)) return null;
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 }, fetchWindowIcons: false });
    const primary = screen.getPrimaryDisplay();
    const preferred = sources.find(source => String(source.name).toLowerCase().includes('screen')) || sources[0];
    return preferred ? { id: preferred.id, name: preferred.name || `Экран ${primary.id}` } : null;
  } catch { return null; }
});

ipcMain.on('fusion:island-clickthrough', (event, enabled) => {
  if (!isIslandSender(event)) return;
  islandClickThrough = Boolean(enabled);
  if (islandWindow && !islandWindow.isDestroyed()) {
    islandWindow.setIgnoreMouseEvents(islandClickThrough, { forward: true });
    islandWindow.webContents.send('fusion:island-clickthrough-state', islandClickThrough);
  }
});

function parseVlessLink(raw) {
  const u = new URL(String(raw || '').trim());
  if (u.protocol !== 'vless:' || !u.username || !u.hostname || !u.port) throw new Error('Неверная ссылка VLESS');
  const q = u.searchParams;
  const security = q.get('security') || 'none';
  const network = q.get('type') || 'tcp';
  const outbound = { type: 'vless', tag: 'proxy', server: u.hostname, server_port: Number(u.port), uuid: decodeURIComponent(u.username) };
  const flow = q.get('flow'); if (flow) outbound.flow = flow;
  if (security === 'tls' || security === 'reality') {
    outbound.tls = { enabled: true, server_name: q.get('sni') || q.get('serverName') || u.hostname };
    const fp = q.get('fp'); if (fp) outbound.tls.utls = { enabled: true, fingerprint: fp };
    if (security === 'reality') {
      const publicKey = q.get('pbk') || q.get('publicKey');
      if (!publicKey) throw new Error('В ссылке Reality отсутствует pbk (public key)');
      outbound.tls.reality = { enabled: true, public_key: publicKey, short_id: q.get('sid') || '' };
    }
  }
  if (network === 'ws') outbound.transport = { type: 'ws', path: q.get('path') || '/', headers: q.get('host') ? { Host: q.get('host') } : {} };
  else if (network === 'grpc') outbound.transport = { type: 'grpc', service_name: q.get('serviceName') || q.get('service_name') || '' };
  else if (!['tcp','raw'].includes(network)) throw new Error(`Тип транспорта ${network} пока не поддерживается`);
  return { name: decodeURIComponent(u.hash.slice(1)) || u.hostname, outbound };
}
async function chooseSingBox(event) {
  if (!isMainSender(event)) return null;
  const result = await dialog.showOpenDialog(mainWindow, { title: 'Выбрать sing-box.exe', properties: ['openFile'], filters: [{ name: 'Приложение Windows', extensions: ['exe'] }] });
  if (result.canceled || !result.filePaths[0]) return null;
  singBoxPath = result.filePaths[0];
  fs.writeFileSync(path.join(app.getPath('userData'), 'sing-box-path.json'), JSON.stringify({ path: singBoxPath }));
  return path.basename(singBoxPath);
}
function clearElectronProxy() {
  const { session } = require('electron');
  const partitions = ['default', 'yt', 'ytm', 'sc', 'ya', 'vk', 'tg', 'vkmsg'];
  return Promise.all(partitions.map(p => (p === 'default' ? session.defaultSession : session.fromPartition(`persist:${p}`)).setProxy({ mode: 'direct' }).catch(() => {})));
}
async function applyElectronProxy() {
  const { session } = require('electron');
  const partitions = ['default', 'yt', 'ytm', 'sc', 'ya', 'vk', 'tg', 'vkmsg'];
  await Promise.all(partitions.map(p => (p === 'default' ? session.defaultSession : session.fromPartition(`persist:${p}`)).setProxy({ proxyRules: 'http://127.0.0.1:2080', proxyBypassRules: '<local>' })));
}
ipcMain.handle('fusion:choose-singbox', event => chooseSingBox(event));
ipcMain.handle('fusion:start-vless', async (event, raw, options = {}) => {
  if (!isMainSender(event)) return { ok: false, error: 'Недоверенный вызов' };
  try {
    if (singBoxProcess) return { ok: true, running: true, name: 'VLESS' };
    if (!singBoxPath) { try { singBoxPath = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'sing-box-path.json'), 'utf8')).path || ''; } catch {} }
    if (!singBoxPath || !fs.existsSync(singBoxPath)) return { ok: false, error: 'Сначала выбери sing-box.exe' };
    const parsed = parseVlessLink(raw);
    const mode = options?.mode === 'split' ? 'split' : options?.mode === 'full' ? 'full' : 'fusion';
    let config;
    if (mode === 'fusion') {
      config = { log: { level: 'warn' }, inbounds: [{ type: 'mixed', tag: 'mixed-in', listen: '127.0.0.1', listen_port: 2080 }], outbounds: [parsed.outbound, { type: 'direct', tag: 'direct' }], route: { final: 'proxy' } };
    } else {
      const tun = { type: 'tun', tag: 'tun-in', interface_name: 'Fusion-TUN', address: ['172.19.0.1/30', 'fdfe:dcba:9876::1/126'], auto_route: true, strict_route: true, stack: 'system' };
      const route = { auto_detect_interface: true, final: mode === 'full' ? 'proxy' : 'direct', find_process: mode === 'split' };
      if (mode === 'split') {
        const names = [...new Set((Array.isArray(options.processNames) ? options.processNames : []).map(x => String(x).trim()).filter(x => /^[a-zA-Z0-9_.-]{1,80}\.exe$/i.test(x)))];
        if (!names.length) throw new Error('Для раздельного VPN укажи хотя бы один процесс, например chrome.exe');
        route.rules = [{ process_name: names, outbound: 'proxy' }];
      }
      config = { log: { level: 'warn' }, inbounds: [tun], outbounds: [parsed.outbound, { type: 'direct', tag: 'direct' }], route };
    }
    const dir = path.join(app.getPath('userData'), 'vpn'); fs.mkdirSync(dir, { recursive: true });
    const configPath = path.join(dir, `fusion-vless-${mode}.json`); fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    // Validate the generated config before opening a local proxy port.
    await new Promise((resolve, reject) => {
      const check = spawn(singBoxPath, ['check', '-c', configPath], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '';
      check.stdout.on('data', chunk => output += chunk.toString());
      check.stderr.on('data', chunk => output += chunk.toString());
      check.once('error', reject);
      check.once('exit', code => code === 0 ? resolve() : reject(new Error((output.trim() || `sing-box check завершился с кодом ${code}`).slice(0, 700))));
    });
    singBoxProcess = spawn(singBoxPath, ['run', '-c', configPath], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let launchError = '';
    singBoxProcess.stderr.on('data', chunk => { launchError += chunk.toString(); });
    const child = singBoxProcess;
    child.once('error', () => { if (singBoxProcess === child) singBoxProcess = null; });
    child.once('exit', () => { if (singBoxProcess === child) singBoxProcess = null; clearElectronProxy(); });
    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(); };
      const timer = setTimeout(() => finish(), 5000);
      child.once('error', err => finish(err));
      child.once('exit', code => finish(new Error((launchError.trim() || `sing-box завершился при запуске (код ${code}). Проверь ссылку и версию движка.`).slice(0, 700))));
    });
    if (!singBoxProcess) throw new Error('sing-box завершился при запуске. Проверь ссылку и версию движка.');
    if (mode === 'fusion') await applyElectronProxy();
    else await clearElectronProxy();
    return { ok: true, name: parsed.name, mode, proxy: mode === 'fusion' ? '127.0.0.1:2080' : 'Windows TUN' };
  } catch (err) { singBoxProcess = null; return { ok: false, error: err.message || 'Не удалось запустить VLESS' }; }
});
ipcMain.handle('fusion:stop-vless', async event => {
  if (!isMainSender(event)) return false;
  if (singBoxProcess) { try { singBoxProcess.kill(); } catch {} singBoxProcess = null; }
  await clearElectronProxy(); return true;
});

function readIslandPosition() {
  try {
    const file = path.join(app.getPath('userData'), 'island-position.json');
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    const display = screen.getDisplayMatching({ x: Number(saved.x) || 0, y: Number(saved.y) || 0, width: 360, height: 74 });
    const area = display.workArea;
    if (saved.anchor && saved.anchor !== 'custom') return islandAnchorPosition(saved.anchor, area);
    return {
      x: Math.max(area.x, Math.min(Number(saved.x) || area.x, area.x + area.width - 360)),
      y: Math.max(area.y, Math.min(Number(saved.y) || area.y, area.y + area.height - 74))
    };
  } catch {
    const area = screen.getPrimaryDisplay().workArea;
    return { x: Math.round(area.x + (area.width - 360) / 2), y: area.y + 18 };
  }
}


function islandAnchorPosition(anchor, area = screen.getPrimaryDisplay().workArea) {
  const w = 360, h = 74, pad = 18;
  const x = anchor === 'top-left' ? area.x + pad : anchor === 'top-right' ? area.x + area.width - w - pad : area.x + Math.round((area.width - w) / 2);
  const y = anchor === 'bottom-center' ? area.y + area.height - h - pad : area.y + pad;
  return { x, y };
}
function setIslandAnchor(anchor) {
  if (!islandWindow || islandWindow.isDestroyed()) return false;
  const allowed = new Set(['top-center', 'top-left', 'top-right', 'bottom-center', 'custom']);
  if (!allowed.has(anchor)) return false;
  const file = path.join(app.getPath('userData'), 'island-position.json');
  if (anchor === 'custom') {
    const [x, y] = islandWindow.getPosition();
    fs.writeFileSync(file, JSON.stringify({ x, y, anchor: 'custom' }));
  } else {
    const pos = islandAnchorPosition(anchor, screen.getDisplayMatching(islandWindow.getBounds()).workArea);
    islandWindow.setPosition(pos.x, pos.y);
    fs.writeFileSync(file, JSON.stringify({ ...pos, anchor }));
  }
  return true;
}

function saveIslandPosition() {
  if (!islandWindow || islandWindow.isDestroyed()) return;
  const [x, y] = islandWindow.getPosition();
  try {
    const file = path.join(app.getPath('userData'), 'island-position.json');
    let saved = {}; try { saved = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
    fs.writeFileSync(file, JSON.stringify({ x, y, anchor: saved.anchor === 'custom' ? 'custom' : (saved.anchor || 'custom') }));
  } catch {}
}

function createIsland() {
  const pos = readIslandPosition();
  islandWindow = new BrowserWindow({
    x: pos.x, y: pos.y, width: 360, height: 74,
    minWidth: 260, minHeight: 74, maxWidth: 560, maxHeight: 260,
    frame: false, transparent: true, backgroundColor: '#00000000',
    resizable: false, movable: true, alwaysOnTop: true, show: false,
    skipTaskbar: true, hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'island-preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  islandWindow.loadFile('dynamic-island.html');
  islandWindow.once('ready-to-show', () => {
    islandWindow.show();
    islandWindow.webContents.send('fusion:island-state', lastTrackState);
  });
  islandWindow.on('moved', saveIslandPosition);
  islandWindow.on('closed', () => { islandWindow = null; });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    backgroundColor: '#09090b', show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#ffffff', height: 40 },
    webPreferences: {
      preload: path.join(__dirname, 'main-preload.js'),
      webviewTag: true, contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    if (!isTrustedServiceURL(params.src || '')) { event.preventDefault(); return; }
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    // fx-preload imports a local helper module; keep Node integration disabled for the remote page.
    webPreferences.sandbox = false;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
  });
  mainWindow.webContents.on('did-attach-webview', (_event, guest) => {
    guest.setWindowOpenHandler(({ url }) => {
      if (/^https:\/\//i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    guest.on('will-navigate', (event, url) => {
      if (!isTrustedServiceURL(url)) event.preventDefault();
    });
    guest.on('will-redirect', (event, url) => {
      if (!isTrustedServiceURL(url)) event.preventDefault();
    });
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });
  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; app.quit(); });
}

ipcMain.on('fusion:now-playing', (event, state) => {
  if (!isMainSender(event) || windowsMediaActive) return;
  lastTrackState = {
    title: String(state?.title || 'Ничего не играет').slice(0, 180),
    artist: String(state?.artist || 'Fusion Desktop').slice(0, 120),
    playing: Boolean(state?.playing),
    currentTime: Math.max(0, Number(state?.currentTime) || 0),
    duration: Math.max(0, Number(state?.duration) || 0),
    source: String(state?.source || 'Fusion').slice(0, 80),
    art: typeof state?.art === 'string' && (/^https:\/\//i.test(state.art) || /^data:image\/(png|jpeg|webp);base64,/i.test(state.art)) ? state.art.slice(0, 2800000) : '',
    level: Math.max(0, Math.min(1, Number(state?.level) || 0)),
    spectrum: Array.isArray(state?.spectrum) ? state.spectrum.slice(0, 5).map(v => Math.max(0, Math.min(1, Number(v) || 0))) : []
  };
  if (islandWindow && !islandWindow.isDestroyed()) islandWindow.webContents.send('fusion:island-state', lastTrackState);
});

ipcMain.handle('fusion:island-anchor', (event, anchor) => {
  if (!isMainSender(event)) return false;
  return setIslandAnchor(String(anchor || 'custom'));
});

ipcMain.on('fusion:island-resize', (event, expanded) => {
  if (!isIslandSender(event)) return;
  if (islandWindow && !islandWindow.isDestroyed()) islandWindow.setSize(360, expanded ? 150 : 74);
});

ipcMain.on('fusion:minimize-to-island', event => { if (isMainSender(event)) mainWindow.minimize(); });

ipcMain.on('fusion:island-action', (event, action) => {
  if (!isIslandSender(event)) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (action === 'quit') { app.quit(); return; }
  if (action === 'toggle-clickthrough') { islandClickThrough = !islandClickThrough; islandWindow.setIgnoreMouseEvents(islandClickThrough, { forward: true }); islandWindow.webContents.send('fusion:island-clickthrough-state', islandClickThrough); return; }
  if (action === 'toggle-play' || action === 'next' || action === 'previous') { sendMediaCommand(action); return; }
  if (action === 'open-player') { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
});

app.whenReady().then(() => {
  try { singBoxPath = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'sing-box-path.json'), 'utf8')).path || ''; } catch {}
  ['yt', 'ytm', 'sc', 'ya', 'vk', 'tg', 'vkmsg'].forEach(partition => {
    // A consistent user agent is retained for embedded music services.
    const ses = require('electron').session.fromPartition(`persist:${partition}`);
    ses.setUserAgent(UA);
    installBasicAdFilter(ses);
  });
  createMainWindow();
  createIsland();
  if (process.platform === 'win32') { pollWindowsMediaSession(); windowsMediaPollTimer = setInterval(pollWindowsMediaSession, 1800); }
  const sendMediaAction = action => { sendMediaCommand(action); };
  globalShortcut.register('MediaPlayPause', () => sendMediaAction('toggle-play'));
  globalShortcut.register('MediaNextTrack', () => sendMediaAction('next'));
  globalShortcut.register('MediaPreviousTrack', () => sendMediaAction('previous'));
  globalShortcut.register('CommandOrControl+Alt+I', () => { islandClickThrough = !islandClickThrough; if (islandWindow && !islandWindow.isDestroyed()) { islandWindow.setIgnoreMouseEvents(islandClickThrough, { forward: true }); islandWindow.webContents.send('fusion:island-clickthrough-state', islandClickThrough); } });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) { createMainWindow(); createIsland(); } });
});

app.on('before-quit', () => { app.isQuitting = true; if (windowsMediaPollTimer) clearInterval(windowsMediaPollTimer); saveIslandPosition(); if (singBoxProcess) { try { singBoxProcess.kill(); } catch {} } globalShortcut.unregisterAll(); });
app.on('window-all-closed', () => app.quit());
