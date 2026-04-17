Pod::Spec.new do |s|
  s.name           = 'ExpoScreenCapture'
  s.version        = '1.0.0'
  s.summary        = 'Expo module for iOS screen sharing via ReplayKit'
  s.description    = 'Captures the screen at 1 FPS using ReplayKit (in-app or broadcast extension) and emits base64 JPEG frames for realtime LLM streaming'
  s.author         = 'VoiceClaw'
  s.homepage       = 'https://github.com/yagudaev/voiceclaw'
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "*.swift"
end
