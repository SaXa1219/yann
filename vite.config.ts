import { defineConfig } from "vite";
import { miaodaDevPlugin } from "miaoda-sc-plugin";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cookieShim = path.resolve(__dirname, "./src/shims/cookie.js");
const setCookieParserShim = path.resolve(__dirname, "./src/shims/set-cookie-parser.js");
// 注意：这里不能直接用 require.resolve，因为项目 node_modules 里可能没有顶层依赖，
// 解析会得到全局 store 中的其它版本。在 load 钩子中通过路径特征匹配更可靠。

const reactRouterDom = require.resolve("react-router-dom");
const reactRouterEntry = require.resolve("react-router");

// react-router 7.x 在 development 模式下会把 react 作为独立 chunk 引入；
// 必须把入口显式指向 development 构建，确保 Vite 预构建时只生成一份 React 实例，
// 否则 BrowserRouter 里 useRef 会读到 null（多份 React 导致 dispatcher 不共享）。
function findDevEntry(entryPath: string) {
  if (!entryPath.includes('/dist/')) return entryPath;
  const candidates = [
    entryPath.replace(/\/dist\/.*$/, '/dist/development/index.mjs'),
    entryPath.replace(/\/dist\/.*$/, '/dist/development/index.js'),
    entryPath.replace(/\/dist\/.*$/, '/dist/index.mjs'),
    entryPath.replace(/\/dist\/.*$/, '/dist/index.js'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return entryPath;
}

const reactRouterDevEntry = findDevEntry(reactRouterEntry);
const reactRouterDomDevEntry = findDevEntry(reactRouterDom);
const reactRouterDomSub = reactRouterDomDevEntry.replace(/index\.(mjs|js|cjs)$/, 'dom-export.$1');
const reactRouterDomSubEntry = existsSync(reactRouterDomSub) ? reactRouterDomSub : reactRouterDomDevEntry;

/** 把 CJS-only 依赖的源码替换为 ESM shim，根治 react-router 等库的 named import 报错 */
function cjsNamedExportShimPlugin() {
  function isCookieFile(id: string) {
    return id.includes("/cookie@") && /\/dist\/index\.(js|mjs|cjs)$/.test(id);
  }
  function isSetCookieParserFile(id: string) {
    return id.includes("/set-cookie-parser@") && id.endsWith("/lib/set-cookie.js");
  }
  return {
    name: "cjs-named-export-shim",
    enforce: "pre" as const,
    resolveId(source: string) {
      if (source === "cookie") return cookieShim;
      if (source === "set-cookie-parser") return setCookieParserShim;
      return null;
    },
    load(id: string) {
      if (isCookieFile(id)) return readFileSync(cookieShim, "utf-8");
      if (isSetCookieParserFile(id)) return readFileSync(setCookieParserShim, "utf-8");
      return null;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    cjsNamedExportShimPlugin(),
    react(),
    miaodaDevPlugin(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // cookie / set-cookie-parser 的 CJS 构建在 Vite ESM 加载时只暴露 default，
      // react-router 等库 named import 会报错，这里用 shim 提供具名导出
      "cookie": cookieShim,
      "set-cookie-parser": setCookieParserShim,
      // react-router-dom 与 react-router 必须同时指向 development 入口，
      // 否则 production 和 development 混用会引入两份 React，导致 Hook 崩溃
      "react-router-dom$": reactRouterDomDevEntry,
      "react-router$": reactRouterDevEntry,
      "react-router/dom$": reactRouterDomSubEntry,
    },
    dedupe: [
      "react",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom",
      "react-dom/client",
      "react-router",
      "react-router-dom",
    ],
  },
  optimizeDeps: {
    // 强制将 React 全家桶纳入预构建，保证整个应用只有一份 React 实例。
    // 若 react-router-dom/react-router 被排除在预构建外，其内部会从全局 store
    // 加载独立 React 副本，导致 useRef/useState 等 Hook 崩溃（Cannot read properties of null）。
    include: [
      "react",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom",
      "react-dom/client",
      "react-router",
      "react-router-dom",
    ],
    // 强制重新预构建，避免旧缓存中的模块图与当前 React/Router 版本不一致
    // 导致 BrowserRouter 等组件读取到空的 React dispatcher。
    force: true,
    // rolldown-vite 使用 Rolldown 做依赖优化，esbuildOptions 已弃用
    rolldownOptions: {
      resolve: {
        alias: {
          // 预构建时同样把 react-router 全家桶指向 development 入口，确保 chunk 图一致
          "react-router": reactRouterDevEntry,
          "react-router-dom": reactRouterDomDevEntry,
          "react-router/dom": reactRouterDomSubEntry,
          "cookie": cookieShim,
          "set-cookie-parser": setCookieParserShim,
        },
      },
    },
  },
});
