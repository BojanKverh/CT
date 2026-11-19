# Maintaining documentation

The documentation source lives with the library. JSDoc in `src` supplies the API reference and Markdown in `docs` supplies the guides.

```sh
npm ci
npm run docs
```

Open `docs-site/index.html` after the build. The output directory is generated and ignored by Git. On PowerShell, use `npm.cmd` if execution policy blocks the npm PowerShell wrapper.

`typedoc.json` expands the source modules, including base classes and types referenced by the package API. Some documented source modules require source imports because the package entry point does not export them. Package examples use the `canvas-toolkit-lib` exports.

The generator excludes `@internal` and private declarations, keeps inherited members visible and groups members tagged `@group Signals`. A small plugin removes unused-parameter underscores from rendered parameter names. The TypeScript source signatures remain intact.

For a stricter build, run the generator with warnings treated as errors.

```sh
npm run docs -- --treatWarningsAsErrors
```

The intentionally unexported type list contains three implementation aliases that appear in public signatures. Adding a new alias to this list should follow a review of whether users need a separately documented type.

When documenting an API, verify defaults and behavior against its implementation and callers. Describe arguments, units, invalid input, return values, ownership, signals and effects on focus or undo history where relevant. Add short examples for operations whose call order matters.

Inherited event handlers use the base contract unless the subclass adds a distinct guarantee. Internal event-forwarding hooks should be tagged `@internal`. A private implementation statement such as a loop or condition does not need JSDoc.

The CI workflow runs `npm run docs:check`. This audits exported declarations with the TypeScript syntax tree and builds documentation with warnings treated as errors. It checks missing summaries, known boilerplate and signal grouping without counting comments inside function bodies. The generated JSON is then checked for inherited `CPushButton.clicked`, its Signals group, excluded internal hooks, rendered parameter names and inclusion of every configured guide. A clean report is a regression check, not proof that every description is accurate; read descriptions against the implementation.

```sh
npm run docs:check
node tools/audit-docs.mjs docs-site/audit.json
```

The older Python audit is retained for comparisons. It uses text heuristics and can count implementation comments as members. Prefer the syntax-tree audit for CI. Publishing is separate from building: upload the contents of `docs-site` to the documentation host after a successful check.
