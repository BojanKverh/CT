/** Compile every source @example as an independent module, without injected context. */
import ts from "typescript";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

const root = resolve(".");
const examples = [];
function collect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = join(directory, entry.name);
        if (entry.isDirectory()) collect(file);
        else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
            const text = readFileSync(file, "utf8").replaceAll("\r\n", "\n");
            const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
            const seen = new Set();
            function visit(node) {
                for (const doc of node.jsDoc ?? []) {
                    for (const tag of doc.tags ?? []) {
                        if (tag.tagName.text !== "example" || seen.has(tag.pos)) continue;
                        seen.add(tag.pos);
                        const comment = tag.getText(source).replace(/^\s*\* ?/gm, "");
                        const blocks = [...comment.matchAll(/```(?:ts|typescript)\s*\n([\s\S]*?)```/g)];
                        if (blocks.length === 0) throw new Error(`${file}: @example needs a TypeScript code block`);
                        for (const block of blocks) {
                            const line = source.getLineAndCharacterOfPosition(tag.getStart(source)).line + 1;
                            examples.push({ origin: `${relative(root, file)}:${line}`, code: block[1] });
                        }
                    }
                }
                ts.forEachChild(node, visit);
            }
            visit(source);
        }
    }
}
collect(join(root, "src"));
if (examples.length === 0) throw new Error("No source examples found");

const configFile = ts.readConfigFile(join(root, "tsconfig.build.json"), ts.sys.readFile);
if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
if (config.errors.length) throw new Error(config.errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, "\n")).join("\n"));

// mkdtemp creates a unique, tool-owned directory; remove only that directory below.
const directory = mkdtempSync(join(tmpdir(), "ct-doc-examples-"));
try {
    const origins = new Map();
    const files = examples.map((example, index) => {
        const file = join(directory, `example-${index + 1}.ts`);
        origins.set(resolve(file), example.origin);
        writeFileSync(file, example.code);
        return file;
    });
    const program = ts.createProgram(files, {
        ...config.options,
        noEmit: true,
        strict: true,
        moduleDetection: ts.ModuleDetectionKind.Force,
        rootDir: undefined,
        outDir: undefined,
        declaration: false,
        declarationMap: false,
        emitDeclarationOnly: false,
        composite: false,
        incremental: false,
        tsBuildInfoFile: undefined,
        baseUrl: root,
        paths: { "canvas-toolkit-lib": ["src/index.ts"] }
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    for (const diagnostic of diagnostics) {
        const file = diagnostic.file;
        const origin = file && origins.get(resolve(file.fileName));
        const line = file && diagnostic.start !== undefined
            ? file.getLineAndCharacterOfPosition(diagnostic.start).line + 1 : undefined;
        console.error(`${origin ?? file?.fileName ?? "TypeScript"}${line ? ` (example line ${line})` : ""}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
    }
    console.log(`${examples.length} source examples checked; ${diagnostics.length} errors.`);
    if (diagnostics.length) process.exitCode = 1;
} finally {
    rmSync(directory, { recursive: true, force: true });
}
