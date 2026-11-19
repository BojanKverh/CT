/** @module Widgets/CImageView */
import { CApplication } from "../core/CApplication.js";
import { CSignal } from "../core/CSignal.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, type CMouseEvent } from "../events/CMouseEvent.js";
import type { CWheelEvent } from "../events/CWheelEvent.js";
import { CPoint } from "../geometry/CPoint.js";
import { CRect } from "../geometry/CRect.js";
import { CSize } from "../geometry/CSize.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import type { CPixmap } from "../painting/CPixmap.js";
import { CScrollArea } from "./CScrollArea.js";
import { CWidget } from "./CWidget.js";

/** Image viewer with anchored wheel zoom, fit mode and drag panning. */
export class CImageView extends CScrollArea {
    /** Lower supported image magnification. */
    static readonly MinimumZoom = 0.000001;
    /** Upper supported image magnification. */
    static readonly MaximumZoom = 64;
    #pixmap: CPixmap | null = null;
    #zoom = 1;
    #fit = true;
    #checkerboard = true;
    #surface: CImageViewSurface;
    #drag: { x: number; y: number; scrollX: number; scrollY: number } | null = null;
    /**
    * Emitted with the new image scale factor after zoom changes.
    * @group Signals
    */
    readonly zoomChanged = new CSignal<[number]>();

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
        super(parent);
        this.setFocusPolicy(CFocusPolicy.StrongFocus);
        this.#surface = new CImageViewSurface(this);
        super.setWidget(this.#surface);
        this.#layoutImage();
    }

    /**
    * Assigned raster image used for display.
    * The initial value is `null`.
    */
    pixmap(): CPixmap | null { return this.#pixmap; }
    /** Invalid or null images clear the viewer. New images start in fit mode. */
    setPixmap(pixmap: CPixmap | null): void {
        this.#endDrag();
        this.#pixmap = pixmap !== null && !pixmap.isNull()
            && Number.isFinite(pixmap.width()) && Number.isFinite(pixmap.height()) ? pixmap : null;
        this.#fit = true;
        this.scrollTo(0, 0);
        this.#layoutImage();
    }
    /**
    * Removes the current image and resets its display state.
    */
    clear(): void { this.setPixmap(null); }
    /**
    * Ratio between image pixels and displayed logical pixels.
    * The initial value is `1`.
    */
    zoomFactor(): number { return this.#zoom; }
    /**
    * Whether the image automatically fits its available viewport.
    * The initial value is `true`.
    */
    isFitToWindow(): boolean { return this.#fit; }
    /**
    * Reports whether a checkerboard is drawn behind image transparency.
    */
    checkerboardVisible(): boolean { return this.#checkerboard; }
    /**
    * Shows or hides the transparency checkerboard and requests repaint.
    */
    setCheckerboardVisible(visible: boolean): void {
        this.#checkerboard = visible; this.#surface.update();
    }
    override sizeHint(): CSize { return new CSize(480, 320); }
    override cursor(): CCursorShape {
        return !this.isEnabled() ? CCursorShape.Disabled
            : this.#drag !== null ? CCursorShape.Grabbing : CCursorShape.Grab;
    }

    /** Sets magnification around a viewport-relative anchor (centre by default). */
    setZoomFactor(factor: number, anchor?: CPoint): void {
        if (this.#pixmap === null || !Number.isFinite(factor) || factor <= 0) return;
        factor = Math.max(CImageView.MinimumZoom, Math.min(CImageView.MaximumZoom, factor));
        const oldRect = this.imageRect();
        const x = anchor?.x() ?? this.viewport().width() / 2;
        const y = anchor?.y() ?? this.viewport().height() / 2;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const imageX = (this.scrollX() + x - oldRect.x()) / this.#zoom;
        const imageY = (this.scrollY() + y - oldRect.y()) / this.#zoom;
        this.#fit = false;
        this.#setZoom(factor);
        this.#layoutImage();
        const rect = this.imageRect();
        this.scrollTo(rect.x() + imageX * factor - x, rect.y() + imageY * factor - y);
    }
    /**
    * Increases image magnification within the supported zoom range.
    */
    zoomIn(): void { this.setZoomFactor(this.#zoom * 1.25); }
    /**
    * Decreases image magnification within the supported zoom range.
    */
    zoomOut(): void { this.setZoomFactor(this.#zoom / 1.25); }
    /**
    * Shows the image at one logical display pixel per image pixel.
    */
    actualSize(): void { this.setZoomFactor(1); }
    /**
    * Enables automatic image scaling to fit the viewport.
    */
    fitToWindow(): void { this.#fit = true; this.#layoutImage(); this.scrollTo(0, 0); }

    /** Image bounds in the scrolled content coordinate system. */
    imageRect(): CRect {
        const width = (this.#pixmap?.width() ?? 0) * this.#zoom;
        const height = (this.#pixmap?.height() ?? 0) * this.#zoom;
        return new CRect(Math.max(0, (this.viewport().width() - width) / 2),
            Math.max(0, (this.viewport().height() - height) / 2), width, height);
    }

    override setGeometry(x: number, y: number, width: number, height: number): void {
        super.setGeometry(x, y, width, height);
        this.#layoutImage();
    }
    override setVisible(visible: boolean): void {
        if (!visible) this.#endDrag();
        super.setVisible(visible);
    }
    override setEnabled(enabled: boolean): void {
        if (!enabled) this.#endDrag();
        super.setEnabled(enabled);
    }
    override destroy(): void { this.#endDrag(); super.destroy(); }

    #setZoom(zoom: number): void {
        if (zoom === this.#zoom) return;
        this.#zoom = zoom; this.zoomChanged.emit(zoom);
    }
    #layoutImage(): void {
        if (this.#fit) {
            const width = Math.max(0, this.width() - 2 * this.frameWidth());
            const height = Math.max(0, this.height() - 2 * this.frameWidth());
            if (this.#pixmap !== null && width > 0 && height > 0)
                this.#setZoom(Math.min(width / this.#pixmap.width(), height / this.#pixmap.height()));
            else this.#setZoom(1);
        }
        // First establish scrollbar visibility from image size alone, then extend
        // the content to fill the resulting viewport for centring and background.
        const width = Math.max(0, Math.ceil((this.#pixmap?.width() ?? 0) * this.#zoom - 1e-7));
        const height = Math.max(0, Math.ceil((this.#pixmap?.height() ?? 0) * this.#zoom - 1e-7));
        this.#surface.resize(width, height);
        this.updateScrollBars();
        this.#surface.resize(Math.max(width, this.viewport().width()), Math.max(height, this.viewport().height()));
        this.updateScrollBars();
        this.#surface.update();
    }
    #endDrag(): void {
        if (this.#drag === null) return;
        this.#drag = null;
        if (CApplication.exists()) CApplication.instance().releaseMouse();
    }
    protected override wheelEvent(event: CWheelEvent): void {
        if (!this.isEnabled() || this.#pixmap === null || !Number.isFinite(event.deltaY()) || event.deltaY() === 0) {
            event.ignore(); return;
        }
        const pos = event.pos();
        const anchor = pos === null ? undefined : new CPoint(pos.x() - this.viewport().x(), pos.y() - this.viewport().y());
        this.setZoomFactor(this.#zoom * Math.exp(-Math.max(-600, Math.min(600, event.deltaY())) * 0.002), anchor);
        event.accept();
    }
    protected override mousePressEvent(event: CMouseEvent): void {
        if (!this.isEnabled() || this.#pixmap === null || event.button() !== CMouseButton.LeftButton) {
            event.ignore(); return;
        }
        this.setFocus();
        this.#drag = { x: event.x(), y: event.y(), scrollX: this.scrollX(), scrollY: this.scrollY() };
        CApplication.instance().grabMouse(this);
        event.accept();
    }
    protected override mouseMoveEvent(event: CMouseEvent): void {
        if (this.#drag === null) { event.ignore(); return; }
        this.scrollTo(this.#drag.scrollX + this.#drag.x - event.x(), this.#drag.scrollY + this.#drag.y - event.y());
        event.accept();
    }
    protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (this.#drag === null || event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        this.#endDrag(); event.accept();
    }
    protected override mouseDoubleClickEvent(event: CMouseEvent): void {
        if (!this.isEnabled() || this.#pixmap === null || event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        this.#endDrag();
        if (this.#fit) this.actualSize(); else this.fitToWindow();
        event.accept();
    }
    protected override keyPressEvent(event: CKeyEvent): void {
        if (!this.isEnabled() || this.#pixmap === null) { event.ignore(); return; }
        switch (event.key()) {
            case "+": case "=": this.zoomIn(); break;
            case "-": this.zoomOut(); break;
            case "0": this.actualSize(); break;
            case "f": case "F": this.fitToWindow(); break;
            case "ArrowLeft": this.setScrollX(this.scrollX() - 32); break;
            case "ArrowRight": this.setScrollX(this.scrollX() + 32); break;
            case "ArrowUp": this.setScrollY(this.scrollY() - 32); break;
            case "ArrowDown": this.setScrollY(this.scrollY() + 32); break;
            default: event.ignore(); return;
        }
        event.accept();
    }
}

/** Internal content widget; ordinary events bubble to the viewer in local coordinates. */
class CImageViewSurface extends CWidget {
    constructor(private readonly view: CImageView) { super(view.viewport()); }
    override cursor(): CCursorShape { return this.view.cursor(); }
    protected override paintEvent(painter: CPainter): void {
        const view = this.view, pixmap = view.pixmap();
        const left = view.scrollX(), top = view.scrollY();
        const right = Math.min(this.width(), left + view.viewport().width());
        const bottom = Math.min(this.height(), top + view.viewport().height());
        painter.setBrush(this.palette().color(CPaletteColorRole.Base).toCss());
        painter.fillRect(new CRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top)));
        if (pixmap === null) return;
        const rect = view.imageRect();
        painter.save();
        try {
            painter.clipRect(rect);
            if (view.checkerboardVisible()) {
                const tile = 12;
                const startX = Math.max(0, Math.floor((left - rect.x()) / tile));
                const startY = Math.max(0, Math.floor((top - rect.y()) / tile));
                const endX = Math.ceil((Math.min(right, rect.x() + rect.width()) - rect.x()) / tile);
                const endY = Math.ceil((Math.min(bottom, rect.y() + rect.height()) - rect.y()) / tile);
                for (let y = startY; y < endY; ++y) for (let x = startX; x < endX; ++x) {
                    painter.setBrush((x + y) % 2 === 0 ? "#ffffff" : "#d9d9d9");
                    painter.fillRect(new CRect(rect.x() + x * tile, rect.y() + y * tile, tile, tile));
                }
            }
            painter.drawPixmap(pixmap, rect.x(), rect.y(), rect.width(), rect.height());
        } finally { painter.restore(); }
    }
}
