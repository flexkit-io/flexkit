/**
 * electron-builder `afterSign` hook: when no Developer ID is available
 * (CSC_LINK unset), the macOS app leaves electron-builder with no bundle
 * signature at all, and Gatekeeper reports such a download as "damaged".
 * An ad-hoc signature does not pass notarization either, but it gives the
 * person the "Open Anyway" path in System Settings until signing is set up.
 */
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');

module.exports = async function adhocSign(context) {
  if (context.electronPlatformName !== 'darwin' || process.env.CSC_LINK) {
    return;
  }

  const app = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);

  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  console.log(`  • ad-hoc signed (no Developer ID)  app=${app}`);
};
