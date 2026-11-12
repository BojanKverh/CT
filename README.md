# Canvas Toolkit

Canvas Toolkit is a framework-independent TypeScript UI toolkit that renders widgets directly onto an HTML `<canvas>`. Its object ownership, signals, widgets, layouts and model/view APIs are inspired by Qt. It does not require React, Vue or Angular.

The package is currently version **0.1.0**. The API is under active development and may change.

## Getting started

From the repository directory:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite to explore the widget demo in `examples/basic`. The demo includes menus, dialogs, data views, editors, animations and light/dark palettes.

Use a current Node.js version compatible with the dependencies in `package-lock.json`.

## Full-viewport resize demo

Run `npm exec -- vite examples/full-viewport` from the repository directory (use `npm.cmd` in PowerShell if script execution is disabled). Open the URL printed by Vite and resize the browser window. The example is a small notes editor with a menu bar and a grid layout. Its status bar displays the live sizes of the main window and central widget.

## Minimal example

In an application using a TypeScript-aware bundler, provide a canvas and load your entry module:

```html
<canvas id="canvas" width="640" height="400"></canvas>
<script type="module" src="./main.ts"></script>
```

When working directly inside this repository, `main.ts` can import from `./src/index.ts`:

```ts
import { CApplication, CWidget, CLabel, CPushButton } from "./src/index.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
if (canvas === null) {
    throw new Error("Canvas element not found.");
}

// Create the application before creating widgets.
const app = new CApplication(canvas);
const window = new CWidget();
window.setGeometry(0, 0, 640, 400);

const label = new CLabel(window);
label.setGeometry(20, 20, 300, 30);
label.setText("Welcome to Canvas Toolkit");

const button = new CPushButton(window);
button.setGeometry(20, 65, 160, 36);
button.setText("Click me");
button.clicked.connect(() => label.setText("Hello from Canvas Toolkit!"));

window.show();
app.run();

// Call app.destroy() when the application is no longer needed.
```

Adjust the import path for your entry file. For a consumer that resolves this package as `canvas-toolkit`, import from `"canvas-toolkit"` after building the library with `npm run build`.

Only one `CApplication` may exist at a time. Widgets created without a parent are registered as top-level widgets automatically; child widgets receive their parent through the constructor. Rendering is enabled with `run()` and scheduled when widgets request updates.

## Features

| Area | Available functionality |
| --- | --- |
| Core | Parent/child ownership, typed signals, actions, shortcuts, timers, undo/redo, settings and clipboard |
| Input | Pointer and keyboard events, focus and tab order, mouse capture, context menus, drag and drop |
| Painting and styling | Canvas 2D paint device and engine, `CPainter`, pixmaps, icons, fonts, palettes, CSS palettes and widget style options |
| Basic controls | Labels, push/tool/split buttons, checkboxes, radio buttons, category buttons, toggle switches, sliders, dials and progress bars |
| Editors | Line, plain-text and rich-text editors; text browser; number, date and time editors; key-sequence and tag editors; validation and completion |
| Containers | Frames, collapsible group boxes, scroll areas, splitters, tabs, stacked widgets and toolboxes |
| Application UI | Main windows, menus, toolbars, status bars, dock widgets, tooltips, splash screens, image views and navigation paths |
| Dialogs | Base dialogs, message/input/file/color/progress dialogs, button boxes and wizard pages/dialogs |
| Model/view | List, table and tree views; item-based widgets; delegates; selection models; sorting/filtering proxies and data-widget mapping |
| SQL models | Table and relational models, edit strategies, filters, relations, in-memory and fetch-based adapters |
| Layouts | Horizontal/vertical box, grid, form and wrapping flow layouts, spacing, alignment and size policies |
| Animation and feedback | Variant/property animations, easing, parallel/sequential groups, pauses, busy indicators, loading overlays and ratings |

The SQL fetch adapter communicates with a backend; it does not connect a browser directly to a database server. See the classes under `src/models` for the adapter contract.

The package entry point is `src/index.ts`. Additional base classes and implementation modules live in their corresponding source directories.

## Architecture

- `CObject` manages parent/child ownership; `destroy()` recursively releases children and detaches the object.
- `CSignal` connects typed callbacks and emits values to connected slots. `connect()` returns a disconnect function.
- `CApplication` integrates the canvas with browser events, dispatches input, manages focus/windows/popups and schedules repainting.
- `CWidget` adds geometry, visibility, enabled state, focus, layout and painting behavior. Custom widgets extend it and override event handlers such as `paintEvent()`.
- `CPainter` forwards drawing operations to a paint engine. The canvas implementation uses the browser Canvas 2D API.
- Styles and palettes control widget appearance; layouts arrange child widgets; models and delegates supply data and editing behavior for views.

To enable one-finger vertical scrolling in a `CScrollArea`, apply `touch-action: none` to the application's canvas so the browser leaves touch gestures there to the toolkit. A short tap still activates the widget under the finger.

For responsive canvases, set `data-ct-auto-resize` on the element and give it an explicit CSS size. `CApplication` observes its displayed size and updates the backing bitmap. `app.resizeCanvas(width, height)` is also available for manual resizing. Top-level widgets that fill the old viewport follow its new size.

## Project structure

```text
src/
  animation/   Animation drivers, values, properties and groups
  core/        Application, ownership, signals, actions and utilities
  dialogs/     Dialogs and wizards
  events/      Input, focus, context-menu and drag/drop events
  geometry/    Points, sizes, rectangles and size policies
  gui/         Styles, palettes, fonts, icons and text documents
  layouts/     Box, grid, form and flow layouts and layout items
  models/      Item models, proxies, selection and SQL adapters
  painting/    Paint devices, engines, painter and pixmaps
  util/        Validators, text selection and number expressions
  widgets/     Controls, editors, containers and views
  index.ts     Package exports
examples/
  basic/       Current interactive demo
  old/         Older example
tests/        Vitest tests grouped by subsystem
dist/         Generated JavaScript, declarations and source maps
```

## Development

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the interactive demo with Vite |
| `npm run typecheck` | Check source and test types without emitting files |
| `npm run build` | Compile `src` into `dist`, including TypeScript declarations and source maps |
| `npm test` | Run the full Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

Run a single test file or select tests by name:

```sh
npm test -- tests/widgets/CGroupBox.test.ts
npm test -- -t "CGroupBox"
```

The TypeScript configuration enables strict checks, including `noImplicitOverride`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. The regular type check includes `src` and `tests`; the build emits library source only. The demo is outside those type-check inputs.

The full suite passed **5,321 tests across 161 files** on 6 November 2026. This records that run; it is not a live CI status badge.

## License

MIT, as declared in `package.json`.

