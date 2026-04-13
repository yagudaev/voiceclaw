Pod::Spec.new do |s|
  s.name           = 'ExpoCustomPipeline'
  s.version        = '1.0.0'
  s.summary        = 'Expo module for custom voice pipeline with STT/TTS provider protocols'
  s.description    = 'Provides React Native access to a custom voice pipeline that orchestrates STT, LLM, and TTS on-device'
  s.author         = 'VoiceClaw'
  s.homepage       = 'https://github.com/yagudaev/voiceclaw'
  s.platforms      = { :ios => '18.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "*.swift", "Pipeline/**/*.swift"
  s.pod_target_xcconfig = {
    'IPHONEOS_DEPLOYMENT_TARGET' => '18.0',
    'FRAMEWORK_SEARCH_PATHS' => '$(inherited) "${PODS_CONFIGURATION_BUILD_DIR}/PackageFrameworks" "${PODS_BUILD_DIR}/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)"',
    'HEADER_SEARCH_PATHS' => '$(inherited) "${PODS_BUILD_DIR}/../../SourcePackages/checkouts/swift-numerics/Sources/_NumericsShims/include" "${PODS_BUILD_DIR}/../../SourcePackages/checkouts/mlx-swift/Source/Cmlx/include"',
    'SWIFT_INCLUDE_PATHS' => '$(inherited) "${PODS_CONFIGURATION_BUILD_DIR}/ExpoModulesCore" "${PODS_CONFIGURATION_BUILD_DIR}/RCTSwiftUI" "${PODS_CONFIGURATION_BUILD_DIR}/PackageFrameworks" "${PODS_BUILD_DIR}/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)"',
    'OTHER_SWIFT_FLAGS' => '$(inherited) -F "${PODS_CONFIGURATION_BUILD_DIR}/PackageFrameworks" -I "${PODS_BUILD_DIR}/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)" -Xcc -I"${PODS_BUILD_DIR}/../../SourcePackages/checkouts/swift-numerics/Sources/_NumericsShims/include" -Xcc -I"${PODS_BUILD_DIR}/../../SourcePackages/checkouts/mlx-swift/Source/Cmlx/include"'
  }
end
