import { CSizePolicy, CSizePolicyType } from "../geometry/CSizePolicy.js";
import type { CScrollArea } from "./CScrollArea.js";
import { CApplication } from "../core/CApplication.js";
import { CObject } from "../core/CObject.js";
import { CPoint } from "../geometry/CPoint.js";
import { CRect } from "../geometry/CRect.js";
import { CPainter } from "../painting/CPainter.js";
import { CEvent, CEventType } from "../events/CEvent.js";
import { CMouseEvent } from "../events/CMouseEvent.js";
import { CFocusEvent } from "../events/CFocusEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CWheelEvent } from "../events/CWheelEvent.js";
import { CLayout } from "../layouts/CLayout.js";
import { CSize } from "../geometry/CSize.js";
import { CPalette } from "../gui/CPalette.js";
import type { CStyle } from "../gui/CStyle.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CContextMenuEvent } from "../events/CContextMenuEvent.js";
import { CDragEnterEvent } from "../events/CDragEnterEvent.js";
import { CDragMoveEvent } from "../events/CDragMoveEvent.js";
import { CDragLeaveEvent } from "../events/CDragLeaveEvent.js";
import { CDropEvent } from "../events/CDropEvent.js";
import { CFont } from "../gui/CFont.js";

/** Implements the widget widget. */
export class CWidget extends CObject {
    #m_geometry = new CRect();

    #m_visible = true;
    #m_enabled = true;
	#m_font: CFont;
    #m_layout: CLayout | null = null;
    #m_sizePolicy = new CSizePolicy();
    #m_minimumSize = new CSize(0, 0);
    #m_maximumSize = new CSize(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    #m_palette: CPalette | null = null;
    #m_toolTip = "";
    #m_fontMetrics: CFontMetrics;
    #m_cursor: CCursorShape = CCursorShape.Arrow;
    #m_focusPolicy = CFocusPolicy.NoFocus;
    #m_focusProxy: CWidget | null = null;
    #m_focusProxyOwners = new Set<CWidget>();
    #m_destroyed = false;
    #m_inputBlocker: CWidget | null = null;
    #m_acceptDrops = false;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
        /** Provides super behavior. */
        super(null);

        /** Provides if behavior. */
        if (parent !== null) {
            super.setParent(parent);
            this.#m_font = parent.font();
        } else {
            CApplication.instance().registerTopLevelWidget(this);
            this.#m_font = CApplication.instance().font();
        }

        this.#m_fontMetrics = new CFontMetrics(this.#m_font);
    }

    /**
     * Places the second widget immediately after the first in the keyboard focus order. Both widgets must share a root. Hidden, disabled and non-Tab-focusable widgets are skipped during navigation.
     * @param first First widget in the pair.
     * @param second Widget to place after the first.
     */
    static setTabOrder(first: CWidget, second: CWidget): void {
        CApplication.instance().setTabOrder(first, second);
    }

    /**
     * Looks up the immediate parent widget.
     * @returns The parent widget, or `null` for a top-level widget.
     */
    override parent(): CWidget | null {
        return super.parent() as CWidget | null;
    }

    /**
     * Lists the direct children.
     * @returns A read-only view of the child widgets.
     */
    override children(): readonly CWidget[] {
        return super.children() as readonly CWidget[];
    }

    /**
     * Sets the parent.
     * @param parent Owning object or parent item.
     */
    override setParent(parent: CWidget | null): void {
        const oldParent = this.parent();

        /** Provides if behavior. */
        if (oldParent === parent)
            return;

        super.setParent(parent);

        const app = CApplication.instance();

        /** Provides if behavior. */
        if (oldParent === null)
            app.unregisterTopLevelWidget(this);

        /** Provides if behavior. */
        if (parent === null)
            app.registerTopLevelWidget(this);
        this.#refreshFocusProxyHierarchy();
        this.#clearUnavailableFocus();
        this.#notifyVisibilityChange();
        this.update();
    }

    /**
     * Reads the widget position and size.
     * @returns A new rectangle in parent coordinates, or canvas coordinates for a top-level widget.
     */
    geometry(): CRect {
        return new CRect(this.x(), this.y(), this.width(), this.height());
    }

    /**
     * Reads the widget bounds in local coordinates.
     * @returns A new rectangle starting at `(0, 0)` with the widget's width and height.
     */
    rect(): CRect {
        return new CRect(0, 0, this.width(), this.height());
    }

    /**
     * Reads the left edge of the widget.
     * @returns Horizontal position relative to the parent, or to the canvas for a top-level widget.
     */
    x(): number {
        return this.#m_geometry.x();
    }

    /**
     * Reads the top edge of the widget.
     * @returns Vertical position relative to the parent, or to the canvas for a top-level widget.
     */
    y(): number {
        return this.#m_geometry.y();
    }

    /**
     * Reads the current width of the widget.
     * @returns Width in logical pixels.
     */
    width(): number {
        return this.#m_geometry.width();
    }

    /**
     * Reads the current height of the widget.
     * @returns Height in logical pixels.
     */
    height(): number {
        return this.#m_geometry.height();
    }

    /**
     * Sets the geometry.
     * @param x Horizontal position in parent coordinates.
     * @param y Vertical position in parent coordinates.
     * @param width Width in logical pixels.
     * @param height Height in logical pixels.
     */
    setGeometry(x: number, y: number, width: number, height: number): void {
        /** Provides if behavior. */
        if (x === this.x() && y === this.y() && width === this.width()
            && height === this.height())
            return;

        this.#m_geometry.setGeometry(x, y, width, height);
        this.#m_layout?.update();
        this.#m_inputBlocker?.setGeometry(0, 0, width, height);
        this.update();
    }

    /**
     * Moves the widget while keeping its current size.
     * @param x Horizontal position in parent or canvas coordinates.
     * @param y Vertical position in parent or canvas coordinates.
     */
    move(x: number, y: number): void {
        this.setGeometry(x, y, this.width(), this.height());
    }

    /**
     * Resizes the widget while keeping its current position.
     * @param width New width in logical pixels.
     * @param height New height in logical pixels.
     */
    resize(width: number, height: number): void {
        this.setGeometry(this.x(), this.y(), width, height);
    }

    /**
     * Sets the visible.
     * @param visible Whether to show the target.
     */
    setVisible(visible: boolean): void {
	    /** Provides if behavior. */
	    if (this.#m_visible === visible)
		    return;

        if (!visible) CApplication.instance().rememberFocusBeforeHide(this);
	    this.#m_visible = visible;
        this.#clearUnavailableFocus();
        this.#notifyVisibilityChange();
	    const parent = this.parent();
	    /** Provides if behavior. */
	    if (parent !== null)
		    parent.childVisibilityChanged(this);
	    this.update();
    }

    /** Called when this widget or an ancestor changes visibility or parent. */
    protected visibilityChangeEvent(): void {}

    /**
     * Controls effective child visibility without changing each child's explicit show/hide state.
     * @returns `true` in this implementation.
     */
    protected childrenAreVisible(): boolean { return true; }

    /** Notify descendants after a change to childrenAreVisible(). */
    protected notifyChildrenVisibilityChanged(): void {
        this.#clearUnavailableFocus();
        for (const child of [...this.children()])
            if (child instanceof CWidget) child.#notifyVisibilityChange();
    }

    #notifyVisibilityChange(): void {
        this.visibilityChangeEvent();
        for (const child of [...this.children()])
            if (child instanceof CWidget) child.#notifyVisibilityChange();
    }

    /**
     * Sets this widget's own enabled state. A disabled ancestor disables its descendants.
     * @param enabled Whether to enable the feature.
     */
    setEnabled(enabled: boolean): void {
        if (this.#m_enabled === enabled)
            return;

        this.#m_enabled = enabled;
        this.#clearUnavailableFocus();
        this.update();
    }

    #clearUnavailableFocus(): void {
        const app = CApplication.instance();
        const focused = app.focusWidget();
        if (focused === null) return;

        if (!focused.isEnabled()) {
            app.setFocusWidget(null);
            return;
        }

        for (let widget: CWidget | null = focused; widget !== null; widget = widget.parent()) {
            if (!widget.isVisible()) {
                app.setFocusWidget(null);
                return;
            }
        }
    }

    /**
     * Checks whether the widget is visible.
     * @returns `true` if the widget is visible, otherwise `false`.
     */
    isVisible(): boolean {
        return this.#m_visible && (this.parent()?.childrenAreVisible() ?? true);
    }

	/**
	 * Reads the font configured for the widget.
	 * @returns An independent copy of the current font.
	 */
	font(): CFont {
		return new CFont(this.#m_font);
	}

    /**
     * Looks up the measurements for the widget's current font.
     * @returns The cached font metrics object.
     */
    fontMetrics() : CFontMetrics {
        return this.#m_fontMetrics;
    }

	/**
	 * Copies the font, refreshes its metrics and updates layout and painting if the font changed.
	 * @param font Font to copy.
	 * @param propagate Whether to apply the font recursively to descendants. Defaults to `false`.
	 */
	setFont(font: CFont, propagate = false): void {
		const changed = !this.#m_font.isEqual(font);

		/** Provides if behavior. */
		if (changed)
			this.#m_font = new CFont(font);

        this.#m_fontMetrics = new CFontMetrics(this.#m_font);

		/** Provides if behavior. */
		if (propagate) {
			/** Provides for behavior. */
			for (const child of this.children())
				child.setFont(font, true);
		}

		/** Provides if behavior. */
		if (changed) {
            this.updateGeometry();
			this.update();
        }
	}

    /**
     * Returns an independent copy of the effective palette. Widgets without a
     * local palette inherit from their nearest explicit ancestor or application.
     * @returns The palette.
     */
    palette(): CPalette {
        let owner: CWidget | null = this;
        while (owner !== null) {
            if (owner.#m_palette !== null) return new CPalette(owner.#m_palette);
            owner = owner.parent();
        }
        return new CPalette(CApplication.instance().palette());
    }

    /**
     * Whether setPalette() has installed a local override, even if its colors
     * happen to equal the inherited palette.
     * @returns `true` if the widget has explicit palette, otherwise `false`.
     */
    hasExplicitPalette(): boolean { return this.#m_palette !== null; }

    /**
     * Installs a local palette snapshot. Inheriting descendants follow it;
     * descendants with explicit palettes keep theirs. Passing propagate=true
     * explicitly replaces palettes on all widget descendants, as before.
     * @param palette Palette.
     * @param propagate Whether to apply the change to descendants. Defaults to `false`.
     */
    setPalette(palette: CPalette, propagate = false): void {
        const changed = !this.palette().isEqual(palette);
        this.#m_palette = new CPalette(palette);
        if (propagate) {
            for (const child of this.children())
                if (child instanceof CWidget) child.setPalette(palette, true);
        }
        if (changed) this.update();
    }

    /**
     * Removes the local override and resumes inheritance. With propagate=true,
     * removes explicit overrides from all widget descendants as well.
     * @param propagate Whether to apply the change to descendants. Defaults to `false`.
     */
    resetPalette(propagate = false): void {
        this.#m_palette = null;
        if (propagate) {
            for (const child of this.children())
                if (child instanceof CWidget) child.resetPalette(true);
        }
        this.update();
    }

    /**
     * Looks up the application's active drawing style.
     * @returns The shared application style.
     */
    style(): CStyle {
	    return CApplication.instance().style();
    }

	/**
	 * Configures the pointer shape associated with the widget.
	 * @param cursor Cursor shape to use over the widget.
	 */
	setCursor(cursor: CCursorShape): void
	{
		this.#m_cursor = cursor;
	}

	/**
	 * Reads the configured pointer shape.
	 * @returns The widget's cursor shape.
	 */
	cursor(): CCursorShape
	{
		return this.#m_cursor;
	}

    /** Sets the widget's local visibility flag and notifies the parent if the widget becomes visible. */
    show(): void {
        this.setVisible(true);
    }

    /** Clears the widget's local visibility flag and notifies the parent if the widget becomes hidden. */
    hide(): void {
        this.setVisible(false);
    }

    /**
     * Tests whether the configured policy allows focus by clicking.
     * @returns `true` if the click-focus flag is set.
     */
    acceptsClickFocus(): boolean {
		/** Provides return behavior. */
		return (this.#m_focusPolicy
			& CFocusPolicy.ClickFocus) !== 0;
	}

	/**
	 * Tests whether the configured policy allows keyboard focus traversal.
	 * @returns `true` if the Tab-focus flag is set.
	 */
	acceptsTabFocus(): boolean {
		/** Provides return behavior. */
		return (this.#m_focusPolicy
			& CFocusPolicy.TabFocus) !== 0;
	}

    /**
     * Reads the widget's configured focus policy.
     * @returns The local focus policy.
     */
    focusPolicy(): CFocusPolicy {
		return this.#m_focusPolicy;
	}

    /**
     * Sets the policy, forwards it to an assigned proxy and clears current focus when the policy changes to `NoFocus`.
     * @param policy New policy for acquiring focus.
     */
    setFocusPolicy(policy: CFocusPolicy): void {
        this.#m_focusProxy?.setFocusPolicy(policy);
        if (this.#m_focusPolicy === policy) return;
        this.#m_focusPolicy = policy;
        if (policy === CFocusPolicy.NoFocus && this.hasFocus()) this.clearFocus();
    }

    /**
     * Looks up the widget's direct focus redirection target.
     * @returns The assigned proxy widget, or `null` if no proxy is assigned.
     */
    focusProxy(): CWidget | null { return this.#m_focusProxy; }

    /**
     * Redirects focus to another live widget in the same hierarchy. Throws `RangeError` if this widget is destroyed or the proposed proxy is destroyed, forms a cycle or belongs to another hierarchy.
     * @param proxy Direct proxy, or `null` to remove the redirection.
     */
    setFocusProxy(proxy: CWidget | null): void {
        if (this.#m_destroyed) throw new RangeError("Cannot set a focus proxy on a destroyed widget.");
        if (proxy === this.#m_focusProxy) return;
        if (proxy !== null) {
            if (proxy.#m_destroyed || this.#focusRoot() !== proxy.#focusRoot())
                throw new RangeError("A focus proxy must be alive and in the same parent hierarchy.");
            for (let target: CWidget | null = proxy; target !== null; target = target.#m_focusProxy) {
                if (target === this) throw new RangeError("A focus proxy cannot create a cycle.");
            }
        }
        const hadFocus = this.hasFocus();
        if (this.#m_focusProxy !== null) this.#m_focusProxy.#m_focusProxyOwners.delete(this);
        this.#m_focusProxy = proxy;
        if (proxy !== null) proxy.#m_focusProxyOwners.add(this);
        if (proxy !== null && this.#m_focusPolicy !== CFocusPolicy.NoFocus)
            proxy.setFocusPolicy(this.#m_focusPolicy);
        if (hadFocus) {
            if (this.canReceiveFocus()) this.setFocus();
            else CApplication.instance().setFocusWidget(null);
        }
        this.update();
    }

    /**
     * Follows the focus proxy chain.
     * @returns The final proxy target, or this widget when no proxy is assigned.
     * @internal
     */
    focusTarget(): CWidget {
        let target: CWidget = this;
        while (target.#m_focusProxy !== null) target = target.#m_focusProxy;
        return target;
    }

    /**
     * Checks whether the widget can receive focus.
     * @internal Whether programmatic focus can reach the final proxy target.
     * @returns `true` if the widget can receive focus, otherwise `false`.
     */
    canReceiveFocus(): boolean {
        for (let target: CWidget | null = this; target !== null; target = target.#m_focusProxy) {
            if (target.inputBlocker() !== null) return false;
            for (let owner: CWidget | null = target; owner !== null; owner = owner.parent()) {
                if (owner.#m_destroyed || !owner.isVisible() || !owner.isEnabled()) return false;
            }
        }
        return this.focusTarget().#m_focusPolicy !== CFocusPolicy.NoFocus;
    }

    #focusRoot(): CWidget {
        let root: CWidget = this;
        while (root.parent() !== null) root = root.parent()!;
        return root;
    }

    #refreshFocusProxyHierarchy(): void {
        if (this.#m_focusProxy !== null && this.#focusRoot() !== this.#m_focusProxy.#focusRoot())
            this.setFocusProxy(null);
        for (const owner of [...this.#m_focusProxyOwners]) {
            if (owner.#focusRoot() !== this.#focusRoot()) owner.setFocusProxy(null);
        }
        for (const child of this.children()) {
            if (child instanceof CWidget) child.#refreshFocusProxyHierarchy();
        }
    }

	/** Releases focus and proxy references, destroys owned objects, releases any mouse grab and removes the widget from the visible hierarchy. */
	override destroy(): void
	{
        if (this.#m_destroyed) return;
        if (this.hasFocus()) this.clearFocus();
        this.#m_destroyed = true;
        if (this.#m_focusProxy !== null) this.#m_focusProxy.#m_focusProxyOwners.delete(this);
        this.#m_focusProxy = null;
        for (const owner of this.#m_focusProxyOwners) {
            owner.#m_focusProxy = null;
            if (!owner.#m_destroyed) owner.update();
        }
        this.#m_focusProxyOwners.clear();
        super.destroy();
		const app = CApplication.instance();

		/** Provides if behavior. */
		if (this.hasFocus())
			this.clearFocus();

		/** Provides if behavior. */
		if (app.mouseGrabber() === this)
			app.releaseMouse();

		/** Provides if behavior. */
		if (this.parent() === null)
			app.unregisterTopLevelWidget(this);
		else
			super.setParent(null);

		this.hide();
	}

    /**
     * Sets the input blocker. May request a repaint.
     * @internal Installs a direct-child input shield, rendered above normal children.
     * @param blocker Blocker.
     */
    setInputBlocker(blocker: CWidget | null): void {
        if (blocker !== null && (blocker.parent() !== this || blocker === this))
            throw new RangeError("An input blocker must be a direct child.");
        if (blocker !== null && this.#m_inputBlocker !== null && this.#m_inputBlocker !== blocker)
            throw new Error("This widget already has an input blocker.");
        this.#m_inputBlocker = blocker;
        blocker?.setGeometry(0, 0, this.width(), this.height());
        this.update();
    }
    /**
     * Walks the widget hierarchy for a visible input blocker, skipping a blocker that contains this widget in its own branch.
     * @returns The nearest applicable blocker, or `null` if there is none.
     * @internal
     */
    inputBlocker(): CWidget | null {
        let branch: CWidget | null = null;
        for (let owner: CWidget | null = this; owner !== null; owner = owner.parent()) {
            const blocker = owner.#m_inputBlocker;
            if (blocker !== null && blocker.isVisible() && blocker !== branch) return blocker;
            branch = owner;
        }
        return null;
    }

    /**
     * Returns whether this widget and its ancestors are enabled.
     * @returns `true` if the widget is enabled, otherwise `false`.
     */
    isEnabled(): boolean {
        return this.#m_enabled && (this.parent()?.isEnabled() ?? true);
    }

	/**
	 * Checks whether the final proxy target is the application's current focus widget.
	 * @returns `true` if the widget is alive and its focus target has focus.
	 */
	hasFocus(): boolean {
		return !this.#m_destroyed && CApplication.instance().focusWidget() === this.focusTarget();
	}

    /** Requests focus for the widget or its final proxy when the focus hierarchy permits it. */
    setFocus(): void {
		/** Provides if behavior. */
		if (!this.canReceiveFocus())
			return;

		CApplication.instance().setFocusWidget(this);
	}

	/** Clears the application's focus if this widget or its final proxy currently holds it. */
	clearFocus(): void {
		/** Provides if behavior. */
		if (this.hasFocus())
			CApplication.instance().setFocusWidget(null);
	}

	/**
	 * Renders the widget.
	 * @param painter Painter for the current drawing operation.
	 */
	render(painter: CPainter): void {
		/** Provides if behavior. */
		if (!this.isVisible())
			return;

		painter.save();

		try {
            painter.translate(this.x(), this.y());
			painter.clipRect(this.rect());

			this.paintEvent(painter);

			const childOffset = this.childOffset();
			const hasChildOffset =
				childOffset.x() !== 0 || childOffset.y() !== 0;

			/** Provides if behavior. */
			if (hasChildOffset) {
				painter.translate(
					childOffset.x(),
					childOffset.y()
				);
			}

			/** Provides for behavior. */
			for (const child of this.children()) {
				/** Provides if behavior. */
				if (!(child instanceof CWidget))
					continue;

				/** Provides if behavior. */
				if (CApplication.instance().isWindowWidget(child) || child === this.#m_inputBlocker)
					continue;

				child.render(painter);
			}

			/** Provides if behavior. */
			if (hasChildOffset) {
				painter.translate(
					-childOffset.x(),
					-childOffset.y()
				);
			}
            if (this.#m_inputBlocker?.isVisible()) this.#m_inputBlocker.render(painter);
		} finally {
			painter.restore();
		}
	}

    /**
     * Reads the area available for content. The base implementation uses the full widget bounds.
     * @returns Content rectangle in widget-local coordinates.
     */
    contentsRect(): CRect {
	    return this.rect();
    }

	/**
	 * Supplies a translation used when painting and hit-testing children and mapping their coordinates.
	 * @returns The child translation in local coordinates. The base implementation returns `(0, 0)`.
	 */
	protected childOffset(): CPoint {
		return new CPoint(0, 0);
	}

    /**
     * Hit-tests the widget and its visible descendants in reverse stacking order. A visible input blocker takes precedence over normal descendants.
     * @param x Horizontal coordinate in this widget.
     * @param y Vertical coordinate in this widget.
     * @returns Topmost hit widget, or `null` if the widget is hidden or the point is outside its bounds.
     */
    widgetAt(x: number, y: number): CWidget | null {
        /** Provides if behavior. */
        if (!this.isVisible())
            return null;

        /** Provides if behavior. */
        if (!this.rect().contains(new CPoint(x, y)))
            return null;

        if (this.#m_inputBlocker?.isVisible()) {
            const blocker = this.#m_inputBlocker;
            const hit = blocker.widgetAt(x - blocker.x(), y - blocker.y());
            if (hit !== null) return hit;
        }
        const children = this.children();
        const childOffset = this.childOffset();

        /** Provides for behavior. */
        for (let i = children.length - 1; i >= 0; --i) {
            const child = children[i]!;

            /** Provides if behavior. */
            if (!(child instanceof CWidget))
                continue;

            /** Provides if behavior. */
            if (CApplication.instance().isWindowWidget(child))
                continue;

            const widget = child.widgetAt(
                x - childOffset.x() - child.x(),
                y - childOffset.y() - child.y()
            );

            /** Provides if behavior. */
            if (widget !== null)
                return widget;
        }

        return this;
    }

    /**
     * Looks up the layout attached to this widget.
     * @returns The current layout, or `null` if none is attached.
     */
    layout(): CLayout | null {
	    return this.#m_layout;
    }

    /**
     * Attaches the layout to the widget and immediately updates it.
     * @param layout Layout to attach and associate with this widget.
     */
    setLayout(layout: CLayout): void {
	    /** Provides if behavior. */
	    if (this.#m_layout === layout)
		    return;

	    this.#m_layout = layout;
	    layout.setParentWidget(this);
	    layout.update();
    }

    /**
     * Reads the widget's layout preferences.
     * @returns An independent policy copy. Apply edits with `setSizePolicy()`.
     */
    sizePolicy(): CSizePolicy { return new CSizePolicy(this.#m_sizePolicy); }

    /**
     * Sets a copy of the widget's size policy and updates the parent layout when the policy changes.
     * @param policy Size policy to copy.
     */
    setSizePolicy(policy: CSizePolicy): void;
    /**
     * Sets the widget's axis preferences and updates the parent layout when the policy changes.
     * @param horizontal Policy for the horizontal axis.
     * @param vertical Policy for the vertical axis.
     */
    setSizePolicy(horizontal: CSizePolicyType, vertical: CSizePolicyType): void;
    /**
     * Sets the widget's layout preferences and updates the parent layout when they change.
     * @param policy Policy object to copy, or the horizontal policy.
     * @param vertical Vertical policy when the first argument is an axis policy. Defaults to `Preferred`.
     */
    setSizePolicy(policy: CSizePolicy | CSizePolicyType, vertical = CSizePolicyType.Preferred): void {
        const next = policy instanceof CSizePolicy ? new CSizePolicy(policy) : new CSizePolicy(policy, vertical);
        if (this.#m_sizePolicy.isEqual(next)) return;
        this.#m_sizePolicy = next;
        const parent = this.parent();
        if (parent instanceof CWidget) parent.layout()?.update();
    }

    /**
     * Reads the lower size bounds used by layouts.
     * @returns A new size containing the minimum width and height.
     */
    minimumSize(): CSize {
	    return new CSize(this.#m_minimumSize.width(), this.#m_minimumSize.height());
    }

    /**
     * Reads the lower horizontal size bound used by layouts.
     * @returns Minimum width in logical pixels.
     */
    minimumWidth(): number {
        return this.#m_minimumSize.width();
    }

    /**
     * Reads the upper horizontal size bound used by layouts.
     * @returns Maximum width in logical pixels.
     */
    maximumWidth(): number {
        return this.#m_maximumSize.width();
    }

    /**
     * Reads the lower vertical size bound used by layouts.
     * @returns Minimum height in logical pixels.
     */
    minimumHeight(): number {
        return this.#m_minimumSize.height();
    }

    /**
     * Reads the upper vertical size bound used by layouts.
     * @returns Maximum height in logical pixels.
     */
    maximumHeight(): number {
        return this.#m_maximumSize.height();
    }

    /**
     * Reads the upper size bounds used by layouts.
     * @returns A new size containing the maximum width and height.
     */
    maximumSize(): CSize {
	    return new CSize(this.#m_maximumSize.width(), this.#m_maximumSize.height());
    }

    /**
     * Changes the lower layout bounds and updates the enclosing layout. Negative values are clamped to zero. A bound above the corresponding maximum is ignored along with the other bound.
     * @param width Requested minimum width in logical pixels.
     * @param height Requested minimum height in logical pixels.
     */
    setMinimumSize(width: number, height: number): void {
        width = Math.max(0, width);
	    height = Math.max(0, height);

    	/** Provides if behavior. */
    	if (this.#m_minimumSize.width() === width && this.#m_minimumSize.height() === height)
		    return;
        /** Provides if behavior. */
        if (width > this.#m_maximumSize.width() || height > this.#m_maximumSize.height())
            return;

	    this.#m_minimumSize.resize(width, height);
    	const parent = this.parent();
    	/** Provides if behavior. */
    	if (parent instanceof CWidget)
	    	parent.layout()?.update();
    }

    /**
     * Changes the upper layout bounds and updates the enclosing layout. Negative values are clamped to zero. A bound below the corresponding minimum is ignored along with the other bound.
     * @param width Requested maximum width in logical pixels.
     * @param height Requested maximum height in logical pixels.
     */
    setMaximumSize(width: number, height: number): void {
        width = Math.max(0, width);
	    height = Math.max(0, height);

    	/** Provides if behavior. */
    	if (this.#m_maximumSize.width() === width && this.#m_maximumSize.height() === height)
		    return;
        /** Provides if behavior. */
        if (width < this.#m_minimumSize.width() || height < this.#m_minimumSize.height())
            return;

	    this.#m_maximumSize.resize(width, height);
    	const parent = this.parent();
    	/** Provides if behavior. */
    	if (parent instanceof CWidget)
	    	parent.layout()?.update();
    }

    /**
     * Sets the minimum and maximum layout bounds to the requested dimensions and resizes the widget.
     * @param width Fixed width in logical pixels.
     * @param height Fixed height in logical pixels.
     */
    setFixedSize(width: number, height: number): void {
        this.setMinimumSize(width, height);
        this.setMaximumSize(width, height);
        this.setMinimumSize(width, height);
        this.resize(width, height);
    }

    /**
     * Queries the attached layout for width-dependent height, falling back to the size policy when there is no layout.
     * @returns `true` if the preferred height depends on width.
     */
    hasHeightForWidth(): boolean {
        return this.#m_layout?.hasHeightForWidth() ?? this.#m_sizePolicy.hasHeightForWidth();
    }

    /**
     * Provides the subclass hook to bring a descendant into view after tab focus moves. The base widget has no viewport to adjust.
     * @param _widget Descendant receiving tab focus.
     * @internal
     */
    revealTabFocus(_widget: CWidget): void {}

    /**
     * Reads the accepts external files of the widget.
     * @internal
     * @returns `false` in this implementation.
     */
    acceptsExternalFiles(): boolean { return false; }

    /**
     * Provides the subclass hook for external file drag changed. This implementation does nothing.
     * @internal
     * @param _active Active flag. This implementation ignores the argument.
     */
    externalFileDragChanged(_active: boolean): void {}

    /**
     * Provides the subclass hook for drop external files. This implementation does nothing.
     * @internal
     * @param _files Files. This implementation ignores the argument.
     */
    dropExternalFiles(_files: readonly File[]): void {}

    /**
     * Provides the ancestor hook for resolving a touch-scroll target. The base implementation leaves the ancestor search open.
     * @param _child Direct child on the gesture's hit path.
     * @returns `null` in the base implementation so the search can continue.
     * @internal
     */
    touchScrollAreaFor(_child: CWidget): CScrollArea | false | null { return null; }

    /**
     * Queries the attached layout for the preferred height at a given width.
     * @param width Available width in logical pixels.
     * @returns The preferred height in logical pixels, or `-1` when no height is supplied.
     */
    heightForWidth(width: number): number {
        return this.#m_layout?.heightForWidth(width) ?? -1;
    }

    /** Updates enclosing layouts recursively after this widget's preferred geometry changes. */
    updateGeometry(): void {
        const parent = this.parent();
        if (parent instanceof CWidget) {
            parent.layout()?.update();
            parent.updateGeometry();
        }
    }

    /**
     * Queries the attached layout for the preferred size.
     * @returns The layout's preferred size, or a zero size when there is no layout.
     */
    sizeHint(): CSize {
        /** Provides if behavior. */
        if (this.#m_layout !== null)
		    return this.#m_layout.sizeHint();
        else
	        return new CSize(0, 0);
    }

    /**
     * Stores the text used for this widget's tooltip.
     * @param toolTip Tooltip text. Use an empty string to clear it.
     */
    setToolTip(toolTip: string): void
	{
		this.#m_toolTip = toolTip;
	}

	/**
	 * Reads the configured tooltip.
	 * @returns The tooltip text, which may be empty.
	 */
	toolTip(): string
	{
		return this.#m_toolTip;
	}

    /**
     * Checks whether the widget is configured as a drop target.
     * @returns `true` if the widget accepts drop targeting.
     */
    acceptDrops(): boolean {
		return this.#m_acceptDrops;
	}

	/**
	 * Enables or disables drop targeting for the widget.
	 * @param accept `true` to allow drop targeting.
	 */
	setAcceptDrops(accept: boolean): void {
		this.#m_acceptDrops = accept;
	}

    /** Schedules an application repaint. */
    update(): void {
        CApplication.instance().requestRepaint();
    }

    /**
     * Dispatches events to the matching widget hook. An input blocker consumes non-focus events except Tab presses. Disabled widgets still receive focus-out events.
     * @param event Event to dispatch. Its acceptance state may change.
     * @returns `true` if the blocker consumed the event or the matching handler accepted it. Returns `false` for ignored or unsupported events.
     */
    event(event: CEvent): boolean {
        if (event.type() !== CEventType.FocusIn && event.type() !== CEventType.FocusOut && this.inputBlocker() !== null) {
            if (event.type() === CEventType.KeyPress && (event as CKeyEvent).key() === "Tab") { event.ignore(); return false; }
            event.accept(); return true;
        }
        /** Provides if behavior. */
        // A widget losing focus on disable still needs to finish its edit or stop its caret.
        if (event.type() !== CEventType.FocusOut && !this.isEnabled()) {
			event.ignore();
			return false;
		}

		/** Provides switch behavior. */
		switch (event.type()) {
		case CEventType.MousePress:
			this.mousePressEvent(event as CMouseEvent);
			return event.isAccepted();

		case CEventType.MouseRelease:
			this.mouseReleaseEvent(event as CMouseEvent);
			return event.isAccepted();

		case CEventType.MouseDoubleClick:
			this.mouseDoubleClickEvent(event as CMouseEvent);
			return event.isAccepted();

		case CEventType.MouseMove:
			this.mouseMoveEvent(event as CMouseEvent);
			return event.isAccepted();

		case CEventType.MouseEnter:
			this.mouseEnterEvent(event as CMouseEvent);
			return event.isAccepted();

		case CEventType.MouseLeave:
			this.mouseLeaveEvent(event as CMouseEvent);
			return event.isAccepted();

		case CEventType.FocusIn:
			this.focusInEvent(event as CFocusEvent);
			return event.isAccepted();

		case CEventType.FocusOut:
			this.focusOutEvent(event as CFocusEvent);
			return event.isAccepted();

        case CEventType.KeyPress:
			this.keyPressEvent(event as CKeyEvent);
			return event.isAccepted();

		case CEventType.KeyRelease:
			this.keyReleaseEvent(event as CKeyEvent);
			return event.isAccepted();

        case CEventType.Wheel:
	        this.wheelEvent(event as CWheelEvent);
	        return event.isAccepted();

        case CEventType.ContextMenu:
			this.contextMenuEvent(event as CContextMenuEvent);
			return event.isAccepted();

		case CEventType.DragEnter:
			this.dragEnterEvent(event as CDragEnterEvent);
			return event.isAccepted();

		case CEventType.DragMove:
			this.dragMoveEvent(event as CDragMoveEvent);
			return event.isAccepted();

		case CEventType.DragLeave:
			this.dragLeaveEvent(event as CDragLeaveEvent);
			return event.isAccepted();

		case CEventType.Drop:
			this.dropEvent(event as CDropEvent);
			return event.isAccepted();
		}

		return false;
	}

    /**
     * Converts a canvas point to widget-local coordinates, accounting for positions and child offsets in the hierarchy.
     * @param x Horizontal canvas coordinate.
     * @param y Vertical canvas coordinate.
     * @returns A new point in widget-local coordinates.
     */
    mapFromCanvas(x: number, y: number): CPoint {
        let widget: CWidget | null = this;
        let localX = x;
        let localY = y;

        /** Provides while behavior. */
        while (widget !== null) {
            localX -= widget.x();
            localY -= widget.y();

            const parent = widget.parent();

            /** Provides if behavior. */
            if (parent !== null) {
                const childOffset = parent.childOffset();

                localX -= childOffset.x();
                localY -= childOffset.y();
            }

            widget = parent;
        }

        return new CPoint(localX, localY);
    }

    /**
     * Converts a widget-local point to canvas coordinates, accounting for positions and child offsets in the hierarchy.
     * @param x Horizontal widget-local coordinate.
     * @param y Vertical widget-local coordinate.
     * @returns A new point in canvas coordinates.
     */
    mapToCanvas(x: number, y: number): CPoint {
	    let widget: CWidget | null = this;
	    let canvasX = x;
	    let canvasY = y;

	    /** Provides while behavior. */
	    while (widget !== null) {
		    canvasX += widget.x();
		    canvasY += widget.y();

		    const parent = widget.parent();
		    /** Provides if behavior. */
		    if (parent !== null) {
			    const childOffset = parent.childOffset();
			    canvasX += childOffset.x();
			    canvasY += childOffset.y();
		    }
		    widget = parent;
	    }
	    return new CPoint(canvasX, canvasY);
    }

    /**
     * Provides the subclass drawing hook. The base implementation draws nothing.
     * @param _painter Painter translated to the widget origin and clipped to its local bounds.
     */
    protected paintEvent(_painter: CPainter): void {
    }

    /**
     * Provides the subclass hook for a pointer button press. The base implementation marks the event ignored.
     * @param event Event dispatched for a pointer button press.
     */
    protected mousePressEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /**
     * Provides the subclass hook for a pointer button release. The base implementation marks the event ignored.
     * @param event Event dispatched for a pointer button release.
     */
    protected mouseReleaseEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /**
     * Provides the subclass hook for a pointer double click. The base implementation marks the event ignored.
     * @param event Event dispatched for a pointer double click.
     */
    protected mouseDoubleClickEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /**
     * Provides the subclass hook for pointer movement. The base implementation marks the event ignored.
     * @param event Event dispatched for pointer movement.
     */
    protected mouseMoveEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /**
     * Provides the subclass hook for pointer entry. The base implementation marks the event ignored.
     * @param event Event dispatched for pointer entry.
     */
    protected mouseEnterEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /**
     * Provides the subclass hook for pointer exit. The base implementation marks the event ignored.
     * @param event Event dispatched for pointer exit.
     */
    protected mouseLeaveEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /**
     * Accepts focus entry and requests repainting to reflect the new focus state.
     * @param event Event describing how focus entered the widget.
     */
    protected focusInEvent(event: CFocusEvent): void {
	    event.accept();
	    this.update();
    }

    /**
     * Accepts focus exit and requests repainting to reflect the new focus state.
     * @param event Event describing how focus left the widget.
     */
    protected focusOutEvent(event: CFocusEvent): void {
        event.accept();
	    this.update();
    }

    /**
     * Provides the subclass hook for a key press. The base implementation marks the event ignored.
     * @param event Event dispatched for a key press.
     */
    protected keyPressEvent(event: CKeyEvent): void {
        event.ignore();
    }

    /**
     * Provides the subclass hook for a key release. The base implementation marks the event ignored.
     * @param event Event dispatched for a key release.
     */
    protected keyReleaseEvent(event: CKeyEvent): void {
        event.ignore();
    }

    /**
     * Provides the subclass hook for wheel movement. The base implementation marks the event ignored.
     * @param event Event dispatched for wheel movement.
     */
    protected wheelEvent(event: CWheelEvent): void {
	    event.ignore();
    }

    /**
     * Provides the subclass hook for a context menu request. The base implementation marks the event ignored.
     * @param event Event dispatched for a context menu request.
     */
    protected contextMenuEvent(event: CContextMenuEvent): void {
        event.ignore();
    }

    /**
     * Updates the layout and requests repainting when a direct child's local visibility changes.
     * @param _child Child widget whose visibility changed.
     */
    protected childVisibilityChanged(_child: CWidget): void {
	    this.#m_layout?.update();
	    this.update();
    }

	/**
	 * Provides the subclass hook for drag entry. The base implementation marks the event ignored.
	 * @param event Event dispatched for drag entry.
	 */
	protected dragEnterEvent(event: CDragEnterEvent): void {
		event.ignore();
	}

	/**
	 * Provides the subclass hook for drag movement. The base implementation marks the event ignored.
	 * @param event Event dispatched for drag movement.
	 */
	protected dragMoveEvent(event: CDragMoveEvent): void {
		event.ignore();
	}

	/**
	 * Provides the subclass hook for drag exit. The base implementation marks the event ignored.
	 * @param event Event dispatched for drag exit.
	 */
	protected dragLeaveEvent(event: CDragLeaveEvent): void {
		event.ignore();
	}

	/**
	 * Provides the subclass hook for a drop. The base implementation marks the event ignored.
	 * @param event Event dispatched for a drop.
	 */
	protected dropEvent(event: CDropEvent): void {
		event.ignore();
	}
}
