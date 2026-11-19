# Getting started

Install the package in a TypeScript application with a bundler such as Vite.

```sh
npm install canvas-toolkit-lib
```

Give the canvas an explicit CSS size. `data-ct-auto-resize` synchronizes its logical viewport and backing bitmap with the displayed size.

```html
<style>
  body { margin: 0; }
  canvas { display: block; width: 100vw; height: 100dvh; touch-action: none; }
</style>
<canvas id="app" data-ct-auto-resize></canvas>
<script type="module" src="./main.ts"></script>
```

```ts
import {
    CApplication, CMainWindow, CWidget, CVBoxLayout, CLabel, CPushButton
} from "canvas-toolkit-lib";

const canvas = document.querySelector<HTMLCanvasElement>("#app");
if (canvas === null) throw new Error("Canvas element not found.");

const app = new CApplication(canvas);
const window = new CMainWindow();
window.resize(app.paintDevice().width(), app.paintDevice().height());
const central = new CWidget();
const layout = new CVBoxLayout();
const label = new CLabel(central);
label.setText("Ready");
const button = new CPushButton(central);
button.setText("Run");
button.setMaximumSize(150, 36);
button.clicked.connect(() => label.setText("Done"));
layout.addWidget(label);
layout.addWidget(button);
layout.addStretch(1);
central.setLayout(layout);
window.setCentralWidget(central);
app.run();
```

Create `CApplication` before any widget. A root filling the original viewport follows canvas resizing. `CMainWindow` reserves space for its menu, toolbars and status bar and resizes its central widget.

Call `app.destroy()` to dispose the application. Destroying a widget releases its owned children.

From the repository root, `npm.cmd run dev` starts the main demo on Windows. Use `npm.cmd exec -- vite examples/full-viewport` for a focused application example.
