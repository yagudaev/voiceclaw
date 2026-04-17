/**
 * Expo config plugin that copies pre-generated iOS icon assets into
 * the Xcode project's AppIcon.appiconset during prebuild.
 *
 * Supports variant-specific icons: pass { variant: 'development' | 'staging' | 'production' }
 * to use icons from assets/images/ios-dev, ios-staging, or ios respectively.
 */
const { withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const VARIANT_ICON_DIR = {
  development: 'ios-dev',
  staging: 'ios-staging',
  production: 'ios',
}

function withIOSIcons(config, props = {}) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot
      const platformRoot = config.modRequest.platformProjectRoot

      const variant = props.variant || 'production'
      const iconDir = VARIANT_ICON_DIR[variant] || 'ios'
      const sourceDir = path.join(projectRoot, 'assets', 'images', iconDir)
      const targetDir = path.join(
        platformRoot,
        config.modRequest.projectName || 'voiceclaw',
        'Images.xcassets',
        'AppIcon.appiconset'
      )

      if (!fs.existsSync(sourceDir)) {
        console.warn(`[with-ios-icons] Source directory not found: ${sourceDir}, falling back to ios/`)
        const fallback = path.join(projectRoot, 'assets', 'images', 'ios')
        if (!fs.existsSync(fallback)) return config
        return copyIcons(fallback, targetDir, config)
      }

      return copyIcons(sourceDir, targetDir, config)
    },
  ])
}

function copyIcons(sourceDir, targetDir, config) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  const files = fs.readdirSync(sourceDir)
  for (const file of files) {
    const src = path.join(sourceDir, file)
    const dest = path.join(targetDir, file)
    fs.copyFileSync(src, dest)
  }

  console.log(`[with-ios-icons] Copied ${files.length} files from ${sourceDir}`)
  return config
}

module.exports = withIOSIcons
