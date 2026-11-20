# Fusion Desktop 2.0 — техническое задание

## 1. Цель продукта

Fusion Desktop — универсальный музыкальный центр для Windows 10/11. Приложение объединяет локальное воспроизведение, доступ к популярным музыкальным веб-сервисам, расширенную обработку звука и отдельный плавающий Dynamic Island.

## 2. Принятые продуктовые решения

- Концепция: Universal — единая оболочка для локальной музыки и онлайн-сервисов.
- Визуальный стиль: Premium Dark — тёмная тема, полупрозрачные поверхности, аккуратные анимации.
- Аудио: Maximum — эквалайзер, пространственные эффекты, реверберация, биткрашер, виниловая текстура, управление скоростью и динамическая обработка.
- Платформа первого релиза: Windows 10/11.
- Dynamic Island: отдельное окно поверх других окон, пользователь свободно перемещает его мышью; координаты сохраняются между запусками.

## 3. Функциональные требования

### 3.1 Музыкальные источники
- Локальные аудиофайлы: импорт через диалог выбора и drag-and-drop.
- Встроенные веб-сервисы: YouTube, YouTube Music, SoundCloud, Яндекс Музыка и VK Музыка.
- Изолированные persistent-сессии для сервисов.
- Единый интерфейс управления локальным воспроизведением.
- Для онлайн-сервисов доступность и управление зависят от ограничений самих сайтов.

### 3.2 Dynamic Island
- Самостоятельное прозрачное окно Electron, независимое от основного окна.
- Поверх остальных окон Windows, без отдельной кнопки на панели задач.
- Свободное перемещение мышью за область капсулы.
- Сохранение координат и восстановление положения при следующем запуске.
- Компактное состояние: название, подпись источника, индикатор воспроизведения, предыдущий/следующий трек и Play/Pause.
- Расширенное состояние: прогресс, время, источник, кнопки открытия Fusion и сворачивания острова.
- Команда выхода из приложения.
- Связь с основным окном через ограниченный IPC API.

### 3.3 Аудиодвижок
- Web Audio граф с трёхполосным EQ.
- Реверберация с пресетами Room, Hall, Cathedral и Plate.
- Стереопанорамирование с несколькими скоростями движения.
- Биткрашер с регулируемой глубиной.
- Виниловая текстура с шумом и ограничением высоких частот.
- Компрессор/ограничение пиков на основном тракте.
- Управление скоростью воспроизведения.
- Эффекты должны иметь нейтральное состояние по умолчанию.
- Если поток нельзя безопасно подключить к Web Audio из-за CORS/DRM/ограничений сайта, воспроизведение не должно ломаться ради применения эффектов.

### 3.4 Настройки
- Сохранение EQ, реверберации, пространственного режима, биткрашера, винила и скорости в локальном хранилище приложения.
- Сохранение громкости.
- Восстановление настроек после перезапуска.

### 3.5 Безопасность
- В главном окне: contextIsolation включён, nodeIntegration выключен, sandbox включён.
- Доступ к IPC предоставляется через preload API с ограниченным набором методов.
- Dynamic Island не получает Node.js API.
- Встроенные удалённые сервисы не должны получать прямой доступ к Node.js.
- Отдельно требуется дальнейшая ревизия разрешений webview и политики открытия внешних окон.

## 4. Реализовано в текущем рабочем обновлении 0.3.0

- Добавлено отдельное окно Dynamic Island.
- Добавлено свободное перетаскивание и сохранение координат.
- Добавлены компактный и расширенный режимы.
- Добавлены кнопки Play/Pause, следующий/предыдущий трек и возврат в Fusion.
- Добавлена передача состояния текущего локального трека в остров.
- Добавлено сворачивание основного окна в остров.
- Добавлено сохранение настроек эффектов и громкости.
- Переработан граф Web Audio: EQ, реверберация, панорамирование, биткрашер, виниловый шум и компрессор.
- Исправлена логика применения настроек при выключенных эффектах.
- Добавлен скрипт сборки Windows NSIS через electron-builder.
- Добавлены системные мультимедийные клавиши Windows: Play/Pause, предыдущий и следующий трек.
- Добавлены Media Session metadata и системные действия Chromium.
- Ограничена навигация встроенных сервисов доверенными HTTPS-доменами; всплывающие окна запрещены.
- Внешние HTTPS-ссылки из музыкальных сервисов открываются в браузере Windows.
- Добавлена проверка отправителя для IPC-сообщений основного окна и Dynamic Island.

## 5. Ограничения текущей версии

- Метаданные и управление онлайн-сервисами пока не унифицированы: остров гарантированно получает состояние локального плеера, а не внутренний трек каждого сайта.
- Обработка звука веб-сервисов зависит от CORS, DRM и реализации сайта. Для потоков без безопасного CORS-доступа эффекты пропускаются, чтобы не отключать звук.
- Очередь локальных треков и временные URL пока существуют в памяти текущего сеанса.
- Не выполнена полноценная проверка запуска на Windows 10/11 и сборки установщика в реальной Windows-среде.
- Компрессор пока является базовой частью тракта, пользовательские настройки компрессии и отдельный лимитер UI ещё не добавлены.

## 6. План следующих итераций

1. Проверка запуска и поведения Dynamic Island на Windows 10/11, DPI 100–200% и нескольких мониторах.
2. Отдельные настройки и пресеты аудиоэффектов, расширенный EQ, пользовательские параметры компрессора и лимитера.
3. Единая очередь, избранное, история и постоянная медиатека.
4. Расширение Windows Media Session: обложки, позиция трека и синхронизация онлайн-сервисов.
5. Исследование безопасного получения метаданных онлайн-сервисов и ограничений управления их воспроизведением.
6. Автотесты, аудит разрешений Electron, сборка и проверка установщика.

## Реализация 0.4.0 — управление очередью
- `shuffleOn` включает случайный порядок; `shuffleBag` хранит индексы очереди без текущего трека.
- `repeatMode`: `0` — выключен, `1` — повтор списка, `2` — повтор текущего трека.
- Горячие клавиши обрабатываются на уровне окна и не перехватывают ввод в полях формы.
- Следующий шаг Core: постоянная медиатека с безопасным хранением путей/метаданных, именованные плейлисты и избранное.


## 0.5.0 — Local library and collection persistence

### Local audio import
- The renderer requests file selection through `fusionBridge.importAudio()`; the main process owns the native file dialog.
- Drag-and-drop file paths are passed to `fusionBridge.importPaths()` and validated in the main process.
- Only supported audio extensions are copied into `<userData>/music-library`.
- The main process returns file metadata and a file URL; no arbitrary filesystem API is exposed to the renderer.

### Collection model
- `fusion-library`: imported track metadata (display name, local path, playback URL, byte size).
- `fusion-playlists`: user-created playlists containing track paths.
- `fusion-favorites`: set of favorited track paths.
- `fusion-history`: most recently played track paths, newest first, capped at 100.
- `fusion-settings` and `fusion-volume`: existing audio settings and volume persistence.

### User-facing capabilities
- Search across the local library.
- Filter by all tracks, favorites, history, or a custom playlist.
- Create playlists and add a track to a selected playlist.
- Imported audio is copied rather than referenced in its original location, avoiding broken links when the original file is moved.

### Security notes
- Import IPC handlers accept requests only from the main application renderer.
- Extension checks, regular-file checks, filename sanitization, and a bounded batch size are applied before copying.
- The renderer receives only the narrow import methods through context isolation; Node integration remains disabled.


## Fusion Ultimate 0.6.0
### Audio
- Ten peaking EQ filters: 31, 62, 125, 250, 500, 1k, 2k, 4k, 8k and 16k Hz; gain -12 to +12 dB.
- Legacy three-band values migrate to low/mid/high frequency groups.
### Dynamic Island
- Position presets: top-center, top-left, top-right, bottom-center; Custom stores dragged coordinates.
- Position changes use a validated main-process IPC endpoint.
### Appearance
- Six persistent accent palettes.


## 0.8.0 — Windows system audio monitor and interaction
- Main process enumerates screen capture sources with Electron desktopCapturer and exposes only the selected source ID through a narrow preload method.
- Renderer starts Chromium desktop loopback capture on explicit user action, stops the temporary video track, and analyzes the audio track with Web Audio AnalyserNode.
- Five spectrum bands and normalized level are sent to the Dynamic Island. When no Fusion media source is active, audible system output is labelled 'Системный звук'.
- Capture is opt-in, local-only, not recorded, and not routed back to speakers. Availability depends on Windows/Electron desktop-capture support and user permissions.
- This feature detects sound activity, not arbitrary application track metadata. Windows Global System Media Transport Controls integration remains future work.
- Added click-through mode for Dynamic Island and global Ctrl+Alt+I toggle so the overlay can stop intercepting mouse clicks.
- VLESS config is validated by `sing-box check -c` before the proxy process starts. VLESS remains scoped to Fusion web sessions.


## Windows Media Session (0.10.0)

- Platform: Windows 10/11 x64.
- Provider: `GlobalSystemMediaTransportControlsSessionManager` from Windows Runtime (`Windows.Media.Control`).
- The main Electron process polls the current session every 1.8 seconds using `windows-media-session.ps1`.
- Metadata: title, artist, album, playback status, timeline position/end time, source AUMID and optional thumbnail. Thumbnail data is limited to 2 MiB before base64 forwarding.
- Commands: toggle play/pause, skip previous, skip next. Hardware media keys and Dynamic Island use the same command route.
- The active GSMTC session takes priority over Fusion's renderer-published metadata; if no Windows session is available, Fusion's own player continues to supply the island state.
- Compatibility depends on the source application publishing GSMTC metadata. Apps that do not publish a session will not appear.
- Validation: JavaScript syntax/build checks can run in CI; full WinRT behavior and thumbnail compatibility must be tested on a real Windows 10/11 system.


## PC Monitor Pro (0.12.0)

- Renderer requests telemetry only through `fusionBridge.getPcTelemetry()`.
- Main process validates the sender and runs the fixed `pc-monitor.ps1` collector on Windows.
- CPU model/load/core counts and memory usage come from CIM/WMI.
- NVIDIA GPU load, VRAM and temperature are read from `nvidia-smi` when present in PATH.
- CPU thermal-zone data is optional and may not be exposed by the motherboard/firmware.
- The panel refreshes every four seconds while open and reports unavailable sensors explicitly.
- No arbitrary command or script text is accepted from the renderer.
