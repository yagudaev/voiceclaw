Pod::Spec.new do |s|
  s.name           = 'ExpoVapi'
  s.version        = '1.0.0'
  s.summary        = 'Expo module bridging Vapi Swift SDK for voice AI calls'
  s.description    = 'Provides React Native access to Vapi voice AI assistant calls via native Swift SDK'
  s.author         = 'VoiceClaw'
  s.homepage       = 'https://github.com/yagudaev/voiceclaw'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'FRAMEWORK_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/Frameworks/Daily.xcframework/ios-arm64" "$(PODS_TARGET_SRCROOT)/Frameworks/Daily.xcframework/ios-arm64_x86_64-simulator"',
    'SWIFT_INCLUDE_PATHS' => '"$(PODS_TARGET_SRCROOT)/Frameworks/Daily.xcframework/ios-arm64/Daily.framework/Modules" "$(PODS_TARGET_SRCROOT)/Frameworks/Daily.xcframework/ios-arm64_x86_64-simulator/Daily.framework/Modules"',
  }

  s.source_files = "*.swift", "Vapi/**/*.swift"
  s.vendored_frameworks = "Frameworks/Daily.xcframework"
  s.resources = "*.wav"
  s.exclude_files = "Frameworks/**/*.h", "Frameworks/**/*.modulemap"
end
