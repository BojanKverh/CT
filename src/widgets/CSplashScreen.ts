import { CVariantAnimation } from "../animation/CVariantAnimation.js";
import { CApplication } from "../core/CApplication.js";
import { CAlignment } from "../core/CAlignment.js";
import { CSignal } from "../core/CSignal.js";
import { CMouseButton, type CMouseEvent } from "../events/CMouseEvent.js";
import { CRect } from "../geometry/CRect.js";
import { CSize } from "../geometry/CSize.js";
import type { CColor } from "../gui/CColor.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CPixmap } from "../painting/CPixmap.js";
import type { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";

/** A frameless, non-modal startup window. Yield to the event loop while loading. */
export class CSplashScreen extends CWidget {
    #pixmap: CPixmap | null = null;
    #message = "";
    #alignment: CAlignment = CAlignment.Left | CAlignment.Bottom;
    #messageColor: string | null = null;
    #disposed = false;
    #opacity = 1;
    #fade: CVariantAnimation | null = null;

    readonly messageChanged = new CSignal<[string]>();

    /** Creates a hidden splash, sized to its image or to a 400 x 240 fallback. */
    constructor(pixmap: CPixmap | null = null) {
        super();
        this.setFocusPolicy(CFocusPolicy.NoFocus);
        this.hide();
        CApplication.instance().unregisterTopLevelWidget(this);
        this.setPixmap(pixmap);
    }

    pixmap(): CPixmap | null { return this.#pixmap; }
    message(): string { return this.#message; }

    /** Replaces the background image and adopts its natural dimensions. */
    setPixmap(pixmap: CPixmap | null): void {
        this.#pixmap = pixmap;
        const hint = this.sizeHint();
        this.resize(hint.width(), hint.height());
        this.update();
    }

    override sizeHint(): CSize {
        const pixmap = this.#pixmap;
        return pixmap !== null && !pixmap.isNull()
            && Number.isFinite(pixmap.width()) && Number.isFinite(pixmap.height())
            ? new CSize(pixmap.width(), pixmap.height()) : new CSize(400, 240);
    }

    /** Displays startup text. Colors may be CColor values or CSS color strings. */
    showMessage(message: string, alignment: CAlignment = CAlignment.Left | CAlignment.Bottom,
        color?: CColor | string): void {
        const css = typeof color === "string" ? color : color?.toCss() ?? null;
        const changed = this.#message !== message;
        if (!changed && this.#alignment === alignment && this.#messageColor === css) return;
        this.#message = message;
        this.#alignment = alignment;
        this.#messageColor = css;
        this.update();
        if (changed) this.messageChanged.emit(message);
    }

    clearMessage(): void {
        if (this.#message === "") return;
        this.#message = "";
        this.update();
        this.messageChanged.emit("");
    }

    /** Uses the existing window stack; no modal scope or focus change is introduced. */
    override setVisible(visible: boolean): void {
        if (this.#disposed && visible) return;
        this.#cancelFade();
        this.#opacity = 1;
        const app = CApplication.instance();
        if (visible) {
            if (this.x() === 0 && this.y() === 0) {
                const canvas = app.canvas();
                this.move(Math.max(0, Math.floor((canvas.width - this.width()) / 2)),
                    Math.max(0, Math.floor((canvas.height - this.height()) / 2)));
            }
            app.registerWindowWidget(this);
        } else {
            app.unregisterWindowWidget(this);
        }
        super.setVisible(visible);
    }

    close(): void { this.hide(); }

    /** Fades out over duration milliseconds. Zero/invalid durations hide immediately. */
    fadeOut(duration = 300): void {
        if (this.#disposed || !this.isVisible()) return;
        this.#cancelFade();
        if (!Number.isFinite(duration) || duration <= 0) { this.hide(); return; }
        const fade = new CVariantAnimation();
        fade.setStartValue(this.#opacity);
        fade.setEndValue(0);
        fade.setDuration(duration);
        this.#fade = fade;
        fade.valueChanged.connect(value => {
            if (this.#fade !== fade) return;
            this.#opacity = value;
            this.update();
        });
        fade.finished.connect(() => { if (this.#fade === fade) this.hide(); });
        fade.start();
    }

    #cancelFade(): void {
        const fade = this.#fade;
        this.#fade = null;
        fade?.destroy();
    }

    /** Fades this window and all its contents without changing other windows. */
    override render(painter: CPainter): void {
        if (!this.isVisible()) return;
        if (this.#opacity === 1) { super.render(painter); return; }
        painter.save();
        try {
            painter.setOpacity(painter.opacity() * this.#opacity);
            super.render(painter);
        } finally { painter.restore(); }
    }

    /** Shows the main window, then fades out. Pass zero for immediate dismissal. */
    finish(mainWindow: CWidget, duration = 300): void {
        if (mainWindow === this) return;
        mainWindow.show();
        this.fadeOut(duration);
    }

    override destroy(): void {
        if (this.#disposed) return;
        this.#disposed = true;
        this.close();
        super.destroy();
    }

    protected override paintEvent(painter: CPainter): void {
        painter.setBrush(this.palette().color(CPaletteColorRole.Base).toCss());
        painter.fillRect(this.rect());
        const pixmap = this.#pixmap;
        if (pixmap !== null && !pixmap.isNull()
            && Number.isFinite(pixmap.width()) && Number.isFinite(pixmap.height())) {
            const scale = Math.min(this.width() / pixmap.width(), this.height() / pixmap.height());
            const width = pixmap.width() * scale, height = pixmap.height() * scale;
            painter.drawPixmap(pixmap, (this.width() - width) / 2, (this.height() - height) / 2, width, height);
        }
        this.drawContents(painter);
    }

    /** Subclasses can customize the text layer while retaining the background. */
    protected drawContents(painter: CPainter): void {
        if (this.#message === "") return;
        const padding = 10;
        const rect = new CRect(padding, padding, Math.max(0, this.width() - 2 * padding),
            Math.max(0, this.height() - 2 * padding));
        const lines = this.#message.split(/\r\n?|\n/);
        const lineHeight = this.fontMetrics().height();
        const height = lines.length * lineHeight;
        const alignment = this.#alignment;
        const x = (alignment & CAlignment.Right) ? rect.x() + rect.width()
            : (alignment & CAlignment.HCenter) ? rect.x() + rect.width() / 2 : rect.x();
        const y = rect.y() + Math.max(0, (alignment & CAlignment.Bottom) ? rect.height() - height
            : (alignment & CAlignment.VCenter) ? (rect.height() - height) / 2 : 0);
        painter.save();
        try {
            painter.clipRect(rect);
            painter.setFont(this.font());
            painter.setPen(this.#messageColor ?? this.palette().color(CPaletteColorRole.Text).toCss());
            painter.setTextAlign((alignment & CAlignment.Right) ? "right" : (alignment & CAlignment.HCenter) ? "center" : "left");
            painter.setTextBaseline("top");
            for (let i = 0; i < lines.length; ++i) painter.drawText(lines[i]!, x, y + i * lineHeight);
        } finally { painter.restore(); }
    }

    /** Like a conventional splash screen, a left click dismisses the startup image. */
    protected override mousePressEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton) { event.ignore(); return; }
        this.close();
        event.accept();
    }
}
