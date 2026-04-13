/**
 * Expo config plugin that copies pre-generated iOS icon assets into
 * the Xcode project's AppIcon.appiconset during prebuild.
 *
 * This ensures all required iOS icon sizes are present in the asset
 * catalog, matching Apple's requirements for App Store submission.
 */
const { withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

function withIOSIcons(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot
      const platformRoot = config.modRequest.platformProjectRoot

      const sourceDir = path.join(projectRoot, 'assets', 'images', 'ios')
      const targetDir = path.join(
        platformRoot,
        config.modRequest.projectName || 'voiceclaw',
        'Images.xcassets',
        'AppIcon.appiconset'
      )

      if (!fs.existsSync(sourceDir)) {
        console.warn('[with-ios-icons] Source directory not found:', sourceDir)
        return config
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      const files = fs.readdirSync(sourceDir)
      for (const file of files) {
        const src = path.join(sourceDir, file)
        const dest = path.join(targetDir, file)
        fs.copyFileSync(src, dest)
      }

      console.log(`[with-ios-icons] Copied ${files.length} files to ${targetDir}`)
      return config
    },
  ])
}

module.exports = withIOSIcons
