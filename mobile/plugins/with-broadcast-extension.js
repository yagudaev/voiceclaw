/**
 * Expo config plugin that integrates a ReplayKit Broadcast Upload Extension
 * target into the iOS project during prebuild. The extension captures the
 * full device screen (including when the host app is backgrounded) and
 * writes JPEG frames into a shared App Group container, which the main app
 * reads and forwards to the realtime relay as frame.append events.
 *
 * What this plugin does:
 *   1. Adds `com.apple.security.application-groups` entitlement to the main
 *      app so it can read the shared container.
 *   2. Copies the extension source files from mobile/broadcast-extension/
 *      into ios/BroadcastUpload/ during prebuild, substituting the app
 *      bundle id into the entitlements file.
 *   3. Patches the Xcode project to register a new PBXNativeTarget of type
 *      `com.apple.product-type.app-extension`, wires up Sources / Frameworks
 *      / Resources build phases, links ReplayKit.framework, configures
 *      Debug+Release XCBuildConfigurations with the correct bundle id /
 *      entitlements / deployment target, creates an "Embed App Extensions"
 *      copy-files phase on the main target, and makes the main target
 *      depend on the extension target.
 *
 * Companion runtime pieces:
 *   - SampleHandler.swift (in mobile/broadcast-extension/) — the extension
 *     processor. Writes frames to the App Group; posts a Darwin notification.
 *   - ScreenCaptureManager.swift — subscribes to the Darwin notification,
 *     reads frames from the App Group, emits them as onFrame events to JS.
 */
const { withDangerousMod, withEntitlementsPlist } = require('expo/config-plugins')
const xcode = require('xcode')
const path = require('path')
const fs = require('fs')

const EXTENSION_NAME = 'BroadcastUpload'
const APP_GROUP_ID = 'group.com.yagudaev.voiceclaw.broadcast'
const DEPLOYMENT_TARGET = '16.0'

// Fixed UUIDs (24-char hex) so the plugin is idempotent across prebuild runs.
const UUIDS = {
  GROUP: '7CA1000000000000000000A1',
  SAMPLE_HANDLER_FILE_REF: '7CA1000000000000000000A2',
  INFO_PLIST_FILE_REF: '7CA1000000000000000000A3',
  ENTITLEMENTS_FILE_REF: '7CA1000000000000000000A4',
  APPEX_FILE_REF: '7CA1000000000000000000A5',
  SAMPLE_HANDLER_BUILD_FILE: '7CA1000000000000000000A6',
  REPLAYKIT_FILE_REF: '7CA1000000000000000000A7',
  REPLAYKIT_BUILD_FILE: '7CA1000000000000000000A8',
  TARGET: '7CA1000000000000000000A9',
  SOURCES_PHASE: '7CA1000000000000000000B0',
  FRAMEWORKS_PHASE: '7CA1000000000000000000B1',
  RESOURCES_PHASE: '7CA1000000000000000000B2',
  CONFIG_LIST: '7CA1000000000000000000B3',
  CONFIG_DEBUG: '7CA1000000000000000000B4',
  CONFIG_RELEASE: '7CA1000000000000000000B5',
  EMBED_PHASE: '7CA1000000000000000000B6',
  EMBED_BUILD_FILE: '7CA1000000000000000000B7',
  TARGET_DEPENDENCY: '7CA1000000000000000000B8',
  CONTAINER_ITEM_PROXY: '7CA1000000000000000000B9',
}

function withBroadcastExtension(config) {
  config = withMainAppEntitlements(config)
  config = withExtensionFiles(config)
  config = withExtensionTarget(config)
  return config
}

// Step 1: Add App Group entitlement to the main app.
function withMainAppEntitlements(config) {
  return withEntitlementsPlist(config, (config) => {
    const existing = config.modResults['com.apple.security.application-groups'] || []
    const groups = Array.isArray(existing) ? existing : [existing]
    if (!groups.includes(APP_GROUP_ID)) {
      groups.push(APP_GROUP_ID)
    }
    config.modResults['com.apple.security.application-groups'] = groups
    return config
  })
}

// Step 2: Copy extension source files into ios/BroadcastUpload/.
function withExtensionFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot
      const iosRoot = config.modRequest.platformProjectRoot
      const srcDir = path.join(projectRoot, 'broadcast-extension')
      const dstDir = path.join(iosRoot, EXTENSION_NAME)

      if (!fs.existsSync(srcDir)) {
        console.warn(`[with-broadcast-extension] source dir not found: ${srcDir}`)
        return config
      }

      fs.mkdirSync(dstDir, { recursive: true })
      for (const name of fs.readdirSync(srcDir)) {
        const srcPath = path.join(srcDir, name)
        const dstPath = path.join(dstDir, name)
        fs.copyFileSync(srcPath, dstPath)
      }
      console.log(`[with-broadcast-extension] Copied extension files to ${dstDir}`)
      return config
    },
  ])
}

// Step 3: Patch project.pbxproj to add the extension target.
function withExtensionTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot
      const mainBundleId = config.ios?.bundleIdentifier
      if (!mainBundleId) {
        console.warn('[with-broadcast-extension] ios.bundleIdentifier missing; skipping')
        return config
      }
      const extensionBundleId = `${mainBundleId}.${EXTENSION_NAME}`

      const pbxprojPath = findPbxprojPath(iosRoot)
      if (!pbxprojPath) {
        console.warn('[with-broadcast-extension] project.pbxproj not found; skipping')
        return config
      }

      const project = xcode.project(pbxprojPath)
      project.parseSync()

      if (hasTargetAlready(project)) {
        console.log('[with-broadcast-extension] Extension target already present; skipping')
        return config
      }

      patchPbxproj(project, extensionBundleId)

      fs.writeFileSync(pbxprojPath, project.writeSync())
      console.log('[with-broadcast-extension] Wrote updated project.pbxproj')
      return config
    },
  ])
}

// --- Helpers ---

function findPbxprojPath(iosRoot) {
  const entries = fs.readdirSync(iosRoot)
  const projectDir = entries.find((e) => e.endsWith('.xcodeproj'))
  if (!projectDir) return null
  const pbx = path.join(iosRoot, projectDir, 'project.pbxproj')
  return fs.existsSync(pbx) ? pbx : null
}

function hasTargetAlready(project) {
  const targets = section(project, 'PBXNativeTarget')
  for (const key of Object.keys(targets)) {
    const t = targets[key]
    if (typeof t === 'object' && t.name === EXTENSION_NAME) return true
  }
  return false
}

function patchPbxproj(project, extensionBundleId) {
  // File references for the files living at ios/BroadcastUpload/
  ensureFileRef(project, UUIDS.SAMPLE_HANDLER_FILE_REF, 'SampleHandler.swift', 'sourcecode.swift')
  ensureFileRef(project, UUIDS.INFO_PLIST_FILE_REF, 'Info.plist', 'text.plist.xml')
  ensureFileRef(project, UUIDS.ENTITLEMENTS_FILE_REF, 'BroadcastUpload.entitlements', 'text.plist.entitlements')
  ensureProductFileRef(project, UUIDS.APPEX_FILE_REF, `${EXTENSION_NAME}.appex`, 'wrapper.app-extension')
  ensureSystemFrameworkRef(project, UUIDS.REPLAYKIT_FILE_REF, 'ReplayKit.framework')

  // Build files
  ensureBuildFile(project, UUIDS.SAMPLE_HANDLER_BUILD_FILE, UUIDS.SAMPLE_HANDLER_FILE_REF, 'SampleHandler.swift in Sources')
  ensureBuildFile(project, UUIDS.REPLAYKIT_BUILD_FILE, UUIDS.REPLAYKIT_FILE_REF, 'ReplayKit.framework in Frameworks')
  ensureEmbedBuildFile(project, UUIDS.EMBED_BUILD_FILE, UUIDS.APPEX_FILE_REF, `${EXTENSION_NAME}.appex in Embed App Extensions`)

  // Group for the extension's source files
  ensureGroup(project, UUIDS.GROUP, EXTENSION_NAME, [
    { value: UUIDS.SAMPLE_HANDLER_FILE_REF, comment: 'SampleHandler.swift' },
    { value: UUIDS.INFO_PLIST_FILE_REF, comment: 'Info.plist' },
    { value: UUIDS.ENTITLEMENTS_FILE_REF, comment: 'BroadcastUpload.entitlements' },
  ])
  addGroupToMainGroup(project, UUIDS.GROUP, EXTENSION_NAME)

  // Ensure the Products group includes the .appex
  addToProductsGroup(project, UUIDS.APPEX_FILE_REF, `${EXTENSION_NAME}.appex`)

  // Build phases
  ensureSourcesPhase(project, UUIDS.SOURCES_PHASE, [
    { value: UUIDS.SAMPLE_HANDLER_BUILD_FILE, comment: 'SampleHandler.swift in Sources' },
  ])
  ensureFrameworksPhase(project, UUIDS.FRAMEWORKS_PHASE, [
    { value: UUIDS.REPLAYKIT_BUILD_FILE, comment: 'ReplayKit.framework in Frameworks' },
  ])
  ensureResourcesPhase(project, UUIDS.RESOURCES_PHASE)

  // XC build configurations (Debug + Release) for the extension target
  ensureBuildConfig(project, UUIDS.CONFIG_DEBUG, 'Debug', extensionBundleId)
  ensureBuildConfig(project, UUIDS.CONFIG_RELEASE, 'Release', extensionBundleId)
  ensureConfigList(project, UUIDS.CONFIG_LIST, [UUIDS.CONFIG_DEBUG, UUIDS.CONFIG_RELEASE])

  // The native target itself
  ensureNativeTarget(project, {
    uuid: UUIDS.TARGET,
    name: EXTENSION_NAME,
    productName: EXTENSION_NAME,
    productRef: UUIDS.APPEX_FILE_REF,
    productType: '"com.apple.product-type.app-extension"',
    configListRef: UUIDS.CONFIG_LIST,
    buildPhases: [
      { value: UUIDS.SOURCES_PHASE, comment: 'Sources' },
      { value: UUIDS.FRAMEWORKS_PHASE, comment: 'Frameworks' },
      { value: UUIDS.RESOURCES_PHASE, comment: 'Resources' },
    ],
  })

  // Register the target on the PBXProject and Root
  registerTargetOnProject(project, UUIDS.TARGET, EXTENSION_NAME, UUIDS.CONFIG_LIST)

  // Main app target wiring: embed the extension + depend on it
  const mainTargetUuid = findMainTargetUuid(project)
  if (!mainTargetUuid) {
    console.warn('[with-broadcast-extension] Could not find main VoiceClaw target')
    return
  }
  ensureContainerItemProxy(project, UUIDS.CONTAINER_ITEM_PROXY, UUIDS.TARGET, EXTENSION_NAME)
  ensureTargetDependency(project, UUIDS.TARGET_DEPENDENCY, UUIDS.TARGET, UUIDS.CONTAINER_ITEM_PROXY, EXTENSION_NAME)
  attachDependencyToTarget(project, mainTargetUuid, UUIDS.TARGET_DEPENDENCY, EXTENSION_NAME)

  ensureEmbedExtensionsPhase(project, mainTargetUuid, UUIDS.EMBED_PHASE, [
    { value: UUIDS.EMBED_BUILD_FILE, comment: `${EXTENSION_NAME}.appex in Embed App Extensions` },
  ])

  console.log('[with-broadcast-extension] Patched project.pbxproj with BroadcastUpload target')
}

// --- Low-level pbxproj mutation helpers ---

function section(project, name) {
  const objs = project.hash.project.objects
  if (!objs[name]) objs[name] = {}
  return objs[name]
}

function ensureFileRef(project, uuid, name, lastKnownFileType) {
  const refs = section(project, 'PBXFileReference')
  if (refs[uuid]) return
  refs[uuid] = {
    isa: 'PBXFileReference',
    lastKnownFileType,
    path: name,
    sourceTree: '"<group>"',
    name,
  }
  refs[uuid + '_comment'] = name
}

function ensureProductFileRef(project, uuid, name, explicitFileType) {
  const refs = section(project, 'PBXFileReference')
  if (refs[uuid]) return
  refs[uuid] = {
    isa: 'PBXFileReference',
    explicitFileType,
    includeInIndex: 0,
    path: name,
    sourceTree: 'BUILT_PRODUCTS_DIR',
  }
  refs[uuid + '_comment'] = name
}

function ensureSystemFrameworkRef(project, uuid, name) {
  const refs = section(project, 'PBXFileReference')
  if (refs[uuid]) return
  refs[uuid] = {
    isa: 'PBXFileReference',
    lastKnownFileType: 'wrapper.framework',
    name,
    path: `System/Library/Frameworks/${name}`,
    sourceTree: 'SDKROOT',
  }
  refs[uuid + '_comment'] = name
}

function ensureBuildFile(project, uuid, fileRef, comment) {
  const files = section(project, 'PBXBuildFile')
  if (files[uuid]) return
  files[uuid] = {
    isa: 'PBXBuildFile',
    fileRef,
    fileRef_comment: comment.split(' in ')[0],
  }
  files[uuid + '_comment'] = comment
}

function ensureEmbedBuildFile(project, uuid, fileRef, comment) {
  const files = section(project, 'PBXBuildFile')
  if (files[uuid]) return
  files[uuid] = {
    isa: 'PBXBuildFile',
    fileRef,
    fileRef_comment: comment.split(' in ')[0],
    settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
  }
  files[uuid + '_comment'] = comment
}

function ensureGroup(project, uuid, name, children) {
  const groups = section(project, 'PBXGroup')
  if (groups[uuid]) return
  groups[uuid] = {
    isa: 'PBXGroup',
    children,
    path: name,
    sourceTree: '"<group>"',
  }
  groups[uuid + '_comment'] = name
}

function addGroupToMainGroup(project, groupUuid, comment) {
  const mainGroup = findMainGroup(project)
  if (!mainGroup) return
  mainGroup.children = mainGroup.children || []
  const already = mainGroup.children.some((c) => (c.value || c) === groupUuid)
  if (!already) {
    mainGroup.children.push({ value: groupUuid, comment })
  }
}

function addToProductsGroup(project, fileRefUuid, comment) {
  const groups = section(project, 'PBXGroup')
  for (const key of Object.keys(groups)) {
    const g = groups[key]
    if (typeof g !== 'object') continue
    if (g.name === 'Products' || g.path === 'Products') {
      g.children = g.children || []
      const already = g.children.some((c) => (c.value || c) === fileRefUuid)
      if (!already) {
        g.children.push({ value: fileRefUuid, comment })
      }
      return
    }
  }
}

function ensureSourcesPhase(project, uuid, files) {
  const phases = section(project, 'PBXSourcesBuildPhase')
  if (phases[uuid]) return
  phases[uuid] = {
    isa: 'PBXSourcesBuildPhase',
    buildActionMask: 2147483647,
    files,
    runOnlyForDeploymentPostprocessing: 0,
  }
  phases[uuid + '_comment'] = 'Sources'
}

function ensureFrameworksPhase(project, uuid, files) {
  const phases = section(project, 'PBXFrameworksBuildPhase')
  if (phases[uuid]) return
  phases[uuid] = {
    isa: 'PBXFrameworksBuildPhase',
    buildActionMask: 2147483647,
    files,
    runOnlyForDeploymentPostprocessing: 0,
  }
  phases[uuid + '_comment'] = 'Frameworks'
}

function ensureResourcesPhase(project, uuid) {
  const phases = section(project, 'PBXResourcesBuildPhase')
  if (phases[uuid]) return
  phases[uuid] = {
    isa: 'PBXResourcesBuildPhase',
    buildActionMask: 2147483647,
    files: [],
    runOnlyForDeploymentPostprocessing: 0,
  }
  phases[uuid + '_comment'] = 'Resources'
}

function ensureBuildConfig(project, uuid, name, bundleId) {
  const configs = section(project, 'XCBuildConfiguration')
  if (configs[uuid]) return
  const isDebug = name === 'Debug'
  configs[uuid] = {
    isa: 'XCBuildConfiguration',
    buildSettings: {
      CODE_SIGN_ENTITLEMENTS: `${EXTENSION_NAME}/BroadcastUpload.entitlements`,
      CODE_SIGN_STYLE: 'Automatic',
      CURRENT_PROJECT_VERSION: 1,
      DEBUG_INFORMATION_FORMAT: isDebug ? 'dwarf' : '"dwarf-with-dsym"',
      GCC_C_LANGUAGE_STANDARD: 'gnu11',
      GENERATE_INFOPLIST_FILE: 'NO',
      INFOPLIST_FILE: `${EXTENSION_NAME}/Info.plist`,
      IPHONEOS_DEPLOYMENT_TARGET: DEPLOYMENT_TARGET,
      LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
      MARKETING_VERSION: '1.0',
      MTL_ENABLE_DEBUG_INFO: isDebug ? 'INCLUDE_SOURCE' : 'NO',
      PRODUCT_BUNDLE_IDENTIFIER: bundleId,
      PRODUCT_NAME: `"$(TARGET_NAME)"`,
      SKIP_INSTALL: 'YES',
      SWIFT_EMIT_LOC_STRINGS: 'YES',
      SWIFT_OPTIMIZATION_LEVEL: isDebug ? '"-Onone"' : '"-O"',
      SWIFT_VERSION: '5.0',
      TARGETED_DEVICE_FAMILY: '"1,2"',
    },
    name,
  }
  configs[uuid + '_comment'] = name
}

function ensureConfigList(project, uuid, configRefs) {
  const lists = section(project, 'XCConfigurationList')
  if (lists[uuid]) return
  lists[uuid] = {
    isa: 'XCConfigurationList',
    buildConfigurations: configRefs.map((ref) => {
      const configName = (section(project, 'XCBuildConfiguration')[ref] || {}).name
      return { value: ref, comment: configName || '' }
    }),
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: 'Release',
  }
  lists[uuid + '_comment'] = `Build configuration list for PBXNativeTarget "${EXTENSION_NAME}"`
}

function ensureNativeTarget(project, opts) {
  const targets = section(project, 'PBXNativeTarget')
  if (targets[opts.uuid]) return
  targets[opts.uuid] = {
    isa: 'PBXNativeTarget',
    buildConfigurationList: opts.configListRef,
    buildConfigurationList_comment: `Build configuration list for PBXNativeTarget "${opts.name}"`,
    buildPhases: opts.buildPhases,
    buildRules: [],
    dependencies: [],
    name: opts.name,
    productName: opts.productName,
    productReference: opts.productRef,
    productReference_comment: `${opts.name}.appex`,
    productType: opts.productType,
  }
  targets[opts.uuid + '_comment'] = opts.name
}

function registerTargetOnProject(project, targetUuid, name, configListRef) {
  const projects = section(project, 'PBXProject')
  for (const key of Object.keys(projects)) {
    const p = projects[key]
    if (typeof p !== 'object') continue
    p.targets = p.targets || []
    const already = p.targets.some((t) => (t.value || t) === targetUuid)
    if (!already) {
      p.targets.push({ value: targetUuid, comment: name })
    }
    // Add a TargetAttributes entry so Xcode recognizes the target.
    if (p.attributes && p.attributes.TargetAttributes) {
      if (!p.attributes.TargetAttributes[targetUuid]) {
        p.attributes.TargetAttributes[targetUuid] = {
          CreatedOnToolsVersion: '15.0',
          ProvisioningStyle: 'Automatic',
        }
      }
    }
  }
}

function findMainTargetUuid(project) {
  const targets = section(project, 'PBXNativeTarget')
  for (const key of Object.keys(targets)) {
    const t = targets[key]
    if (typeof t === 'object' && t.name === 'VoiceClaw') return key
  }
  return null
}

function findMainGroup(project) {
  const projects = section(project, 'PBXProject')
  for (const key of Object.keys(projects)) {
    const p = projects[key]
    if (typeof p !== 'object') continue
    const mainGroupUuid = p.mainGroup
    if (!mainGroupUuid) continue
    const mg = section(project, 'PBXGroup')[mainGroupUuid]
    if (mg) return mg
  }
  return null
}

function ensureContainerItemProxy(project, uuid, targetUuid, comment) {
  const proxies = section(project, 'PBXContainerItemProxy')
  if (proxies[uuid]) return
  const projects = section(project, 'PBXProject')
  const projectRefUuid = Object.keys(projects).find((k) => typeof projects[k] === 'object')
  proxies[uuid] = {
    isa: 'PBXContainerItemProxy',
    containerPortal: projectRefUuid,
    containerPortal_comment: 'Project object',
    proxyType: 1,
    remoteGlobalIDString: targetUuid,
    remoteInfo: comment,
  }
  proxies[uuid + '_comment'] = 'PBXContainerItemProxy'
}

function ensureTargetDependency(project, uuid, targetUuid, proxyUuid, comment) {
  const deps = section(project, 'PBXTargetDependency')
  if (deps[uuid]) return
  deps[uuid] = {
    isa: 'PBXTargetDependency',
    target: targetUuid,
    target_comment: comment,
    targetProxy: proxyUuid,
    targetProxy_comment: 'PBXContainerItemProxy',
  }
  deps[uuid + '_comment'] = 'PBXTargetDependency'
}

function attachDependencyToTarget(project, mainTargetUuid, depUuid, comment) {
  const target = section(project, 'PBXNativeTarget')[mainTargetUuid]
  if (!target) return
  target.dependencies = target.dependencies || []
  const already = target.dependencies.some((d) => (d.value || d) === depUuid)
  if (!already) {
    target.dependencies.push({ value: depUuid, comment })
  }
}

function ensureEmbedExtensionsPhase(project, mainTargetUuid, phaseUuid, files) {
  const phases = section(project, 'PBXCopyFilesBuildPhase')
  const target = section(project, 'PBXNativeTarget')[mainTargetUuid]
  if (!target) return

  // Reuse an existing "Embed App Extensions" phase if the project already has one
  let existingPhaseUuid = null
  for (const buildPhaseRef of target.buildPhases || []) {
    const uuid = buildPhaseRef.value || buildPhaseRef
    const phase = phases[uuid]
    if (!phase) continue
    if (phase.name && phase.name.replace(/"/g, '') === 'Embed App Extensions') {
      existingPhaseUuid = uuid
      break
    }
    if (phase.dstSubfolderSpec === 13 && !phase.name) {
      existingPhaseUuid = uuid
      break
    }
  }

  if (existingPhaseUuid) {
    const phase = phases[existingPhaseUuid]
    phase.files = phase.files || []
    for (const f of files) {
      const already = phase.files.some((x) => (x.value || x) === f.value)
      if (!already) phase.files.push(f)
    }
    return
  }

  if (phases[phaseUuid]) return
  phases[phaseUuid] = {
    isa: 'PBXCopyFilesBuildPhase',
    buildActionMask: 2147483647,
    dstPath: '""',
    dstSubfolderSpec: 13, // PlugIns / App Extensions
    files,
    name: '"Embed App Extensions"',
    runOnlyForDeploymentPostprocessing: 0,
  }
  phases[phaseUuid + '_comment'] = 'Embed App Extensions'

  target.buildPhases = target.buildPhases || []
  target.buildPhases.push({ value: phaseUuid, comment: 'Embed App Extensions' })
}

module.exports = withBroadcastExtension
