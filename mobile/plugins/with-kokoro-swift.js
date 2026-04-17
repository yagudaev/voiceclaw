/**
 * Expo config plugin that integrates the KokoroSwift on-device TTS package into
 * the iOS Xcode project during prebuild.
 *
 * KokoroSwift and its dependency MisakiSwift are patched forks of upstream packages
 * that require:
 *   - mlx-swift pinned to 0.30.6 (0.30.2 has undefined symbol errors with Xcode 26,
 *     0.31.x has consteval C++ errors)
 *   - Resources moved to Sources/<Target>/Resources/ so .process("Resources") works
 *   - MisakiSwift referenced as a local path dependency instead of a remote URL
 *
 * This plugin:
 *   1. Clones the upstream repos into ios/LocalPackages/ (if not already present)
 *   2. Overwrites Package.swift with our patched versions from native-packages/
 *   3. Copies the package Resources into Sources/<Target>/Resources/ for SPM bundling
 *   4. Adds KokoroSwift as an XCLocalSwiftPackageReference to the Xcode project
 *   5. Patches the Podfile post_install hook so ExpoCustomPipeline can import KokoroSwift
 *      via #if canImport(KokoroSwift) by adding PackageFrameworks to its search paths
 *
 * Source repos:
 *   - kokoro-ios: https://github.com/mlalma/kokoro-ios (tag 1.0.11)
 *   - MisakiSwift: https://github.com/mlalma/MisakiSwift (tag 1.0.6)
 */
const { withDangerousMod } = require('expo/config-plugins')
const xcode = require('xcode')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')

// Fixed UUIDs so the plugin is idempotent across successive expo prebuild runs
const KOKORO_PKG_REF_UUID = '537A5415B5E84E3AA4E7F9B2'
const KOKORO_PRODUCT_DEP_UUID = '42251F5B356C440BB08B5070'
const KOKORO_BUILD_FILE_UUID = 'CB07DF55B1234E0BB71AFA78'
const KOKORO_EMBED_BUILD_FILE_UUID = '7F7A2C4B4E514E67A0D4C1E2'
const KOKORO_EMBED_PHASE_UUID = '19B6A8F0D9B4496B8E8D4321'

// Upstream repos and tags to clone
const KOKORO_IOS_REPO = 'https://github.com/mlalma/kokoro-ios'
const KOKORO_IOS_TAG = '1.0.11'
const MISAKI_SWIFT_REPO = 'https://github.com/mlalma/MisakiSwift'
const MISAKI_SWIFT_TAG = '1.0.6'
const KOKORO_MIN_IOS_VERSION = '18.0'

function withKokoroSwift(config) {
  // Step 1: patch the Podfile
  config = withKokoroPodfile(config)
  // Step 2: patch the Xcode project
  config = withKokoroPbxproj(config)
  return config
}

// --- Podfile patch ---

function withKokoroPodfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const platformRoot = config.modRequest.platformProjectRoot
      const podfilePath = path.join(platformRoot, 'Podfile')
      const podfilePropertiesPath = path.join(platformRoot, 'Podfile.properties.json')

      if (!fs.existsSync(podfilePath)) {
        console.warn('[with-kokoro-swift] Podfile not found, skipping Podfile patch')
        return config
      }

      ensurePodfileDeploymentTarget(podfilePropertiesPath)

      let podfile = fs.readFileSync(podfilePath, 'utf8')

      if (
        podfile.includes("target.name == 'ExpoCustomPipeline'") &&
        podfile.includes('PackageFrameworks') &&
        podfile.includes('SWIFT_ENABLE_EXPLICIT_MODULES') &&
        podfile.includes('React-Core-prebuilt/React.xcframework')
      ) {
        console.log('[with-kokoro-swift] Podfile already patched, skipping')
        return config
      }

      // Ruby code to inject into the post_install block
      const injection = `
    # Xcode 26: disable Explicitly Built Modules for all pod targets.
    # Mixed C/Swift pods (expo-sqlite) fail because the auto-generated
    # Clang module doesn't expose C functions to Swift with this on.
    #
    # Also add _NumericsShims module map path to ALL pod targets.
    # swift-numerics is an SPM dependency (from kokoro-ios) whose C target
    # _NumericsShims has a module.modulemap that must be discoverable by
    # any pod that compiles Swift, otherwise the Swift compiler errors with
    # "missing required module '_NumericsShims'".
    # PODS_BUILD_DIR resolves to <DerivedData>/<Project>/Build/Products,
    # so SourcePackages sits two directories up at <DerivedData>/<Project>/SourcePackages.
    spm_checkouts = "${'${'}PODS_BUILD_DIR}/../../SourcePackages/checkouts"
    numerics_shims_include = "#{spm_checkouts}/swift-numerics/Sources/_NumericsShims/include"
    numerics_shims_modulemap = "#{numerics_shims_include}/module.modulemap"
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'

        # Ensure every pod can resolve the _NumericsShims C module.
        # The module.modulemap must be explicitly referenced via
        # -fmodule-map-file so the Clang importer inside swiftc can
        # find the _NumericsShims module during implicit module resolution.
        other_swift = config.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)'
        unless other_swift.include?('_NumericsShims/include/module.modulemap')
          other_swift = "#{other_swift} -Xcc -fmodule-map-file=\\"#{numerics_shims_modulemap}\\" -Xcc -I\\"#{numerics_shims_include}\\""
          config.build_settings['OTHER_SWIFT_FLAGS'] = other_swift
        end

        header_paths = config.build_settings['HEADER_SEARCH_PATHS'] || '$(inherited)'
        unless header_paths.include?('swift-numerics/Sources/_NumericsShims/include')
          config.build_settings['HEADER_SEARCH_PATHS'] = "#{header_paths} \\"#{numerics_shims_include}\\""
        end
      end
    end
    installer.pods_project.build_configurations.each do |config|
      config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
    end

    # React Native 0.83 prebuilt React.framework ships its umbrella header at
    # Headers/React_Core/React_Core-umbrella.h with #import "React/X.h" style
    # references, while the headers themselves live under Headers/React_Core/.
    # Symlink React -> React_Core inside the framework and the Pods header
    # mirror so the umbrella header resolves under Xcode 26's stricter
    # implicit module lookup.
    pods_root = installer.sandbox.root.to_s
    react_xcframework = "#{pods_root}/React-Core-prebuilt/React.xcframework"
    if Dir.exist?(react_xcframework)
      Dir.glob("#{react_xcframework}/**/React.framework/Headers").each do |headers_dir|
        link_target = File.join(headers_dir, 'React')
        if Dir.exist?(File.join(headers_dir, 'React_Core')) && !File.exist?(link_target) && !File.symlink?(link_target)
          File.symlink('React_Core', link_target)
        end
      end
      shared_headers = "#{react_xcframework}/Headers"
      if Dir.exist?("#{shared_headers}/React_Core") && !File.exist?("#{shared_headers}/React") && !File.symlink?("#{shared_headers}/React")
        File.symlink('React_Core', "#{shared_headers}/React")
      end
    end
    ['Public', 'Private'].each do |scope|
      mirror = "#{pods_root}/Headers/#{scope}/React-Core-prebuilt"
      link_target = "#{mirror}/React"
      if Dir.exist?("#{mirror}/React_Core") && !File.exist?(link_target) && !File.symlink?(link_target)
        File.symlink('React_Core', link_target)
      end
    end

    # Make KokoroSwift (SPM package linked to VoiceClaw app target) importable
    # from the ExpoCustomPipeline pod target. The compiled Swift module ends up
    # in $(BUILD_DIR)/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME), while the
    # linked framework lives in PackageFrameworks.
    installer.pods_project.targets.each do |target|
      if target.name == 'ExpoCustomPipeline'
        target.build_configurations.each do |config|
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${KOKORO_MIN_IOS_VERSION}'

          framework_paths = config.build_settings['FRAMEWORK_SEARCH_PATHS'] || '$(inherited)'
          unless framework_paths.include?('PackageFrameworks')
            framework_paths = "#{framework_paths} \\"${'${'}PODS_CONFIGURATION_BUILD_DIR}/PackageFrameworks\\""
          end
          unless framework_paths.include?('$(PODS_BUILD_DIR)/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)')
            framework_paths = "#{framework_paths} \\"${'${'}PODS_BUILD_DIR}/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)\\""
          end
          config.build_settings['FRAMEWORK_SEARCH_PATHS'] = framework_paths

          header_paths = config.build_settings['HEADER_SEARCH_PATHS'] || '$(inherited)'
          unless header_paths.include?('swift-numerics/Sources/_NumericsShims/include')
            header_paths = "#{header_paths} \\"#{spm_checkouts}/swift-numerics/Sources/_NumericsShims/include\\""
          end
          unless header_paths.include?('mlx-swift/Source/Cmlx/include')
            header_paths = "#{header_paths} \\"#{spm_checkouts}/mlx-swift/Source/Cmlx/include\\""
          end
          config.build_settings['HEADER_SEARCH_PATHS'] = header_paths

          swift_include_paths = config.build_settings['SWIFT_INCLUDE_PATHS'] || '$(inherited)'
          unless swift_include_paths.include?('PackageFrameworks')
            swift_include_paths = "#{swift_include_paths} \\"${'${'}PODS_CONFIGURATION_BUILD_DIR}/PackageFrameworks\\""
          end
          unless swift_include_paths.include?('$(PODS_BUILD_DIR)/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)')
            swift_include_paths = "#{swift_include_paths} \\"${'${'}PODS_BUILD_DIR}/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)\\""
          end
          config.build_settings['SWIFT_INCLUDE_PATHS'] = swift_include_paths

          other_swift_flags = config.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)'
          unless other_swift_flags.include?('PackageFrameworks') && other_swift_flags.include?('$(PODS_BUILD_DIR)/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)')
            other_swift_flags = "#{other_swift_flags} -F \\"${'${'}PODS_CONFIGURATION_BUILD_DIR}/PackageFrameworks\\" -I \\"${'${'}PODS_BUILD_DIR}/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)\\""
          end
          unless other_swift_flags.include?('swift-numerics/Sources/_NumericsShims/include')
            other_swift_flags = "#{other_swift_flags} -Xcc -I\\"#{spm_checkouts}/swift-numerics/Sources/_NumericsShims/include\\""
          end
          unless other_swift_flags.include?('mlx-swift/Source/Cmlx/include')
            other_swift_flags = "#{other_swift_flags} -Xcc -I\\"#{spm_checkouts}/mlx-swift/Source/Cmlx/include\\""
          end
          config.build_settings['OTHER_SWIFT_FLAGS'] = other_swift_flags
        end
      end
    end`

      // Find the post_install block's closing `end` by locating the block and
      // finding the matching end. We insert our code just before the `end` line
      // that closes the post_install block.
      const postInstallRegex = /( *post_install do \|installer\|)([\s\S]*?)(\n *end\n)/
      const match = podfile.match(postInstallRegex)
      if (match) {
        // Insert our code before the closing `end` of the post_install block
        const insertPoint = match.index + match[1].length + match[2].length
        podfile = podfile.slice(0, insertPoint) + injection + '\n' + podfile.slice(insertPoint)
      } else {
        // No post_install block — append one before the final `end` (target block close)
        const lastEndIdx = podfile.lastIndexOf('\nend')
        if (lastEndIdx !== -1) {
          podfile = podfile.slice(0, lastEndIdx) +
            `\n\n  post_install do |installer|\n${injection}\n  end` +
            podfile.slice(lastEndIdx)
        } else {
          podfile += `\n\npost_install do |installer|\n${injection}\nend\n`
        }
      }

      fs.writeFileSync(podfilePath, podfile)
      console.log('[with-kokoro-swift] Patched Podfile with KokoroSwift module search paths')

      return config
    },
  ])
}

// --- Xcode project patch ---

function withKokoroPbxproj(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const appRoot = config.modRequest.projectRoot
      const platformRoot = config.modRequest.platformProjectRoot
      const pbxprojPath = path.join(
        platformRoot,
        'VoiceClaw.xcodeproj',
        'project.pbxproj'
      )

      if (!fs.existsSync(pbxprojPath)) {
        console.warn('[with-kokoro-swift] project.pbxproj not found, skipping')
        return config
      }

      // Step A: ensure LocalPackages exist
      setupLocalPackages(appRoot, platformRoot)

      // Step B: patch the Xcode project
      patchPbxproj(pbxprojPath)

      return config
    },
  ])
}

function setupLocalPackages(appRoot, platformRoot) {
  const localPackagesDir = path.join(platformRoot, 'LocalPackages')
  if (!fs.existsSync(localPackagesDir)) {
    fs.mkdirSync(localPackagesDir, { recursive: true })
  }

  const kokoroDir = path.join(localPackagesDir, 'kokoro-ios')
  const misakiDir = path.join(localPackagesDir, 'MisakiSwift')

  // Clone kokoro-ios if not present
  if (!fs.existsSync(kokoroDir)) {
    console.log(`[with-kokoro-swift] Cloning kokoro-ios ${KOKORO_IOS_TAG}...`)
    execSync(
      `git clone --depth 1 --branch ${KOKORO_IOS_TAG} ${KOKORO_IOS_REPO} "${kokoroDir}"`,
      { stdio: 'inherit' }
    )
  } else {
    console.log('[with-kokoro-swift] kokoro-ios already present, skipping clone')
  }

  // Clone MisakiSwift if not present
  if (!fs.existsSync(misakiDir)) {
    console.log(`[with-kokoro-swift] Cloning MisakiSwift ${MISAKI_SWIFT_TAG}...`)
    execSync(
      `git clone --depth 1 --branch ${MISAKI_SWIFT_TAG} ${MISAKI_SWIFT_REPO} "${misakiDir}"`,
      { stdio: 'inherit' }
    )
  } else {
    console.log('[with-kokoro-swift] MisakiSwift already present, skipping clone')
  }

  const nativePackagesDir = path.join(appRoot, 'native-packages')

  // Overwrite Package.swift files with our patched versions
  fs.copyFileSync(
    path.join(nativePackagesDir, 'kokoro-ios', 'Package.swift'),
    path.join(kokoroDir, 'Package.swift')
  )
  console.log('[with-kokoro-swift] Applied patched Package.swift to kokoro-ios')

  fs.copyFileSync(
    path.join(nativePackagesDir, 'MisakiSwift', 'Package.swift'),
    path.join(misakiDir, 'Package.swift')
  )
  console.log('[with-kokoro-swift] Applied patched Package.swift to MisakiSwift')

  const kokoroSourceOverrides = path.join(nativePackagesDir, 'kokoro-ios', 'Sources')
  if (fs.existsSync(kokoroSourceOverrides)) {
    copyDirectoryContents(kokoroSourceOverrides, path.join(kokoroDir, 'Sources'))
    console.log('[with-kokoro-swift] Applied Kokoro source overrides')
  }

  // Copy kokoro-ios Resources into Sources/KokoroSwift/Resources/ for .process("Resources")
  const kokoroSrcResDir = path.join(kokoroDir, 'Sources', 'KokoroSwift', 'Resources')
  if (!fs.existsSync(kokoroSrcResDir)) {
    fs.mkdirSync(kokoroSrcResDir, { recursive: true })
  }
  const kokoroResDir = path.join(kokoroDir, 'Resources')
  if (fs.existsSync(kokoroResDir)) {
    for (const file of fs.readdirSync(kokoroResDir)) {
      fs.copyFileSync(
        path.join(kokoroResDir, file),
        path.join(kokoroSrcResDir, file)
      )
    }
    console.log('[with-kokoro-swift] Copied kokoro-ios Resources into Sources/KokoroSwift/Resources/')
  } else {
    // Fall back to native-packages copy of config.json
    const fallbackConfig = path.join(nativePackagesDir, 'kokoro-ios', 'Resources', 'config.json')
    if (fs.existsSync(fallbackConfig)) {
      fs.copyFileSync(fallbackConfig, path.join(kokoroSrcResDir, 'config.json'))
      console.log('[with-kokoro-swift] Copied config.json from native-packages fallback')
    }
  }

  // Copy MisakiSwift Resources into Sources/MisakiSwift/Resources/ for .process("Resources")
  const misakiSrcResDir = path.join(misakiDir, 'Sources', 'MisakiSwift', 'Resources')
  if (!fs.existsSync(misakiSrcResDir)) {
    fs.mkdirSync(misakiSrcResDir, { recursive: true })
  }
  const misakiResDir = path.join(misakiDir, 'Resources')
  if (fs.existsSync(misakiResDir)) {
    for (const file of fs.readdirSync(misakiResDir)) {
      fs.copyFileSync(
        path.join(misakiResDir, file),
        path.join(misakiSrcResDir, file)
      )
    }
    console.log('[with-kokoro-swift] Copied MisakiSwift Resources into Sources/MisakiSwift/Resources/')
  }
}

function patchPbxproj(pbxprojPath) {
  const project = xcode.project(pbxprojPath)
  project.parseSync()

  const pbxBuildFile = ensureSection(project, 'PBXBuildFile')
  const localPkgRefs = ensureSection(project, 'XCLocalSwiftPackageReference')
  const productDeps = ensureSection(project, 'XCSwiftPackageProductDependency')

  // 1. Add XCLocalSwiftPackageReference
  let hasLocalPackageRef = false
  for (const key of Object.keys(localPkgRefs)) {
    if (typeof localPkgRefs[key] === 'object' && localPkgRefs[key].relativePath === 'LocalPackages/kokoro-ios') {
      hasLocalPackageRef = true
      break
    }
  }
  if (!hasLocalPackageRef) {
    localPkgRefs[KOKORO_PKG_REF_UUID] = {
      isa: 'XCLocalSwiftPackageReference',
      relativePath: 'LocalPackages/kokoro-ios',
    }
    localPkgRefs[KOKORO_PKG_REF_UUID + '_comment'] =
      'XCLocalSwiftPackageReference "kokoro-ios"'
    console.log('[with-kokoro-swift] Added kokoro-ios local package reference')
  }

  // 2. Add XCSwiftPackageProductDependency
  if (!productDeps[KOKORO_PRODUCT_DEP_UUID]) {
    productDeps[KOKORO_PRODUCT_DEP_UUID] = {
      isa: 'XCSwiftPackageProductDependency',
      package: KOKORO_PKG_REF_UUID,
      package_comment: 'XCLocalSwiftPackageReference "kokoro-ios"',
      productName: 'KokoroSwift',
    }
    productDeps[KOKORO_PRODUCT_DEP_UUID + '_comment'] = 'KokoroSwift'
    console.log('[with-kokoro-swift] Added KokoroSwift package product dependency')
  }

  // 3. Add PBXBuildFile for KokoroSwift in Frameworks
  if (!pbxBuildFile[KOKORO_BUILD_FILE_UUID]) {
    pbxBuildFile[KOKORO_BUILD_FILE_UUID] = {
      isa: 'PBXBuildFile',
      productRef: KOKORO_PRODUCT_DEP_UUID,
      productRef_comment: 'KokoroSwift',
    }
    pbxBuildFile[KOKORO_BUILD_FILE_UUID + '_comment'] = 'KokoroSwift in Frameworks'
    console.log('[with-kokoro-swift] Added KokoroSwift frameworks build file')
  }

  // 4. Add KokoroSwift to the main app target's Frameworks build phase
  const frameworksBuildPhase = findFrameworksBuildPhase(project)
  if (frameworksBuildPhase) {
    ensureBuildPhaseFile(
      frameworksBuildPhase,
      KOKORO_BUILD_FILE_UUID,
      'KokoroSwift in Frameworks'
    )
  } else {
    console.warn('[with-kokoro-swift] Could not find Frameworks build phase for VoiceClaw target')
  }

  // 5. Add packageProductDependencies to the VoiceClaw native target
  const mainTarget = findMainTarget(project)
  const mainTargetUuid = findMainTargetUuid(project)
  if (mainTarget) {
    if (!mainTarget.packageProductDependencies) {
      mainTarget.packageProductDependencies = []
    }
    ensureBuildPhaseFile(
      mainTarget,
      KOKORO_PRODUCT_DEP_UUID,
      'KokoroSwift',
      'packageProductDependencies'
    )
  } else {
    console.warn('[with-kokoro-swift] Could not find VoiceClaw native target')
  }

  // 6. Add packageReferences to the PBXProject
  const projectSection = project.hash.project.objects['PBXProject']
  const projectObj = projectSection[project.getFirstProject().uuid]
  if (!projectObj.packageReferences) {
    projectObj.packageReferences = []
  }
  ensureBuildPhaseFile(
    projectObj,
    KOKORO_PKG_REF_UUID,
    'XCLocalSwiftPackageReference "kokoro-ios"',
    'packageReferences'
  )

  // 7. Ensure KokoroSwift is embedded into the app bundle.
  if (mainTargetUuid) {
    const embedFrameworksPhase = ensureEmbedFrameworksPhase(project, mainTargetUuid)
    if (!pbxBuildFile[KOKORO_EMBED_BUILD_FILE_UUID]) {
      pbxBuildFile[KOKORO_EMBED_BUILD_FILE_UUID] = {
        isa: 'PBXBuildFile',
        productRef: KOKORO_PRODUCT_DEP_UUID,
        productRef_comment: 'KokoroSwift',
        settings: {
          ATTRIBUTES: ['CodeSignOnCopy', 'RemoveHeadersOnCopy'],
        },
      }
      pbxBuildFile[KOKORO_EMBED_BUILD_FILE_UUID + '_comment'] = 'KokoroSwift in Embed Frameworks'
      console.log('[with-kokoro-swift] Added KokoroSwift embed build file')
    }
    ensureBuildPhaseFile(
      embedFrameworksPhase,
      KOKORO_EMBED_BUILD_FILE_UUID,
      'KokoroSwift in Embed Frameworks'
    )
  }

  // 8. Ensure CODE_SIGNING_ALLOWED = YES on VoiceClaw target build configurations
  //    (required when SPM packages with resource bundles are linked)
  ensureCodeSigningAllowed(project, mainTarget)
  ensureDeploymentTarget(project, mainTarget, KOKORO_MIN_IOS_VERSION)
  ensureProjectDeploymentTarget(project, KOKORO_MIN_IOS_VERSION)

  // Write the updated project file
  fs.writeFileSync(pbxprojPath, project.writeSync())
  console.log('[with-kokoro-swift] Wrote updated project.pbxproj')
}

// --- Helper Functions ---

function findMainTarget(project) {
  const targets = project.hash.project.objects['PBXNativeTarget']
  for (const key of Object.keys(targets)) {
    if (typeof targets[key] === 'object' && targets[key].name === 'VoiceClaw') {
      return targets[key]
    }
  }
  return null
}

function findMainTargetUuid(project) {
  const targets = project.hash.project.objects['PBXNativeTarget']
  for (const key of Object.keys(targets)) {
    if (typeof targets[key] === 'object' && targets[key].name === 'VoiceClaw') {
      return key
    }
  }
  return null
}

function findFrameworksBuildPhase(project) {
  const mainTargetUuid = findMainTargetUuid(project)
  if (!mainTargetUuid) return null

  const mainTarget = project.hash.project.objects['PBXNativeTarget'][mainTargetUuid]
  const buildPhases = project.hash.project.objects['PBXFrameworksBuildPhase']

  for (const phaseRef of mainTarget.buildPhases) {
    const phaseUuid = phaseRef.value || phaseRef
    if (buildPhases[phaseUuid]) {
      return buildPhases[phaseUuid]
    }
  }
  return null
}

function ensureEmbedFrameworksPhase(project, mainTargetUuid) {
  const existing = project.pbxEmbedFrameworksBuildPhaseObj(mainTargetUuid)
  if (existing) {
    return existing
  }

  const phases = ensureSection(project, 'PBXCopyFilesBuildPhase')
  phases[KOKORO_EMBED_PHASE_UUID] = {
    isa: 'PBXCopyFilesBuildPhase',
    buildActionMask: 2147483647,
    dstPath: '""',
    dstSubfolderSpec: 10,
    files: [],
    name: '"Embed Frameworks"',
    runOnlyForDeploymentPostprocessing: 0,
  }
  phases[KOKORO_EMBED_PHASE_UUID + '_comment'] = 'Embed Frameworks'

  const mainTarget = project.hash.project.objects['PBXNativeTarget'][mainTargetUuid]
  if (mainTarget && Array.isArray(mainTarget.buildPhases)) {
    ensureBuildPhaseFile(
      mainTarget,
      KOKORO_EMBED_PHASE_UUID,
      'Embed Frameworks',
      'buildPhases'
    )
  }

  console.log('[with-kokoro-swift] Added Embed Frameworks build phase')
  return phases[KOKORO_EMBED_PHASE_UUID]
}

function ensureBuildPhaseFile(parent, value, comment, key = 'files') {
  if (!Array.isArray(parent[key])) {
    parent[key] = []
  }

  const alreadyPresent = parent[key].some((entry) => {
    if (!entry) return false
    if (typeof entry === 'string') return entry === value
    return entry.value === value
  })

  if (!alreadyPresent) {
    parent[key].push({ value, comment })
    console.log(`[with-kokoro-swift] Added ${comment} to ${key}`)
  }
}

function ensureSection(project, sectionName) {
  if (!project.hash.project.objects[sectionName]) {
    project.hash.project.objects[sectionName] = {}
  }
  return project.hash.project.objects[sectionName]
}

function ensureCodeSigningAllowed(project, mainTarget) {
  if (!mainTarget) return
  const configListUuid = mainTarget.buildConfigurationList
  const configList = project.hash.project.objects['XCConfigurationList'][configListUuid]
  const buildConfigs = project.hash.project.objects['XCBuildConfiguration']

  for (const configRef of configList.buildConfigurations) {
    const configUuid = configRef.value || configRef
    const config = buildConfigs[configUuid]
    if (config && config.buildSettings) {
      if (!config.buildSettings['CODE_SIGNING_ALLOWED']) {
        config.buildSettings['CODE_SIGNING_ALLOWED'] = 'YES'
        console.log(`[with-kokoro-swift] Set CODE_SIGNING_ALLOWED = YES on ${config.name} config`)
      }
    }
  }
}

function copyDirectoryContents(sourceDir, destinationDir) {
  if (!fs.existsSync(sourceDir)) return

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name)
    const destinationPath = path.join(destinationDir, entry.name)

    if (entry.isDirectory()) {
      fs.mkdirSync(destinationPath, { recursive: true })
      copyDirectoryContents(sourcePath, destinationPath)
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true })
      fs.copyFileSync(sourcePath, destinationPath)
    }
  }
}

function ensurePodfileDeploymentTarget(podfilePropertiesPath) {
  let properties = {}

  if (fs.existsSync(podfilePropertiesPath)) {
    try {
      properties = JSON.parse(fs.readFileSync(podfilePropertiesPath, 'utf8'))
    } catch (error) {
      console.warn(`[with-kokoro-swift] Failed to parse Podfile.properties.json: ${error}`)
    }
  }

  if (properties['ios.deploymentTarget'] !== KOKORO_MIN_IOS_VERSION) {
    properties['ios.deploymentTarget'] = KOKORO_MIN_IOS_VERSION
    fs.writeFileSync(podfilePropertiesPath, `${JSON.stringify(properties, null, 2)}\n`)
    console.log(`[with-kokoro-swift] Set ios.deploymentTarget = ${KOKORO_MIN_IOS_VERSION} in Podfile.properties.json`)
  }
}

function ensureDeploymentTarget(project, mainTarget, version) {
  if (!mainTarget) return

  const configListUuid = mainTarget.buildConfigurationList
  const configList = project.hash.project.objects['XCConfigurationList'][configListUuid]
  const buildConfigs = project.hash.project.objects['XCBuildConfiguration']

  for (const configRef of configList.buildConfigurations) {
    const configUuid = configRef.value || configRef
    const config = buildConfigs[configUuid]
    if (!config || !config.buildSettings) continue

    if (config.buildSettings['IPHONEOS_DEPLOYMENT_TARGET'] !== version) {
      config.buildSettings['IPHONEOS_DEPLOYMENT_TARGET'] = version
      console.log(`[with-kokoro-swift] Set VoiceClaw target deployment target to ${version} on ${config.name} config`)
    }
  }
}

function ensureProjectDeploymentTarget(project, version) {
  const projectSection = project.hash.project.objects['PBXProject']
  const projectObj = projectSection[project.getFirstProject().uuid]
  const configListUuid = projectObj.buildConfigurationList
  const configList = project.hash.project.objects['XCConfigurationList'][configListUuid]
  const buildConfigs = project.hash.project.objects['XCBuildConfiguration']

  for (const configRef of configList.buildConfigurations) {
    const configUuid = configRef.value || configRef
    const config = buildConfigs[configUuid]
    if (!config || !config.buildSettings) continue

    if (config.buildSettings['IPHONEOS_DEPLOYMENT_TARGET'] !== version) {
      config.buildSettings['IPHONEOS_DEPLOYMENT_TARGET'] = version
      console.log(`[with-kokoro-swift] Set project deployment target to ${version} on ${config.name} config`)
    }
  }
}

module.exports = withKokoroSwift
