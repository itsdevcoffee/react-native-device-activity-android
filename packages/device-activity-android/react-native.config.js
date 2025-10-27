module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.breakr.deviceactivity.RNDeviceActivityAndroidPackage;',
        packageInstance: 'new RNDeviceActivityAndroidPackage()',
      },
      ios: null, // This is an Android-only package
    },
  },
}
