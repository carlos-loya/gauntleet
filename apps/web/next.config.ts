import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@gauntleet/core", "@gauntleet/db", "@gauntleet/llm", "@gauntleet/sandbox"],
  serverExternalPackages: ["better-sqlite3"],
  webpack: (config, { isServer }) => {
    // Workspace packages emit ESM-style imports with `.js` extensions even though
    // the actual source files are `.ts`. Tell webpack to resolve those back to TS.
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    // Native modules can't be bundled by webpack — externalize at runtime so Node
    // resolves them via require() against node_modules.
    if (isServer) {
      const externals = config.externals;
      if (Array.isArray(externals)) {
        externals.push("better-sqlite3");
      } else {
        config.externals = [externals, "better-sqlite3"].filter(Boolean) as unknown[];
      }
    }
    return config;
  },
};

export default nextConfig;
