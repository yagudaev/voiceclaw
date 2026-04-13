Pod::Spec.new do |s|
  s.name           = 'ExpoRealtimeAudio'
  s.version        = '1.0.0'
  s.summary        = 'Expo module for realtime STS audio streaming'
  s.description    = 'Captures microphone audio and plays back PCM16 audio for speech-to-speech relay sessions'
  s.author         = 'VoiceClaw'
  s.homepage       = 'https://github.com/yagudaev/voiceclaw'
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "*.swift"
end
