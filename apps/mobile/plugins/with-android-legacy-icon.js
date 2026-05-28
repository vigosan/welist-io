const path = require("node:path");
const fs = require("node:fs");
const { withDangerousMod } = require("@expo/config-plugins");
const { generateImageAsync } = require("@expo/image-utils");

const DPI = {
  mdpi: { folder: "mipmap-mdpi", size: 48 },
  hdpi: { folder: "mipmap-hdpi", size: 72 },
  xhdpi: { folder: "mipmap-xhdpi", size: 96 },
  xxhdpi: { folder: "mipmap-xxhdpi", size: 144 },
  xxxhdpi: { folder: "mipmap-xxxhdpi", size: 192 },
};

const withAndroidLegacyIcon = (config, { icon }) => {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const src = path.resolve(projectRoot, icon);
      const resBase = path.resolve(projectRoot, "android/app/src/main/res");
      for (const { folder, size } of Object.values(DPI)) {
        const { source } = await generateImageAsync(
          { projectRoot, cacheType: `welist-legacy-${size}` },
          { src, width: size, height: size, resizeMode: "cover" }
        );
        const dir = path.join(resBase, folder);
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(path.join(dir, "ic_launcher.webp"), source);
        await fs.promises.writeFile(
          path.join(dir, "ic_launcher_round.webp"),
          source
        );
      }
      return cfg;
    },
  ]);
};

module.exports = withAndroidLegacyIcon;
