import { registerHooks } from "node:module";
import { extname } from "node:path";

const libUrl = new URL("../../lib/", import.meta.url).href;

// Next.js resolves extensionless TypeScript imports. Give the native Node test
// runner the same resolution for relative imports inside lib/.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      context.parentURL?.startsWith(libUrl) &&
      specifier.startsWith(".") &&
      extname(specifier) === ""
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
