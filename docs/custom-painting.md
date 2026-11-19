# Custom painting

Subclass `CWidget` and override `paintEvent(painter)`. The application supplies local coordinates and clips drawing to the widget. `CPainter` forwards operations to a paint device.

```ts
class MessagePanel extends CWidget {
    protected override paintEvent(painter: CPainter): void {
        painter.setBrush(this.palette().color(CPaletteColorRole.Base).toCss());
        painter.fillRect(this.rect());
        painter.setPen(this.palette().color(CPaletteColorRole.Text).toCss());
        painter.setFont(this.font());
        painter.setTextAlign("left");
        painter.setTextBaseline("middle");
        painter.drawText("Ready", 12, this.height() / 2);
    }
}
```

Use `setPen()` for text and outlines and `setBrush()` for filled areas. Text is drawn with the pen color. Set text alignment and baseline explicitly when positioning text.

Save and restore temporary clipping and transformations before painting returns. The same painter state is used to render descendants after the parent's paint handler.

```ts
painter.save();
try {
    painter.clipRect(new CRect(12, 0, 120, this.height()));
    painter.drawText(longCaption, 12, this.height() / 2);
} finally {
    painter.restore();
}
```

Call `update()` after state changes to schedule repaint. Call `updateGeometry()` when preferred size changes. Override `sizeHint()` to supply a layout hint, using `fontMetrics().textWidth()` and `height()` for text measurement.

Mouse positions in protected handlers are local. `mapToCanvas()` and `mapFromCanvas()` convert positions across containers. An accepted mouse press obtains capture, so later movement and release reach the pressed widget during a drag. Ignore unhandled events so the application can propagate them.

Widget coordinates use logical pixels. `CApplication` handles bitmap scaling for the device pixel ratio when canvas auto-resizing is enabled.
