param(
  [ValidateSet('poll','toggle-play','play','pause','next','previous')]
  [string]$Action = 'poll'
)
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue
  $managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
  $manager = $managerType::RequestAsync().GetAwaiter().GetResult()
  $session = $manager.GetCurrentSession()
  if ($null -eq $session) {
    $sessions = @($manager.GetSessions())
    if ($sessions.Count -gt 0) { $session = $sessions[0] }
  }
  if ($null -eq $session) {
    @{ available = $false; title = 'Ничего не играет'; artist = 'Windows Media Session'; playing = $false; currentTime = 0; duration = 0; source = 'Windows Media Session'; art = '' } | ConvertTo-Json -Compress
    exit 0
  }
  switch ($Action) {
    'toggle-play' { $null = $session.TryTogglePlayPauseAsync().GetAwaiter().GetResult() }
    'play' { $null = $session.TryPlayAsync().GetAwaiter().GetResult() }
    'pause' { $null = $session.TryPauseAsync().GetAwaiter().GetResult() }
    'next' { $null = $session.TrySkipNextAsync().GetAwaiter().GetResult() }
    'previous' { $null = $session.TrySkipPreviousAsync().GetAwaiter().GetResult() }
  }
  $media = $session.GetMediaPropertiesAsync().GetAwaiter().GetResult()
  $playback = $session.GetPlaybackInfo()
  $timeline = $session.GetTimelineProperties()
  $status = [string]$playback.PlaybackStatus
  $playing = $status -eq 'Playing'
  $position = [Math]::Max(0, $timeline.Position.Ticks / 10000000.0)
  $duration = [Math]::Max(0, $timeline.EndTime.Ticks / 10000000.0)
  $appId = [string]$session.SourceAppUserModelId
  $art = ''
  try {
    if ($null -ne $media.Thumbnail) {
      $thumbStream = $media.Thumbnail.OpenReadAsync().GetAwaiter().GetResult()
      if ($thumbStream.Size -gt 0 -and $thumbStream.Size -le 2097152) {
        $readerType = [Windows.Storage.Streams.DataReader, Windows.Storage, ContentType=WindowsRuntime]
        $reader = $readerType::new($thumbStream.GetInputStreamAt(0))
        $null = $reader.LoadAsync([uint32]$thumbStream.Size).GetAwaiter().GetResult()
        $bytes = New-Object byte[] ([int]$thumbStream.Size)
        $reader.ReadBytes($bytes)
        $art = 'data:image/jpeg;base64,' + [Convert]::ToBase64String($bytes)
        $reader.Dispose(); $thumbStream.Dispose()
      }
    }
  } catch { $art = '' }
  $result = @{
    available = $true
    title = [string]$media.Title
    artist = [string]$media.Artist
    album = [string]$media.AlbumTitle
    playing = $playing
    currentTime = $position
    duration = $duration
    source = $(if ($appId) { $appId } else { 'Windows Media Session' })
    art = $art
  }
  $result | ConvertTo-Json -Compress -Depth 3
} catch {
  @{ available = $false; error = $_.Exception.Message; title = 'Windows Media Session недоступен'; artist = ''; playing = $false; currentTime = 0; duration = 0; source = 'Windows Media Session'; art = '' } | ConvertTo-Json -Compress
  exit 1
}
