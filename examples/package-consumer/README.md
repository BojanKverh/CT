# Canvas Toolkit package consumer

Enter your name and click **Pozdravi** to see a greeting. The example imports `canvas-toolkit-lib` by package name and uses the JavaScript emitted by the library build.

From the repository root, run:

```sh
npm ci
npm run build
npm --prefix examples/package-consumer install --install-links --no-package-lock
npm --prefix examples/package-consumer run dev
```

Open the URL printed by Vite. The example uses the repository's Vite installation. To build the example for production, run `npm --prefix examples/package-consumer run build`.

The install command copies the locally built package into the example's dependencies. After changing the library, rebuild it, remove `examples/package-consumer/node_modules/canvas-toolkit-lib` and repeat the install command.
