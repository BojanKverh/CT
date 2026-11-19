/** @module Widgets/CWidget */
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

/**
 * Base of all canvas controls, containers and custom-painted surfaces.
 * Coordinates use logical pixels. Ownership, layout, focus and palette inheritance
 * are shared by derived widgets. Create CApplication before constructing widgets.
 *
 * @example
 * ```ts
 * const panel = new CWidget(parent);
 * const layout = new CVBoxLayout();
 * layout.addWidget(new CPushButton(panel));
 * panel.setLayout(layout);
 * ```
 */
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

    /**
    * Creates a canvas widget. A parent owns its children. Parentless widgets register as application roots. Create CApplication first.
    */
    constructor(parent: CWidget | null = null) {
        super(null);

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
    * Places second immediately after first in the keyboard focus order.
    * Call pairs in sequence to build a chain. Widgets must belong to the
    * same parent hierarchy; identical widgets or different roots are ignored.
    * Hidden, disabled and non-Tab-focusable widgets keep their position but
    * are skipped during navigation. This does not change the current focus.
    */
    static setTabOrder(first: CWidget, second: CWidget): void {
        CApplication.instance().setTabOrder(first, second);
    }

    override parent(): CWidget | null {
        return super.parent() as CWidget | null;
    }

    override children(): readonly CWidget[] {
        return super.children() as readonly CWidget[];
    }

    /**
    * Transfers ownership and updates root registration, focus-proxy links and visibility notifications.
    */
    override setParent(parent: CWidget | null): void {
        const oldParent = this.parent();

        if (oldParent === parent)
            return;

        super.setParent(parent);

        const app = CApplication.instance();

        if (oldParent === null)
            app.unregisterTopLevelWidget(this);

        if (parent === null)
            app.registerTopLevelWidget(this);
        this.#refreshFocusProxyHierarchy();
        this.#clearUnavailableFocus();
        this.#notifyVisibilityChange();
        this.update();
    }

    /**
    * Returns a copy of the bounds relative to the parent, in logical canvas pixels.
    */
    geometry(): CRect {
        return new CRect(this.x(), this.y(), this.width(), this.height());
    }

    /**
    * Returns the local rectangle starting at (0, 0), independent of the parent position.
    */
    rect(): CRect {
        return new CRect(0, 0, this.width(), this.height());
    }

    /**
    * Returns the horizontal position relative to the parent in logical pixels.
    */
    x(): number {
        return this.#m_geometry.x();
    }

    /**
    * Returns the vertical position relative to the parent in logical pixels.
    */
    y(): number {
        return this.#m_geometry.y();
    }

    /**
    * Returns the current logical width, excluding any device-pixel-ratio scaling.
    */
    width(): number {
        return this.#m_geometry.width();
    }

    /**
    * Returns the current logical height, excluding any device-pixel-ratio scaling.
    */
    height(): number {
        return this.#m_geometry.height();
    }

    /**
    * Changes parent-relative position and size, updates the installed layout and requests repaint. An enclosing layout may replace this geometry.
    */
    setGeometry(x: number, y: number, width: number, height: number): void {
        if (x === this.x() && y === this.y() && width === this.width()
            && height === this.height())
            return;

        this.#m_geometry.setGeometry(x, y, width, height);
        this.#m_layout?.update();
        this.#m_inputBlocker?.setGeometry(0, 0, width, height);
        this.update();
    }

    /**
    * Changes the parent-relative position while preserving the current width and height.
    */
    move(x: number, y: number): void {
        this.setGeometry(x, y, this.width(), this.height());
    }

    /**
    * Changes width and height while preserving the parent-relative position. Updates the installed layout.
    */
    resize(width: number, height: number): void {
        this.setGeometry(this.x(), this.y(), width, height);
    }

    /**
    * Changes explicit visibility and notifies descendants and the enclosing layout. Hiding a focused subtree clears focus and remembers its Tab position.
    */
    setVisible(visible: boolean): void {
	    if (this.#m_visible === visible)
		    return;

        if (!visible) CApplication.instance().rememberFocusBeforeHide(this);
	    this.#m_visible = visible;
        this.#clearUnavailableFocus();
        this.#notifyVisibilityChange();
	    const parent = this.parent();
	    if (parent !== null)
		    parent.childVisibilityChanged(this);
	    this.update();
    }

    /**
    * Override to release transient state when this widget or an ancestor changes visibility or parent.
    */
    protected visibilityChangeEvent(): void {}

    /**
    * Controls whether descendants are presented. Containers can override this to collapse content while retaining the children's explicit visibility.
    */
    protected childrenAreVisible(): boolean { return true; }

    /**
    * Notifies descendants after the container changes its childrenAreVisible() result and clears unavailable focus.
    */
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
    * Changes the local enabled flag. A disabled ancestor disables input for its descendants and clears their focus. Re-enabling preserves explicitly disabled children.
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
    * Returns the local visible flag combined with the direct parent's childrenAreVisible() policy. For ancestor visibility checks, walk the parent chain.
    */
    isVisible(): boolean {
        return this.#m_visible && (this.parent()?.childrenAreVisible() ?? true);
    }

    /**
    * Returns an independent copy of the font. Call setFont() to apply edits to the returned value.
    */
    font(): CFont {
		return new CFont(this.#m_font);
	}

    /**
    * Returns measurements for the currently installed font in logical canvas pixels.
    */
    fontMetrics() : CFontMetrics {
        return this.#m_fontMetrics;
    }

    /**
    * Copies the font and refreshes metrics, preferred geometry and painting. With propagate=true, copies it to all descendants. The default is false.
    */
    setFont(font: CFont, propagate = false): void {
		const changed = !this.#m_font.isEqual(font);

		if (changed)
			this.#m_font = new CFont(font);

        this.#m_fontMetrics = new CFontMetrics(this.#m_font);

		if (propagate) {
			for (const child of this.children())
				child.setFont(font, true);
		}

		if (changed) {
            this.updateGeometry();
			this.update();
        }
	}

    /** Returns an independent copy of the effective palette. Widgets without a
    * local palette inherit from their nearest explicit ancestor or application.
    */
    palette(): CPalette {
        let owner: CWidget | null = this;
        while (owner !== null) {
            if (owner.#m_palette !== null) return new CPalette(owner.#m_palette);
            owner = owner.parent();
        }
        return new CPalette(CApplication.instance().palette());
    }

    /** Whether setPalette() has installed a local override, even if its colors
    * happen to equal the inherited palette. */
    hasExplicitPalette(): boolean { return this.#m_palette !== null; }

    /** Installs a local palette snapshot. Inheriting descendants follow it;
    * descendants with explicit palettes keep theirs. Passing propagate=true
    * explicitly replaces palettes on all widget descendants, as before.
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

    /** Removes the local override and resumes inheritance. With propagate=true,
    * removes explicit overrides from all widget descendants as well. */
    resetPalette(propagate = false): void {
        this.#m_palette = null;
        if (propagate) {
            for (const child of this.children())
                if (child instanceof CWidget) child.resetPalette(true);
        }
        this.update();
    }

    /**
    * Returns the application's current drawing style used by widget paint handlers.
    */
    style(): CStyle {
	    return CApplication.instance().style();
    }

    /**
    * Selects the pointer shape used while this widget is hovered. Defaults to Arrow.
    */
    setCursor(cursor: CCursorShape): void
	{
		this.#m_cursor = cursor;
	}

    /**
    * Returns the configured hover pointer shape.
    */
    cursor(): CCursorShape
	{
		return this.#m_cursor;
	}

    /**
    * Sets explicit visibility to true. Hidden ancestors can still prevent the widget from being presented.
    */
    show(): void {
        this.setVisible(true);
    }

    /**
    * Sets explicit visibility to false and clears focus within the hidden subtree.
    */
    hide(): void {
        this.setVisible(false);
    }

    /**
    * Tests whether the focus policy permits focus transfer after an accepted mouse press.
    */
    acceptsClickFocus(): boolean {
		return (this.#m_focusPolicy
			& CFocusPolicy.ClickFocus) !== 0;
	}

    /**
    * Tests whether the focus policy participates in keyboard Tab traversal.
    */
    acceptsTabFocus(): boolean {
		return (this.#m_focusPolicy
			& CFocusPolicy.TabFocus) !== 0;
	}

    /**
    * Returns how focus is accepted. Base widgets default to NoFocus.
    */
    focusPolicy(): CFocusPolicy {
		return this.#m_focusPolicy;
	}

    /**
    * Changes focus eligibility and forwards the policy to an installed focus proxy.
    */
    setFocusPolicy(policy: CFocusPolicy): void {
        this.#m_focusProxy?.setFocusPolicy(policy);
        if (this.#m_focusPolicy === policy) return;
        this.#m_focusPolicy = policy;
        if (policy === CFocusPolicy.NoFocus && this.hasFocus()) this.clearFocus();
    }

    /**
    * Returns the internal input receiving focus on behalf of this composite, or null.
    */
    focusProxy(): CWidget | null { return this.#m_focusProxy; }

    /**
    * Redirects focus to another widget in the same parent hierarchy.
    * Throws RangeError for self references, cycles, destroyed targets or
    * targets in a different hierarchy. Null removes the redirection.
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

    /** @internal Returns the final widget in the proxy chain. */
    focusTarget(): CWidget {
        let target: CWidget = this;
        while (target.#m_focusProxy !== null) target = target.#m_focusProxy;
        return target;
    }

    /** @internal Whether programmatic focus can reach the final proxy target. */
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

    /** Releases resources owned by the widget. */
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

		if (this.hasFocus())
			this.clearFocus();

		if (app.mouseGrabber() === this)
			app.releaseMouse();

		if (this.parent() === null)
			app.unregisterTopLevelWidget(this);
		else
			super.setParent(null);

		this.hide();
	}

    /** @internal Installs a direct-child input shield, rendered above normal children. */
    setInputBlocker(blocker: CWidget | null): void {
        if (blocker !== null && (blocker.parent() !== this || blocker === this))
            throw new RangeError("An input blocker must be a direct child.");
        if (blocker !== null && this.#m_inputBlocker !== null && this.#m_inputBlocker !== blocker)
            throw new Error("This widget already has an input blocker.");
        this.#m_inputBlocker = blocker;
        blocker?.setGeometry(0, 0, this.width(), this.height());
        this.update();
    }
    /** Returns the shield blocking input to this widget, excluding the shield's own subtree. */
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
    * Returns true only when the widget and every ancestor are enabled.
    */
    isEnabled(): boolean {
        return this.#m_enabled && (this.parent()?.isEnabled() ?? true);
    }

    /**
    * Reports whether the application focus belongs to this widget's resolved focus proxy.
    */
    hasFocus(): boolean {
		return !this.#m_destroyed && CApplication.instance().focusWidget() === this.focusTarget();
	}

    /**
    * Requests keyboard focus for the resolved proxy. Hidden, disabled, blocked or destroyed targets and ancestors prevent transfer.
    */
    setFocus(): void {
		if (!this.canReceiveFocus())
			return;

		CApplication.instance().setFocusWidget(this);
	}

    /**
    * Clears application focus only when this widget or its resolved proxy currently owns it.
    */
    clearFocus(): void {
		if (this.hasFocus())
			CApplication.instance().setFocusWidget(null);
	}

    /**
    * Paints this widget and visible descendants with local translation and clipping. Override paintEvent() for custom drawing.
    */
    render(painter: CPainter): void {
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

			if (hasChildOffset) {
				painter.translate(
					childOffset.x(),
					childOffset.y()
				);
			}

			for (const child of this.children()) {
				if (!(child instanceof CWidget))
					continue;

				if (CApplication.instance().isWindowWidget(child) || child === this.#m_inputBlocker)
					continue;

				child.render(painter);
			}

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
    * Returns the local area available to contents. Containers may reserve borders or title areas in overrides.
    */
    contentsRect(): CRect {
	    return this.rect();
    }

    /**
    * Returns the translation applied before drawing and hit-testing children. The base widget adds no offset.
    */
    protected childOffset(): CPoint {
		return new CPoint(0, 0);
	}

    /**
    * Finds the topmost visible widget at local coordinates. Disabled widgets still occupy their hit area. Input blockers take precedence.
    */
    widgetAt(x: number, y: number): CWidget | null {
        if (!this.isVisible())
            return null;

        if (!this.rect().contains(new CPoint(x, y)))
            return null;

        if (this.#m_inputBlocker?.isVisible()) {
            const blocker = this.#m_inputBlocker;
            const hit = blocker.widgetAt(x - blocker.x(), y - blocker.y());
            if (hit !== null) return hit;
        }
        const children = this.children();
        const childOffset = this.childOffset();

        for (let i = children.length - 1; i >= 0; --i) {
            const child = children[i]!;

            if (!(child instanceof CWidget))
                continue;

            if (CApplication.instance().isWindowWidget(child))
                continue;

            const widget = child.widgetAt(
                x - childOffset.x() - child.x(),
                y - childOffset.y() - child.y()
            );

            if (widget !== null)
                return widget;
        }

        return this;
    }

    /**
    * Returns the layout managing child geometry, or null when children are positioned manually.
    */
    layout(): CLayout | null {
	    return this.#m_layout;
    }

    /**
    * Installs the layout, assigns this widget as its parent widget and immediately calculates child geometry.
    */
    setLayout(layout: CLayout): void {
	    if (this.#m_layout === layout)
		    return;

	    this.#m_layout = layout;
	    layout.setParentWidget(this);
	    layout.update();
    }

    /** Returns a copy; apply changes with setSizePolicy(). */
    sizePolicy(): CSizePolicy { return new CSizePolicy(this.#m_sizePolicy); }

    /**
    * Copies the horizontal and vertical layout policies and updates the enclosing layout. Policies affect allocation alongside preferred, minimum and maximum sizes.
    */
    setSizePolicy(policy: CSizePolicy): void;
    /**
    * Copies the horizontal and vertical layout policies and updates the enclosing layout. Policies affect allocation alongside preferred, minimum and maximum sizes.
    */
    setSizePolicy(horizontal: CSizePolicyType, vertical: CSizePolicyType): void;
    /**
    * Copies the horizontal and vertical layout policies and updates the enclosing layout. Policies affect allocation alongside preferred, minimum and maximum sizes.
    */
    setSizePolicy(policy: CSizePolicy | CSizePolicyType, vertical = CSizePolicyType.Preferred): void {
        const next = policy instanceof CSizePolicy ? new CSizePolicy(policy) : new CSizePolicy(policy, vertical);
        if (this.#m_sizePolicy.isEqual(next)) return;
        this.#m_sizePolicy = next;
        const parent = this.parent();
        if (parent instanceof CWidget) parent.layout()?.update();
    }

    /**
    * Returns an independent copy of the layout lower bound. Defaults to zero in both dimensions.
    */
    minimumSize(): CSize {
	    return new CSize(this.#m_minimumSize.width(), this.#m_minimumSize.height());
    }

    /**
    * Returns the horizontal lower bound used by layouts, in logical pixels.
    */
    minimumWidth(): number {
        return this.#m_minimumSize.width();
    }

    /**
    * Returns the horizontal upper bound used by layouts, in logical pixels.
    */
    maximumWidth(): number {
        return this.#m_maximumSize.width();
    }

    /**
    * Returns the vertical lower bound used by layouts, in logical pixels.
    */
    minimumHeight(): number {
        return this.#m_minimumSize.height();
    }

    /**
    * Returns the vertical upper bound used by layouts, in logical pixels.
    */
    maximumHeight(): number {
        return this.#m_maximumSize.height();
    }

    /**
    * Returns an independent copy of the layout upper bound. Defaults to Number.MAX_SAFE_INTEGER in both dimensions.
    */
    maximumSize(): CSize {
	    return new CSize(this.#m_maximumSize.width(), this.#m_maximumSize.height());
    }

    /**
    * Sets layout lower bounds, clamping negative inputs to zero. A request exceeding an existing maximum is ignored. Updates the enclosing layout.
    */
    setMinimumSize(width: number, height: number): void {
        /**
         * Returns the current logical width, excluding any device-pixel-ratio scaling.
         */
        width = Math.max(0, width);
	    /**
	     * Returns the current logical height, excluding any device-pixel-ratio scaling.
	     */
	    height = Math.max(0, height);

    	if (this.#m_minimumSize.width() === width && this.#m_minimumSize.height() === height)
		    return;
        if (width > this.#m_maximumSize.width() || height > this.#m_maximumSize.height())
            return;

	    this.#m_minimumSize.resize(width, height);
    	const parent = this.parent();
    	if (parent instanceof CWidget)
	    	parent.layout()?.update();
    }

    /**
    * Sets layout upper bounds, clamping negative inputs to zero. A request below an existing minimum is ignored. Updates the enclosing layout.
    */
    setMaximumSize(width: number, height: number): void {
        /**
         * Returns the current logical width, excluding any device-pixel-ratio scaling.
         */
        width = Math.max(0, width);
	    /**
	     * Returns the current logical height, excluding any device-pixel-ratio scaling.
	     */
	    height = Math.max(0, height);

    	if (this.#m_maximumSize.width() === width && this.#m_maximumSize.height() === height)
		    return;
        if (width < this.#m_minimumSize.width() || height < this.#m_minimumSize.height())
            return;

	    this.#m_maximumSize.resize(width, height);
    	const parent = this.parent();
    	if (parent instanceof CWidget)
	    	parent.layout()?.update();
    }

    /**
    * Sets both layout bounds and the current geometry to the requested width and height.
    */
    setFixedSize(width: number, height: number): void {
        this.setMinimumSize(width, height);
        this.setMaximumSize(width, height);
        this.setMinimumSize(width, height);
        this.resize(width, height);
    }

    /** Whether the preferred height depends on the available width. */
    hasHeightForWidth(): boolean {
        return this.#m_layout?.hasHeightForWidth() ?? this.#m_sizePolicy.hasHeightForWidth();
    }

    /** @internal Allows containers to reveal a descendant reached by Tab. */
    revealTabFocus(_widget: CWidget): void {}

    /** @internal Reports whether native file-drop events may target this widget. */
    acceptsExternalFiles(): boolean { return false; }

    /** @internal Updates feedback when a native file drag enters or leaves. */
    externalFileDragChanged(_active: boolean): void {}

    /** @internal Receives the files delivered by a native browser drop. */
    dropExternalFiles(_files: readonly File[]): void {}

    /** @internal Returns a touch pan owner, false to stop the search, or null to continue. */
    touchScrollAreaFor(_child: CWidget): CScrollArea | false | null { return null; }

    /** Preferred height at the supplied width, or -1 when independent. */
    heightForWidth(width: number): number {
        return this.#m_layout?.heightForWidth(width) ?? -1;
    }

    /** Notifies enclosing layouts after a change to preferred geometry. */
    updateGeometry(): void {
        const parent = this.parent();
        if (parent instanceof CWidget) {
            parent.layout()?.update();
            parent.updateGeometry();
        }
    }

    /**
    * Returns the preferred size used by layouts. The installed layout supplies the hint when present; otherwise the base widget uses its current size.
    */
    sizeHint(): CSize {
        if (this.#m_layout !== null)
		    return this.#m_layout.sizeHint();
        else
	        return new CSize(0, 0);
    }

    /**
    * Sets text displayed after the pointer remains over this widget. An empty string disables its tooltip.
    */
    setToolTip(toolTip: string): void
	{
		this.#m_toolTip = toolTip;
	}

    /**
    * Returns the configured hover tooltip text.
    */
    toolTip(): string
	{
		return this.#m_toolTip;
	}

    /**
    * Reports whether application drag-and-drop events may target this widget.
    */
    acceptDrops(): boolean {
		return this.#m_acceptDrops;
	}

    /**
    * Enables delivery of toolkit drag-and-drop events. Defaults to false.
    */
    setAcceptDrops(accept: boolean): void {
		this.#m_acceptDrops = accept;
	}

    /**
    * Schedules a repaint through CApplication; multiple requests can share a frame.
    */
    update(): void {
        CApplication.instance().requestRepaint();
    }

    /**
    * Dispatches a toolkit event to its protected handler and returns whether it was accepted. Disabled widgets reject input; FocusOut still reaches cleanup handlers.
    */
    event(event: CEvent): boolean {
        if (event.type() !== CEventType.FocusIn && event.type() !== CEventType.FocusOut && this.inputBlocker() !== null) {
            if (event.type() === CEventType.KeyPress && (event as CKeyEvent).key() === "Tab") { event.ignore(); return false; }
            event.accept(); return true;
        }
        // A widget losing focus on disable still needs to finish its edit or stop its caret.
        if (event.type() !== CEventType.FocusOut && !this.isEnabled()) {
			event.ignore();
			return false;
		}

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
    * Converts logical canvas coordinates into local coordinates, including ancestor positions and child offsets.
    */
    mapFromCanvas(x: number, y: number): CPoint {
        let widget: CWidget | null = this;
        let localX = x;
        let localY = y;

        while (widget !== null) {
            localX -= widget.x();
            localY -= widget.y();

            const parent = widget.parent();

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
    * Converts local coordinates into logical canvas coordinates, including ancestor positions and child offsets.
    */
    mapToCanvas(x: number, y: number): CPoint {
	    let widget: CWidget | null = this;
	    let canvasX = x;
	    let canvasY = y;

	    while (widget !== null) {
		    canvasX += widget.x();
		    canvasY += widget.y();

		    const parent = widget.parent();
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
    * Override to draw with CPainter in local coordinates. Drawing is clipped to the widget. Use setPen() for text and lines and setBrush() for fills.
    */
    protected paintEvent(_painter: CPainter): void {
    }

    /**
    * Override to handle a press. Accepting it grants mouse capture and can transfer click focus; ignoring permits propagation.
    */
    protected mousePressEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /**
    * Override to finish a mouse interaction. Release application capture after handling is managed by CApplication.
    */
    protected mouseReleaseEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /**
    * Override to handle repeated clicks at a local position. Ignore to let an ancestor handle the event.
    */
    protected mouseDoubleClickEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /**
    * Override for hover or captured drag updates in local coordinates. Ignore events the widget does not handle.
    */
    protected mouseMoveEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /**
    * Called when hit-testing starts hovering this widget. The base handler accepts and requests repaint.
    */
    protected mouseEnterEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /**
    * Called when the pointer leaves this widget. Override to clear hover state.
    */
    protected mouseLeaveEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /**
    * Called on keyboard-focus acquisition. The base handler accepts and requests repaint.
    */
    protected focusInEvent(event: CFocusEvent): void {
	    event.accept();
	    this.update();
    }

    /**
    * Called on focus loss, including hiding or disabling. Override to finish edits or stop caret and interaction timers.
    */
    protected focusOutEvent(event: CFocusEvent): void {
        event.accept();
	    this.update();
    }

    /**
    * Override to process keyboard input while focused. Ignore unhandled keys so ancestors and application Tab navigation can handle them.
    */
    protected keyPressEvent(event: CKeyEvent): void {
        event.ignore();
    }

    /**
    * Override to complete keyboard interactions. The base handler ignores releases.
    */
    protected keyReleaseEvent(event: CKeyEvent): void {
        event.ignore();
    }

    /**
    * Override to consume wheel deltas. Ignore when no movement is possible so an enclosing scroll area can handle them.
    */
    protected wheelEvent(event: CWheelEvent): void {
	    event.ignore();
    }

    /**
    * Override to present a menu at the requested local or canvas position. The base handler ignores the request.
    */
    protected contextMenuEvent(event: CContextMenuEvent): void {
        event.ignore();
    }

    /**
    * Called after a direct child changes explicit visibility. Containers can recompute geometry here.
    */
    protected childVisibilityChanged(_child: CWidget): void {
	    this.#m_layout?.update();
	    this.update();
    }

    /**
    * Override to validate the incoming toolkit drag and accept a supported drop action.
    */
    protected dragEnterEvent(event: CDragEnterEvent): void {
		event.ignore();
	}

    /**
    * Override to update feedback or validate the current toolkit drag position.
    */
    protected dragMoveEvent(event: CDragMoveEvent): void {
		event.ignore();
	}

    /**
    * Override to clear feedback when the active toolkit drag leaves this widget.
    */
    protected dragLeaveEvent(event: CDragLeaveEvent): void {
		event.ignore();
	}

    /**
    * Override to consume the toolkit drag's MIME payload and accept the completed action.
    */
    protected dropEvent(event: CDropEvent): void {
		event.ignore();
	}
}
