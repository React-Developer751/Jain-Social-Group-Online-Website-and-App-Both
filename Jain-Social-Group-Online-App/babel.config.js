module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    // Reanimated 4 moved its Babel plugin into react-native-worklets, and it
    // must stay last. `expo-router/babel` is gone since SDK 50 — babel-preset-expo
    // handles expo-router itself.
    plugins: ["react-native-worklets/plugin"],
  };
};
