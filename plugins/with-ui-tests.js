/**
 * Expo config plugin that adds an XCUITest target (VoiceClawUITests) to the
 * Xcode project during prebuild. This allows running UI tests on physical
 * devices via `xcodebuild test`.
 *
 * Test source files live in `uitests/` at the project root (outside `ios/`
 * which gets regenerated on each prebuild). The plugin copies them into
 * `ios/VoiceClawUITests/` and wires up the Xcode project.
 *
 * Steps:
 * 1. Copies test files from `uitests/` to `ios/VoiceClawUITests/`
 * 2. Creates file references for the Swift test files and Info.plist
 * 3. Creates a PBXGroup for the test files
 * 4. Adds a Sources build phase
 * 5. Creates the UI testing bundle target with Debug/Release configs
 * 6. Adds a target dependency from the test target to the main app target
 * 7. Registers the test target in the project
 */
const { withDangerousMod } = require('expo/config-plugins')
const xcode = require('xcode')
const path = require('path')
const fs = require('fs')

const UI_TEST_TARGET_NAME = 'VoiceClawUITests'
const UI_TEST_BUNDLE_ID = 'com.yagudaev.voiceclaw.uitests'

function withUITests(config) {
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
        console.warn('[with-ui-tests] project.pbxproj not found, skipping')
        return config
      }

      // Copy test files from uitests/ at project root into ios/VoiceClawUITests/
      const sourceDir = path.join(appRoot, 'uitests')
      const targetDir = path.join(platformRoot, UI_TEST_TARGET_NAME)

      if (!fs.existsSync(sourceDir)) {
        console.warn('[with-ui-tests] Source directory not found:', sourceDir)
        return config
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      const allFiles = fs.readdirSync(sourceDir)
      for (const file of allFiles) {
        fs.copyFileSync(
          path.join(sourceDir, file),
          path.join(targetDir, file)
        )
      }
      console.log(`[with-ui-tests] Copied ${allFiles.length} files to ${targetDir}`)

      // Parse the Xcode project
      const project = xcode.project(pbxprojPath)
      project.parseSync()

      // Check if target already exists (idempotent)
      const existingTargets = project.pbxNativeTargetSection()
      for (const key of Object.keys(existingTargets)) {
        if (typeof existingTargets[key] === 'object' && existingTargets[key].name === UI_TEST_TARGET_NAME) {
          console.log('[with-ui-tests] UI test target already exists, skipping')
          return config
        }
      }

      const testFiles = allFiles.filter(
        (f) => f.endsWith('.swift') || f === 'Info.plist'
      )

      if (testFiles.length === 0) {
        console.warn('[with-ui-tests] No test files found in', sourceDir)
        return config
      }

      // --- Add the UI test target ---
      const mainTargetUuid = findMainTargetUuid(project)

      // Create file references for test files
      const testGroupChildren = []
      const swiftFileRefs = []

      for (const file of testFiles) {
        const fileRef = project.generateUuid()
        const fileType = file.endsWith('.swift')
          ? 'sourcecode.swift'
          : 'text.plist.xml'

        const pbxFileRef = project.hash.project.objects['PBXFileReference']
        pbxFileRef[fileRef] = {
          isa: 'PBXFileReference',
          lastKnownFileType: fileType,
          path: file,
          sourceTree: '"<group>"',
        }
        pbxFileRef[fileRef + '_comment'] = file

        testGroupChildren.push({ value: fileRef, comment: file })

        if (file.endsWith('.swift')) {
          swiftFileRefs.push({ uuid: fileRef, basename: file })
        }
      }

      // Create PBXGroup for test files
      const testGroupUuid = project.generateUuid()
      const pbxGroup = project.hash.project.objects['PBXGroup']
      pbxGroup[testGroupUuid] = {
        isa: 'PBXGroup',
        children: testGroupChildren,
        path: UI_TEST_TARGET_NAME,
        sourceTree: '"<group>"',
      }
      pbxGroup[testGroupUuid + '_comment'] = UI_TEST_TARGET_NAME

      // Add test group to main group
      const mainGroupUuid = project.getFirstProject().firstProject.mainGroup
      if (pbxGroup[mainGroupUuid] && pbxGroup[mainGroupUuid].children) {
        pbxGroup[mainGroupUuid].children.push({
          value: testGroupUuid,
          comment: UI_TEST_TARGET_NAME,
        })
      }

      // Create Sources build phase with Swift files
      const sourcesBuildPhaseUuid = project.generateUuid()
      const buildFiles = []

      for (const ref of swiftFileRefs) {
        const buildFileUuid = project.generateUuid()
        const pbxBuildFile = project.hash.project.objects['PBXBuildFile']
        pbxBuildFile[buildFileUuid] = {
          isa: 'PBXBuildFile',
          fileRef: ref.uuid,
          fileRef_comment: ref.basename,
        }
        pbxBuildFile[buildFileUuid + '_comment'] = `${ref.basename} in Sources`
        buildFiles.push({ value: buildFileUuid, comment: `${ref.basename} in Sources` })
      }

      const pbxSourcesBuildPhase = project.hash.project.objects['PBXSourcesBuildPhase']
      pbxSourcesBuildPhase[sourcesBuildPhaseUuid] = {
        isa: 'PBXSourcesBuildPhase',
        buildActionMask: 2147483647,
        files: buildFiles,
        runOnlyForDeploymentPostprocessing: 0,
      }
      pbxSourcesBuildPhase[sourcesBuildPhaseUuid + '_comment'] = 'Sources'

      // Create product reference for the test bundle
      const productRefUuid = project.generateUuid()
      const pbxFileRef = project.hash.project.objects['PBXFileReference']
      pbxFileRef[productRefUuid] = {
        isa: 'PBXFileReference',
        explicitFileType: 'wrapper.cfbundle',
        includeInIndex: 0,
        path: `${UI_TEST_TARGET_NAME}.xctest`,
        sourceTree: 'BUILT_PRODUCTS_DIR',
      }
      pbxFileRef[productRefUuid + '_comment'] = `${UI_TEST_TARGET_NAME}.xctest`

      // Add to Products group
      const productsGroupUuid = project.getFirstProject().firstProject.productRefGroup
      if (pbxGroup[productsGroupUuid] && pbxGroup[productsGroupUuid].children) {
        pbxGroup[productsGroupUuid].children.push({
          value: productRefUuid,
          comment: `${UI_TEST_TARGET_NAME}.xctest`,
        })
      }

      // Create container item proxy (for target dependency)
      const containerItemProxyUuid = project.generateUuid()
      const pbxContainerItemProxy = project.hash.project.objects['PBXContainerItemProxy'] || {}
      project.hash.project.objects['PBXContainerItemProxy'] = pbxContainerItemProxy
      pbxContainerItemProxy[containerItemProxyUuid] = {
        isa: 'PBXContainerItemProxy',
        containerPortal: project.getFirstProject().uuid,
        containerPortal_comment: 'Project object',
        proxyType: 1,
        remoteGlobalIDString: mainTargetUuid,
        remoteInfo: 'VoiceClaw',
      }
      pbxContainerItemProxy[containerItemProxyUuid + '_comment'] = 'PBXContainerItemProxy'

      // Create target dependency
      const targetDependencyUuid = project.generateUuid()
      const pbxTargetDependency = project.hash.project.objects['PBXTargetDependency'] || {}
      project.hash.project.objects['PBXTargetDependency'] = pbxTargetDependency
      pbxTargetDependency[targetDependencyUuid] = {
        isa: 'PBXTargetDependency',
        target: mainTargetUuid,
        target_comment: 'VoiceClaw',
        targetProxy: containerItemProxyUuid,
        targetProxy_comment: 'PBXContainerItemProxy',
      }
      pbxTargetDependency[targetDependencyUuid + '_comment'] = 'PBXTargetDependency'

      // Create Debug and Release build configurations for test target
      const debugConfigUuid = project.generateUuid()
      const releaseConfigUuid = project.generateUuid()
      const configListUuid = project.generateUuid()

      const testBuildSettings = {
        CLANG_ENABLE_MODULES: 'YES',
        CODE_SIGN_STYLE: 'Automatic',
        INFOPLIST_FILE: `${UI_TEST_TARGET_NAME}/Info.plist`,
        IPHONEOS_DEPLOYMENT_TARGET: '15.1',
        LD_RUNPATH_SEARCH_PATHS: [
          '"$(inherited)"',
          '"@executable_path/Frameworks"',
          '"@loader_path/Frameworks"',
        ],
        PRODUCT_BUNDLE_IDENTIFIER: `"${UI_TEST_BUNDLE_ID}"`,
        PRODUCT_NAME: '"$(TARGET_NAME)"',
        SWIFT_VERSION: '5.0',
        TARGETED_DEVICE_FAMILY: '"1,2"',
        TEST_TARGET_NAME: 'VoiceClaw',
      }

      const pbxBuildConfig = project.hash.project.objects['XCBuildConfiguration']
      pbxBuildConfig[debugConfigUuid] = {
        isa: 'XCBuildConfiguration',
        buildSettings: { ...testBuildSettings },
        name: 'Debug',
      }
      pbxBuildConfig[debugConfigUuid + '_comment'] = 'Debug'

      pbxBuildConfig[releaseConfigUuid] = {
        isa: 'XCBuildConfiguration',
        buildSettings: { ...testBuildSettings },
        name: 'Release',
      }
      pbxBuildConfig[releaseConfigUuid + '_comment'] = 'Release'

      const pbxConfigList = project.hash.project.objects['XCConfigurationList']
      pbxConfigList[configListUuid] = {
        isa: 'XCConfigurationList',
        buildConfigurations: [
          { value: debugConfigUuid, comment: 'Debug' },
          { value: releaseConfigUuid, comment: 'Release' },
        ],
        defaultConfigurationIsVisible: 0,
        defaultConfigurationName: 'Release',
      }
      pbxConfigList[configListUuid + '_comment'] =
        `Build configuration list for PBXNativeTarget "${UI_TEST_TARGET_NAME}"`

      // Create the native target
      const testTargetUuid = project.generateUuid()
      const pbxNativeTarget = project.hash.project.objects['PBXNativeTarget']
      pbxNativeTarget[testTargetUuid] = {
        isa: 'PBXNativeTarget',
        buildConfigurationList: configListUuid,
        buildConfigurationList_comment:
          `Build configuration list for PBXNativeTarget "${UI_TEST_TARGET_NAME}"`,
        buildPhases: [
          { value: sourcesBuildPhaseUuid, comment: 'Sources' },
        ],
        buildRules: [],
        dependencies: [
          { value: targetDependencyUuid, comment: 'PBXTargetDependency' },
        ],
        name: UI_TEST_TARGET_NAME,
        productName: UI_TEST_TARGET_NAME,
        productReference: productRefUuid,
        productReference_comment: `${UI_TEST_TARGET_NAME}.xctest`,
        productType: '"com.apple.product-type.bundle.ui-testing"',
      }
      pbxNativeTarget[testTargetUuid + '_comment'] = UI_TEST_TARGET_NAME

      // Register target in the project
      const projectSection = project.hash.project.objects['PBXProject']
      const projectObj = projectSection[project.getFirstProject().uuid]
      if (projectObj.targets) {
        projectObj.targets.push({
          value: testTargetUuid,
          comment: UI_TEST_TARGET_NAME,
        })
      }

      // Add TargetAttributes for the test target
      if (projectObj.attributes && projectObj.attributes.TargetAttributes) {
        projectObj.attributes.TargetAttributes[testTargetUuid] = {
          CreatedOnToolsVersion: '15.0',
          TestTargetID: mainTargetUuid,
        }
      }

      // Write the updated project file
      fs.writeFileSync(pbxprojPath, project.writeSync())
      console.log(
        `[with-ui-tests] Added ${UI_TEST_TARGET_NAME} target with ${swiftFileRefs.length} Swift files`
      )

      // Update the VoiceClaw scheme to include the UI test target
      updateScheme(platformRoot, testTargetUuid)

      return config
    },
  ])
}

// --- Helper Functions ---

function updateScheme(platformRoot, testTargetUuid) {
  const schemePath = path.join(
    platformRoot,
    'VoiceClaw.xcodeproj',
    'xcshareddata',
    'xcschemes',
    'VoiceClaw.xcscheme'
  )

  if (!fs.existsSync(schemePath)) {
    console.warn('[with-ui-tests] Scheme file not found, skipping scheme update')
    return
  }

  let scheme = fs.readFileSync(schemePath, 'utf8')

  // Replace the existing TestableReference (which points to a non-existent
  // VoiceClawTests target) with our UI test target
  const testableRefRegex =
    /<TestableReference[\s\S]*?<BuildableReference[\s\S]*?BlueprintName\s*=\s*"VoiceClawTests"[\s\S]*?<\/TestableReference>/
  const uiTestRef = `<TestableReference
            skipped = "NO">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "${testTargetUuid}"
               BuildableName = "${UI_TEST_TARGET_NAME}.xctest"
               BlueprintName = "${UI_TEST_TARGET_NAME}"
               ReferencedContainer = "container:VoiceClaw.xcodeproj">
            </BuildableReference>
         </TestableReference>`

  if (testableRefRegex.test(scheme)) {
    scheme = scheme.replace(testableRefRegex, uiTestRef)
  } else if (!scheme.includes(UI_TEST_TARGET_NAME)) {
    // No existing test ref -- insert before </Testables>
    scheme = scheme.replace(
      '</Testables>',
      `   ${uiTestRef}\n      </Testables>`
    )
  }

  fs.writeFileSync(schemePath, scheme)
  console.log('[with-ui-tests] Updated VoiceClaw scheme with UI test target')
}

function findMainTargetUuid(project) {
  const targets = project.hash.project.objects['PBXNativeTarget']
  for (const key of Object.keys(targets)) {
    if (typeof targets[key] === 'object' && targets[key].name === 'VoiceClaw') {
      return key
    }
  }
  throw new Error('Main app target "VoiceClaw" not found in pbxproj')
}

module.exports = withUITests
