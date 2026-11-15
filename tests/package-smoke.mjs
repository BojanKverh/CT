import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const project = fileURLToPath(new URL("../", import.meta.url));
const npm = process.env.npm_execpath;
assert.ok(npm, "Run this check with npm run test:package.");

const temporaryRoot = realpathSync(tmpdir());
const consumer = realpathSync(mkdtempSync(join(temporaryRoot, "canvas-toolkit-package-")));
assert.equal(dirname(consumer), temporaryRoot);
const runNpm = (args, cwd) =>
    execFileSync(process.execPath, [npm, ...args], { cwd, stdio: "inherit" });

try {
    runNpm(["run", "build"], project);
    runNpm(["pack", "--pack-destination", consumer, "--loglevel=error"], project);
    const archives = readdirSync(consumer).filter(name => name.endsWith(".tgz"));
    assert.equal(archives.length, 1, "Expected npm pack to create one archive.");
    const archive = join(consumer, archives[0]);

    writeFileSync(join(consumer, "package.json"), JSON.stringify({
        name: "canvas-toolkit-smoke-consumer",
        private: true
    }));
    runNpm([
        "install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund",
        "--no-package-lock", "--cache", join(consumer, ".npm-cache"), archive
    ], consumer);

    execFileSync(process.execPath, ["--input-type=module", "--eval", `
        import assert from "node:assert/strict";
        import { CApplication, CPushButton, CGridLayout } from "canvas-toolkit-lib";

        assert.equal(typeof CApplication.prototype.run, "function");
        assert.equal(typeof CPushButton, "function");
        assert.equal(typeof CGridLayout, "function");
        console.log("Canvas Toolkit package imports verified.");
    `], { cwd: consumer, stdio: "inherit" });
} finally {
    rmSync(consumer, { recursive: true, force: true });
}
