# Canvas Toolkit

Canvas Toolkit is a lightweight UI toolkit written in TypeScript for building graphical user interfaces directly on an HTML `<canvas>` element.

The goal of the project is to provide a structured, object-oriented widget system inspired by traditional desktop UI frameworks such as Qt, while remaining lightweight, framework-independent, and suitable for modern browser applications.

## Goals

Canvas Toolkit aims to provide:

* A reusable hierarchy of canvas-based UI widgets
* Object ownership through a common `CObject` base class
* A signal/slot-style communication mechanism
* Mouse and keyboard event handling
* Widget positioning, sizing and layout management
* Focus and input management
* A painting abstraction over the Canvas 2D API
* A clean and strongly typed TypeScript API

The library does not depend on React, Vue, Angular, or other UI frameworks.

## Project Structure

```text
src/
├── core/        Core classes such as CObject and CApplication
├── geometry/    Points, sizes, rectangles and related geometry
├── events/      Event classes and event handling
├── painting/    Canvas drawing abstractions
├── widgets/     UI widgets
├── layouts/     Widget layout management
├── input/       Mouse, keyboard and focus handling
└── internal/    Internal implementation details

examples/
└── basic/       Basic usage examples

tests/
├── core/
├── geometry/
└── widgets/
```

## Basic Architecture

The toolkit is built around a common object hierarchy:

```text
CObject
├── CApplication
└── CWidget
    ├── CFrame
    ├── CLabel
    ├── CButton
    └── ...
```

`CObject` provides the foundation for object ownership and communication, while `CWidget` adds geometry, rendering, visibility and input handling.

Higher-level widgets are built on top of these basic components.

## Example

The intended API will look roughly like this:

```ts
import {
    CApplication,
    CButton
} from "canvas-toolkit";

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");

if (!canvas) {
    throw new Error("Canvas element not found");
}

const app = new CApplication(canvas);

const button = new CButton();
button.setGeometry(20, 20, 120, 40);
button.setText("Hello");

button.clicked.connect(() => {
    console.log("Button clicked");
});

app.setRootWidget(button);
app.start();
```

The exact API is still under development and may change as the toolkit evolves.

## Status

Canvas Toolkit is currently in the early stages of development.

The initial work focuses on establishing the core architecture, including the object model, widget hierarchy, event system, painting system and layout infrastructure.

## License

Canvas Toolkit is released under the MIT License.
