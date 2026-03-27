Pod::Spec.new do |s|
  s.name           = 'ExpoCustomPipeline'
  s.version        = '1.0.0'
  s.summary        = 'Expo module for custom voice pipeline with STT/TTS provider protocols'
  s.description    = 'Provides React Native access to a custom voice pipeline that orchestrates STT, LLM, and TTS on-device'
  s.author         = 'VoiceClaw'
  s.homepage       = 'https://github.com/yagudaev/voiceclaw'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "*.swift", "Pipeline/**/*.swift"
end
