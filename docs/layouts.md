# Layouts

A layout calculates child geometry inside a widget. Install it with `setLayout()`. Layouts combine `sizeHint()`, `minimumSize()`, `maximumSize()`, size policies and stretch factors. Explicit `setGeometry()` calls can be replaced by a subsequent layout update.

The default size policy permits expansion. Bound small controls when their containers have spare space.

```ts
const layout = new CVBoxLayout();
layout.setContentsMargins(12, 12, 12, 12);
layout.setSpacing(8);
const action = new CPushButton(panel);
action.setText("Apply");
action.setMaximumSize(150, 36);
layout.addWidget(action);
layout.addWidget(editor, 1);
panel.setLayout(layout);
```

`CHBoxLayout` distributes space horizontally and `CVBoxLayout` vertically. Stretch factors allocate distributable space within size constraints. `addStretch(1)` reserves flexible space without a visible control.

`CGridLayout` uses zero-based rows and columns. Spans follow the coordinates.

```ts
const grid = new CGridLayout();
grid.addWidget(nameLabel, 0, 0);
grid.addWidget(nameEdit, 0, 1);
grid.addWidget(notes, 1, 0, 1, 2);
grid.setColumnStretch(1, 1);
grid.setRowStretch(1, 1);
panel.setLayout(grid);
```

`CFormLayout` pairs labels and fields. Generated labels become buddies of their fields. Explicit labels use `setBuddy(field)`. Enable long-label wrapping with `setWordWrap(true)`. `setStackBelowWidth(420)` stacks labels above fields when narrow. Its default is `null`, so stacking is opt-in.

A layout does not create a scroll area. Put content in `CScrollArea` when scrolling is required. Content dimensions define the scroll range. Recalculate content size when its preferred height changes; `heightForWidth(width)` returns a preferred height or `-1` when unavailable.

```ts
const area = new CScrollArea(panel);
const content = new CWidget();
content.resize(400, 800);
area.setWidget(content);
```

A Tab-focused descendant is brought into view. At scroll boundaries, wheel and touch input can continue in an enclosing scroll area. One-finger panning requires `touch-action: none` on the canvas and locks its initial axis.

`CSplitter` supports dragging, Tab focus and axis-specific arrow keys. Use `setCollapsible(index, false)` when a pane must retain its minimum extent.
