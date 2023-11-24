import {build} from "esbuild";

build({
    entryPoints: ["./src/index.ts"],
    bundle: true,
    outfile: "lib/index.js",
    sourcemap: true,
    target: "es2019",
    format: "cjs",
    platform: "node",
}).catch(() => process.exit(1));