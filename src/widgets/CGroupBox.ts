import { CSignal } from "../core/CSignal.js";
import { CApplication } from "../core/CApplication.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import type { CFocusEvent } from "../events/CFocusEvent.js";
import { CMouseButton, type CMouseEvent } from "../events/CMouseEvent.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import type { CFont } from "../gui/CFont.js";
import { CSize } from "../geometry/CSize.js";
import { CSizePolicy, CSizePolicyType } from "../geometry/CSizePolicy.js";
import { CWidget } from "./CWidget.js";
import type { CPainter } from "../painting/CPainter.js";
import { CRect } from "../geometry/CRect.js";
import { CStyleOptionGroupBox } from "../gui/CStyleOptionGroupBox.js";

/** Implements the group box widget. */
export class CGroupBox extends CWidget {
	#m_title: string;
    #collapsible = false;
    #collapsed = false;
    #pressed = false;
    #spacePressed = false;
    #savedFocusPolicy = CFocusPolicy.NoFocus;
    #expandedHeight = 0;
    #expandedWidthHint = 0;
    readonly collapsedChanged = new CSignal<[boolean]>();

	/** Creates a new instance. */
	constructor(title = "", parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.#m_title = title;
	}

	/** Provides title behavior. */
	title(): string {
		return this.#m_title;
	}

	/** Sets the title. */
	setTitle(title: string): void {
		/** Provides if behavior. */
		if (this.#m_title === title)
			return;

		this.#m_title = title;
        this.updateGeometry();
		this.update();
	}

    isCollapsible(): boolean { return this.#collapsible; }
    isCollapsed(): boolean { return this.#collapsed; }
    /** Disabling collapsing also expands the contents and restores the previous focus policy. */
    setCollapsible(collapsible: boolean): void {
        if (this.#collapsible === collapsible) return;
        if (!collapsible) this.setCollapsed(false);
        this.#collapsible = collapsible; this.#cancel();
        if (collapsible) { this.#expandedHeight = this.height(); this.#savedFocusPolicy = this.focusPolicy(); this.setFocusPolicy(CFocusPolicy.StrongFocus); }
        else this.setFocusPolicy(this.#savedFocusPolicy);
        this.layout()?.update(); this.updateGeometry(); this.update();
    }
    /** Ignored unless collapsible is enabled. */
    setCollapsed(collapsed: boolean): void {
        if (!this.#collapsible || this.#collapsed === collapsed) return;
        const app = CApplication.instance();
        const inside = (widget: CWidget | null): boolean => {
            for (let owner = widget; owner !== null; owner = owner.parent()) if (owner === this) return widget !== this;
            return false;
        };
        const moveFocus = collapsed && inside(app.focusWidget());
        if (collapsed) {
            this.#expandedHeight = this.height(); this.#expandedWidthHint = this.sizeHint().width();
            if (inside(app.mouseGrabber())) app.releaseMouse();
            if (moveFocus) app.closeAllPopups();
        }
        this.#collapsed = collapsed; this.#cancel();
        if (moveFocus) { this.setFocus(); if (!this.hasFocus()) app.setFocusWidget(null); }
        this.notifyChildrenVisibilityChanged();
        if (!this.parent()?.layout()) this.resize(this.width(), collapsed ? this.headerHeight() : Math.max(this.#expandedHeight, this.headerHeight()));
        if (!collapsed) this.layout()?.update();
        this.updateGeometry(); this.update(); this.collapsedChanged.emit(collapsed);
    }
    headerHeight(): number { return this.#collapsible ? Math.max(24, Math.ceil(this.fontMetrics().height()) + 8) : this.fontMetrics().height(); }
    /** The entire title row is clickable; empty titles still expose the chevron. */
    headerRect(): CRect { return new CRect(0, 0, this.width(), Math.min(this.height(), this.headerHeight())); }
    protected override childrenAreVisible(): boolean { return !this.#collapsed; }
    override sizePolicy(): CSizePolicy {
        const policy = super.sizePolicy();
        if (this.#collapsed) { policy.setVerticalPolicy(CSizePolicyType.Fixed); policy.setHeightForWidth(false); }
        return policy;
    }
    override sizeHint(): CSize {
        const hint = super.sizeHint(); if (!this.#collapsible) return hint;
        const width = Math.max(this.fontMetrics().textWidth(this.title()) + 40, this.#collapsed ? this.#expandedWidthHint : hint.width());
        let height = this.headerHeight() + hint.height();
        let preferredWidth = width;
        if (this.layout() === null && !this.#collapsed) {
            height = Math.max(height, this.#expandedHeight);
            for (const child of this.children()) if (child instanceof CWidget && child.isVisible()) {
                height = Math.max(height, child.y() + child.height()); preferredWidth = Math.max(preferredWidth, child.x() + child.width());
            }
        }
        return new CSize(preferredWidth, this.#collapsed ? this.headerHeight() : height);
    }
    override hasHeightForWidth(): boolean { return !this.#collapsed && super.hasHeightForWidth(); }
    override heightForWidth(width: number): number {
        if (this.#collapsed) return this.headerHeight();
        const height = super.heightForWidth(width);
        return height < 0 || !this.#collapsible ? height : this.headerHeight() + height;
    }
    override setFont(font: CFont, propagate = false): void {
        super.setFont(font, propagate);
        if (this.#collapsible) {
            if (this.#collapsed && !this.parent()?.layout()) this.resize(this.width(), this.headerHeight());
            this.layout()?.update(); this.updateGeometry();
        }
    }
    #hit(event: CMouseEvent): boolean { return event.x() >= 0 && event.x() < this.width() && event.y() >= 0 && event.y() < this.headerRect().height(); }
    #cancel(): void { this.#pressed = this.#spacePressed = false; }
    protected override mousePressEvent(event: CMouseEvent): void {
        if (!this.#collapsible || event.button() !== CMouseButton.LeftButton || !this.#hit(event)) { super.mousePressEvent(event); return; }
        this.#spacePressed = false; this.#pressed = true; this.setFocus(); event.accept(); this.update();
    }
    protected override mouseReleaseEvent(event: CMouseEvent): void {
        if (event.button() !== CMouseButton.LeftButton || !this.#pressed) { super.mouseReleaseEvent(event); return; }
        const toggle = this.#hit(event); this.#pressed = false; event.accept(); if (toggle) this.setCollapsed(!this.#collapsed);
    }
    protected override keyPressEvent(event: CKeyEvent): void {
        if (!this.#collapsible || event.ctrl() || event.alt() || event.meta()) { super.keyPressEvent(event); return; }
        switch (event.key()) {
            case " ": if (!this.#pressed) this.#spacePressed = true; event.accept(); return;
            case "Enter": case "Return": this.setCollapsed(!this.#collapsed); event.accept(); return;
            case "ArrowLeft": this.setCollapsed(true); event.accept(); return;
            case "ArrowRight": this.setCollapsed(false); event.accept(); return;
            case "Escape": this.#cancel(); event.accept(); return;
            default: super.keyPressEvent(event);
        }
    }
    protected override keyReleaseEvent(event: CKeyEvent): void {
        if (event.key() !== " " || !this.#spacePressed) { super.keyReleaseEvent(event); return; }
        this.#spacePressed = false; event.accept();
        if (!event.ctrl() && !event.alt() && !event.meta()) this.setCollapsed(!this.#collapsed);
    }
    protected override focusOutEvent(event: CFocusEvent): void { this.#cancel(); super.focusOutEvent(event); }
    protected override visibilityChangeEvent(): void { this.#cancel(); }
    override setEnabled(enabled: boolean): void { if (!enabled) this.#cancel(); super.setEnabled(enabled); }

	/** Returns the widget's contents rectangle. */
	override contentsRect(): CRect {
		const titleHeight = this.headerHeight();
		const top = titleHeight;
		return new CRect(0, top, this.width(), this.#collapsed ? 0 : Math.max(0, this.height() - top));
	}

    /** Handles the paint event. */
    protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionGroupBox();
		option.initFromGroupBox(this);

		this.style().drawGroupBox(painter, option);
	}
}