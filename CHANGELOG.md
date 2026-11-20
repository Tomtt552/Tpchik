# Fusion Desktop — Changelog

## 0.13.1 — PC Monitor history and NVIDIA discovery
- Added rolling 60-sample CPU, RAM and GPU utilization mini-graphs to PC Monitor Pro.
- Added NVIDIA `nvidia-smi.exe` discovery through PATH and common Windows driver installation folders; GPU metrics remain unavailable rather than fabricated when the utility is absent.
- Kept the 4-second telemetry refresh and the existing Windows Media Session, VLESS and wallpaper integrations.
- Windows 10/11 hardware validation and installer build are still required.


## 0.10.0 — Windows Media Session integration
- Added a Windows 10/11 Global System Media Transport Controls (GSMTC) bridge through the native Windows Runtime API.
- Dynamic Island can now receive the active Windows media session's title, artist, album, playback state, elapsed position, duration and thumbnail artwork (when the source app publishes it).
- Previous, play/pause and next commands from Dynamic Island and hardware media keys are sent to the active Windows media session; Fusion's own player remains the fallback when no Windows session is active.
- Session metadata is polled by the main process and forwarded directly to Dynamic Island; renderer updates do not overwrite an active Windows session.
- The integration is opt-in-free and does not record or stream audio. The existing loopback spectrum remains independent.
- Real-device verification is still required on Windows 10/11: app support depends on whether the music app publishes a GSMTC session and thumbnail.


## 0.8.0 — Windows system audio monitor and usability
- Added opt-in Windows desktop-loopback audio capture for a live level/spectrum visualizer. Captured audio is analyzed locally and is not played back or recorded.
- Dynamic Island now displays the system-audio spectrum while other apps produce sound, even when Fusion's own player is idle.
- Added Dynamic Island click-through mode so the island can stop intercepting mouse clicks; toggle with Ctrl+Alt+I.
- Added sing-box config validation before starting VLESS, preventing invalid profiles from opening the local proxy listener.
- Extended the ad-domain filter to Telegram and VK embedded sessions. This is not a universal ad blocker; third-party services can still serve ads from other domains.
- Track titles/artists from arbitrary Windows apps are not yet guaranteed: the monitor detects sound activity, while metadata requires Windows media-session integration.

## 0.7.0 — Hub, wallpapers and VLESS proxy

- Added native wallpaper picker with persistent image, GIF and video backgrounds (PNG/JPG/WebP/GIF/MP4/WebM/M4V).
- Added Telegram and VK messenger destinations to the collapsible left-side categories.
- Added VLESS / Reality / TLS profile launch through a user-selected `sing-box.exe`.
- VLESS starts a local mixed proxy on `127.0.0.1:2080` and applies it to Fusion's Electron sessions only; it does not change the Windows-wide network route.
- Added a basic ad-domain filter for embedded service sessions; third-party websites may still serve ads from unlisted domains.
- Fixed wallpaper picker bridge mismatch.
- Dynamic Island system-wide audio loopback and metadata from arbitrary Windows applications remain a separate unfinished integration; current island sync is based on Fusion playback/media sessions.

# Fusion Desktop — Changelog

## 0.6.1 — UI, EQ and Dynamic Island fixes
- Fixed the 10-band EQ signal chain: all ten filters now process audio in sequence (previously only the first three were connected).
- Reworked the settings panel into a right-edge slide-out drawer with hover reveal, an edge handle, and a close button.
- Improved embedded-player metadata polling and playback-state synchronization with Dynamic Island.
- Added artwork forwarding to Dynamic Island when an embedded service exposes an Open Graph image.
- Routed Dynamic Island play/next/previous actions to the active embedded player where matching controls are available.
- Disabled GitHub Release publishing in CI; the workflow now builds the installer and uploads it as an Actions artifact without requiring `GH_TOKEN`.
- No advertising SDKs, banners, or ad placements are included in Fusion itself. Third-party music websites may still display their own ads.

# Changelog

## 0.3.0 — Windows integration & hardening
- Added Windows media-key shortcuts for play/pause, previous and next.
- Added Chromium Media Session metadata and transport action handlers.
- Restricted webview navigation to HTTPS music-service domains.
- Disabled webview pop-up windows; external HTTPS links open in the system browser.
- Added sender validation for main-window and Dynamic Island IPC messages.
- Kept Node integration disabled for embedded remote pages.

## 0.2.0 — Fusion 2.0 foundation
- Added movable, always-on-top Dynamic Island as a separate Electron window.
- Added compact/expanded states, playback controls, progress and source display.
- Added persisted island position and persisted audio settings/volume.
- Added preload IPC bridges with context isolation.
- Reworked the Web Audio graph and corrected disabled-effects state handling.
- Added Windows NSIS installer configuration.
- Documented CORS/DRM limitations for processing embedded streaming audio.

## 0.4.0 — Fusion Core foundation
- Добавлены режимы перемешивания очереди и повтора: весь список / один трек.
- Добавлены горячие клавиши: Space — воспроизведение/пауза, Alt+←/→ — предыдущий/следующий трек, Ctrl+O — добавить аудиофайлы.
- Улучшена логика перехода по очереди: перемешивание формирует новый порядок без повторения текущего трека в начале цикла.
- Сохранены решения 2.0: Premium Dark, Universal Music Center, Windows 10/11, Custom Dynamic Island, максимальный набор аудиоэффектов.


## 0.5.0 — Fusion Core foundation
- Added persistent local music library: imported audio is copied into the application's user-data folder and remains available after restart.
- Added library search, Favorites, listening History, and user-created playlists.
- Added secure main-process audio import handlers exposed through a restricted preload bridge.
- Preserved existing playback controls, Dynamic Island, global media keys, and sound effects.
- Local library metadata, playlists, favorites, history, and player settings persist between launches.


## 0.6.0 — Fusion Ultimate
- 10-band equalizer (31 Hz–16 kHz), with migration of existing 3-band settings.
- Dynamic Island anchors: top center, top left, top right, bottom center, and draggable Custom.
- Six premium accent themes with persistent selection.
- One-click EQ reset; existing playback, library, playlists and effects retained.


## 0.7.0 — Universal Hub (work in progress)
- Added custom image, GIF, and video wallpaper picker with persistent selection.
- Added grouped left navigation for Music and Messengers.
- Added Telegram Web and VK Messenger tabs.
- Added VLESS profile import field and local profile persistence.
- Removed no ad SDKs or ad placements; the app source contains no ad integration.
- VLESS connection engine and Windows-wide system audio loopback are not included in this build yet; the UI explicitly marks these as pending instead of pretending they are connected.


## 0.9.0 — Dual-mode VLESS VPN

- Added three VLESS connection scopes: Fusion-only local proxy, full Windows routing through sing-box TUN, and per-process split routing.
- Split mode accepts comma-separated Windows process names such as `chrome.exe, telegram.exe`; only matching processes are routed to VLESS and other processes use direct routing.
- Added process detection for sing-box split routing and validation of process-name format.
- Full Windows and split modes require administrator privileges so sing-box can create the TUN interface and configure routes.
- Updated the VPN settings UI and Windows installer artifact name to 0.9.0.

**Not yet implemented in 0.9.0:** Windows Media Session integration for external music players. The current system-audio visualizer is not the same as Windows Media Session metadata/control.


## Fusion Desktop 0.11.0 — Fusion AI Foundation
- Added a dedicated Fusion AI panel in the settings drawer.
- Added an offline local command assistant for music playback, track navigation, volume, VPN panel access/disconnect, wallpaper settings, Dynamic Island and basic app diagnostics.
- Added quick action chips and a chat-style interaction surface.
- The assistant is explicitly a local command layer in this release; it is not yet connected to a hosted or local LLM and does not claim unrestricted natural-language reasoning.
- Existing Music Session, VLESS and wallpaper functionality is retained.

NEXT DEVELOPMENT MILESTONES
- PC Monitor: native CPU/RAM/GPU telemetry and history graphs.
- Music Center Pro + Dynamic Island 2.0: richer session state, artwork handling and visualizer modes.
- Wallpaper Studio: collections, saved themes, scheduling and per-display behavior.
- VPN Manager Pro: connection diagnostics, latency checks, profile management and safer recovery.
- Fusion AI: optional LLM provider integration, voice input/output and permission-gated actions.


## 0.12.0 — Fusion Desktop Pro · Stage 1
- Added PC Monitor panel with live CPU load, CPU model/core counts, RAM usage, GPU model and Windows uptime.
- Added NVIDIA GPU load, VRAM and temperature readings through `nvidia-smi` when available.
- Added optional CPU temperature sensor lookup; unsupported readings are explicitly reported as unavailable.
- Added a restricted IPC telemetry bridge and PowerShell collector; the renderer has no direct system-command access.
- Consolidated the existing Music Center, Windows Media Session, Dynamic Island, GIF/video wallpaper picker, VLESS modes and Fusion AI command foundation into the first combined Pro milestone.

Known limitations for this milestone:
- Validate Windows Media Session, TUN routing and telemetry on a physical Windows 10/11 machine.
- Wallpaper collection management/scheduling and richer VPN diagnostics remain follow-up work within Stage 1.
- Fusion AI is still a local command assistant; connected LLM and voice features are planned for Stage 2.
