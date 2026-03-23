require 'json'

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
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"

  # Add Vapi Swift SDK via SPM
  spm_dependency(s,
    url: 'https://github.com/VapiAI/ios',
    requirement: { kind: 'branch', branch: 'main' },
    products: ['Vapi']
  )
end
