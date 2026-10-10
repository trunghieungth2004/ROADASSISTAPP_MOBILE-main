const {withAndroidStyles} = require("@expo/config-plugins");
const {assignStylesValue, getAppThemeGroup} = require("@expo/config-plugins/build/android/Styles");

module.exports = function withTransparentNavigationBar(config) {
  return withAndroidStyles(config, (config) => {
    config.modResults = assignStylesValue(config.modResults, {
      add: true,
      parent: getAppThemeGroup(),
      name: "android:enforceNavigationBarContrast",
      value: "false",
    });
    return config;
  });
};
