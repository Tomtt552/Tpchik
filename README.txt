FUSION DESKTOP 0.3.0

Запуск в Windows 10/11
1. Установи Node.js 20 LTS или новее: https://nodejs.org/
2. Открой терминал в папке проекта.
3. Выполни: npm install
4. Запусти: npm start

Dynamic Island
- Кнопка ◉ в нижней панели сворачивает главное окно в Windows.
- Плавающий остров остаётся поверх окон.
- Перетаскивай его мышью за верхнюю область.
- Кнопка ··· раскрывает панель; «Открыть Fusion» возвращает плеер.
- Положение острова сохраняется между запусками.
- Кнопка × завершает приложение.

Сборка установщика
npm run dist:win
Результат появится в папке dist.

Онлайн-сервисы открываются во встроенных вкладках. Для отдельных сервисов может
потребоваться авторизация или VPN в зависимости от региона и сетевых ограничений.

Примечание по аудио
Локальный плеер поддерживает Web Audio эффекты. Некоторые защищённые потоковые
потоки могут запрещать обработку через Web Audio; в таком случае сервис должен
продолжать воспроизводить звук нативно, без гарантии работы эффектов Fusion.

Новые функции 0.4.0
- ⤨ — включение/выключение перемешивания локальной очереди.
- ↻ — переключение режимов: без повтора / повтор всего списка / повтор одного трека.
- Space — воспроизведение или пауза.
- Alt + стрелка влево/вправо — предыдущий или следующий трек.
- Ctrl + O — выбор аудиофайлов.


FUSION DESKTOP 0.5.0 — FUSION CORE FOUNDATION

NEW IN THIS BUILD
- Import audio files into a persistent local library. Imported tracks are copied to the app's user-data folder, so they remain available after restart.
- Search the local collection.
- Favorites and listening history.
- Create playlists and add tracks to them.
- Existing Dynamic Island, media keys, shuffle/repeat, and sound effects remain available.

FIRST RUN
1. Install dependencies with: npm install
2. Start the app with: npm start
3. Open My Files and choose Add Music.
4. Imported files are copied into the Fusion application data directory. Keep your original music files as backups.

SUPPORTED IMPORT FORMATS
MP3, WAV, FLAC, M4A, AAC, OGG, OPUS, WMA, AIFF.


FUSION 0.6.1 — FUSION ULTIMATE
- 10-band equalizer from 31 Hz to 16 kHz; old 3-band settings migrate automatically.
- Dynamic Island position presets and Custom drag-and-drop placement.
- Six persistent accent colors and EQ reset.


Fusion Desktop 0.10.0 notes
- Custom static/GIF/video wallpapers can be selected from Appearance.
- Music and Messenger groups on the left rail expand to show service choices, including Telegram and VK.
- VLESS support requires a separately obtained sing-box.exe. Select it in Proxy / VPN, paste a VLESS URI and connect. The local proxy is applied only to Fusion's embedded web sessions on 127.0.0.1:2080; it is not a system-wide VPN tunnel.
- Basic ad-domain blocking is applied to embedded service sessions; it cannot guarantee removal of every ad served by third-party sites.
- System-wide Windows audio loopback is not yet included in this build.


FUSION DESKTOP 0.8.0 — SYSTEM AUDIO
- Open Settings > System sound > Enable monitoring to activate Windows desktop loopback audio analysis.
- The Dynamic Island spectrum reacts to system output from other apps. It does not capture song metadata from every app yet.
- In the expanded island, use 'Не мешать приложениям' to enable click-through. Ctrl+Alt+I toggles click-through globally.
- VLESS config is checked with sing-box before launch. VLESS remains scoped to Fusion embedded sessions, not the entire Windows network.


FUSION 0.9.0 — VLESS VPN MODES

The VPN panel now offers three scopes:
1) Full Windows: all traffic is routed through the VLESS outbound using sing-box TUN.
2) Selected apps: enter executable process names separated by commas (for example chrome.exe, telegram.exe). Matching processes use VLESS; other traffic is direct.
3) Fusion only: the existing local proxy at 127.0.0.1:2080 is applied to Fusion's embedded web services.

IMPORTANT: Full Windows and Selected apps modes require sing-box with TUN support and Fusion started with Run as administrator. Split routing is process-based; apps that delegate networking to another process or Windows services may not be fully covered. Test IP and DNS routing after connecting. If sing-box fails to start, disconnect and check that Windows networking has returned to normal.

Windows Media Session music integration is still a separate development task; the existing system-audio visualizer does not yet provide external player metadata/control.


FUSION DESKTOP 0.10.0 — WINDOWS MEDIA SESSION
- On Windows 10/11, Fusion reads the active Global System Media Transport Controls session (GSMTC).
- Dynamic Island displays track title, artist, album (where supplied), elapsed time, duration and album thumbnail (where supplied).
- Dynamic Island buttons and hardware media keys send play/pause, previous and next commands to the active Windows media session.
- Compatible apps must publish a Windows media session. Apps that do not expose GSMTC metadata cannot be controlled or identified through this integration.
- Windows Media Session is separate from system-audio loopback: the loopback spectrum measures output activity; GSMTC provides track metadata and transport controls.
- This build has not yet been exercised on a physical Windows 10/11 machine; verify with a supported music app after installation.


FUSION DESKTOP 0.11.0 — FUSION AI FOUNDATION
- New Fusion AI panel in the settings drawer.
- Offline commands: play/pause, next/previous, open VPN, disconnect VPN, open wallpaper settings, show Dynamic Island, open local library, set Fusion volume and show basic diagnostics.
- This first AI milestone is a local command assistant, not a connected general-purpose LLM. No chat text is sent to external services.
- Future milestones: native PC telemetry, richer music and island controls, wallpaper collections, VPN diagnostics, optional LLM and voice integration.


FUSION DESKTOP 0.13.1 — PRO STAGE 1
- Added PC Monitor panel with live CPU load, processor details, RAM usage, GPU identification and NVIDIA telemetry through nvidia-smi when available.
- PC telemetry is requested through a validated main-process IPC handler; the renderer does not execute PowerShell or access Node APIs.
- CPU temperature is optional because many Windows systems do not expose a readable ACPI thermal sensor. Unavailable values are shown as “нет данных”.
- Existing Music Center, Windows Media Session, Dynamic Island, custom GIF/video wallpapers, VLESS modes and local Fusion AI commands remain in the combined project.

PC MONITOR NOTES
- Windows 10/11 only.
- CPU and RAM data use Windows CIM/WMI.
- NVIDIA utilization, VRAM and temperature require nvidia-smi.exe (normally installed with the NVIDIA driver) available in PATH.
- Telemetry refreshes while the PC Monitor panel is open.


0.13.1 additions: PC Monitor rolling history graphs (60 samples), broader NVIDIA nvidia-smi discovery and a longer VLESS startup grace period.
