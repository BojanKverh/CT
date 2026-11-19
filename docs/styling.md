# Styling

Widgets draw through the application's `CStyle`. `CDefaultStyle` paints the standard controls from style options containing geometry, state, palette and font. Override a style drawing method when a visual change should apply across controls of a type.

## Palettes

`palette()` returns a copy of the effective palette. Widgets without a local override inherit the nearest ancestor override or application palette. Mutate the copy and install it with `setPalette()`.

```ts
const palette = panel.palette();
palette.setColor(CPaletteColorRole.Base, new CColor(24, 28, 34));
palette.setColor(CPaletteColorRole.Text, new CColor(235, 238, 242));
panel.setPalette(palette);
```

Descendants with their own overrides keep those overrides. `setPalette(palette, true)` explicitly replaces descendant palettes too. `resetPalette()` resumes inheritance; `resetPalette(true)` also clears descendant overrides.

Use `Text` for content, `WindowText` for container text, `ButtonText` for button captions and `Highlight` with `HighlightedText` for selected content. Match the role to the background rather than hard-coding a light or dark color.

`CCssPalette` reads the supported `--ct-*` custom properties from the canvas. The basic demo shows a complete light and dark theme.

## Fonts and icons

`font()` returns a copy. Set its logical pixel size, then install it with `setFont()`. Pass `true` to explicitly propagate a font to existing descendants.

```ts
const font = label.font();
font.setPixelSize(20);
label.setFont(font);
```

Load a raster asset into `CPixmap`, wrap it in `CIcon`, and assign the icon after loading completes. Keep assets in the application's public files.

```ts
const icon = new CIcon(await CPixmap.fromUrl("/icons/save.png"));
save.setIcon(icon);
save.setIconPosition(CIconPosition.Left);
```

Push buttons center icon and caption together. The default side is left. `setIcon(null)` removes it. `CIcon` can hold mode-specific pixmaps for normal, disabled, active and selected states, with fallback when a requested variant is absent. Standard dialog OK and Cancel buttons provide their own colored icons.
