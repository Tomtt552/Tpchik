// Isolated preload for embedded music services. The page itself never receives Node access.
const { ipcRenderer } = require('electron');
const { createFX } = require('./fx.js');
let context;
let effects;
let settings = { eq: [0, 0, 0], room: 'off', wet: 30, orb: 'off', crush: 0, vinyl: 0, speed: 1 };

function attachMedia() {
  if (!context) return;
  document.querySelectorAll('video,audio').forEach(media => {
    if (!media.__fusionFxConnected) {
      // Do not route a cross-origin stream without explicit CORS opt-in: Web Audio would mute it.
      try { if (media.currentSrc && new URL(media.currentSrc, location.href).origin !== location.origin && !media.crossOrigin) return; } catch { return; }
      try { effects.hook(media); media.__fusionFxConnected = true; }
      catch (error) { /* Some protected streams cannot be routed through Web Audio. Leave native playback intact. */ }
    }
    try { media.playbackRate = Number(settings.speed) || 1; } catch {}
  });
}
function applySettings(next) {
  settings = { ...settings, ...(next || {}) };
  if (!context) {
    try { context = new AudioContext(); effects = createFX(context); }
    catch { return; }
  }
  attachMedia();
  try { effects.set(settings); } catch {}
  if (context.state === 'suspended') context.resume().catch(() => {});
}

ipcRenderer.on('fx', (_event, next) => applySettings(next));
const observer = new MutationObserver(() => attachMedia());
if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
else document.addEventListener('DOMContentLoaded', () => observer.observe(document.documentElement, { childList: true, subtree: true }), { once: true });
setInterval(attachMedia, 2500);
