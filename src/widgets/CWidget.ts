import { CSizePolicy, CSizePolicyType } from "../geometry/CSizePolicy.js";
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
     * Places second immediately after first in the keyboard focus order.
     * Call pairs in sequence to build a chain. Widgets must belong to the
     * same parent hierarchy; identical widgets or different roots are ignored.
     * Hidden, disabled and non-Tab-focusable widgets keep their position but
     * are skipped during navigation. This does not change the current focus.
     */
    static setTabOrder(first: CWidget, second: CWidget): void {
        CApplication.instance().setTabOrder(first, second);
    }

    /** Provides parent behavior. */
    override parent(): CWidget | null {
        return super.parent() as CWidget | null;
    }

    /** Provides children behavior. */
    override children(): readonly CWidget[] {
        return super.children() as readonly CWidget[];
    }

    /** Sets the parent. */
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
        this.#notifyVisibilityChange();
        this.update();
    }

    /** Provides geometry behavior. */
    geometry(): CRect {
        return new CRect(this.x(), this.y(), this.width(), this.height());
    }

    /** Provides rect behavior. */
    rect(): CRect {
        return new CRect(0, 0, this.width(), this.height());
    }

    /** Provides x behavior. */
    x(): number {
        return this.#m_geometry.x();
    }

    /** Provides y behavior. */
    y(): number {
        return this.#m_geometry.y();
    }

    /** Provides width behavior. */
    width(): number {
        return this.#m_geometry.width();
    }

    /** Provides height behavior. */
    height(): number {
        return this.#m_geometry.height();
    }

    /** Sets the geometry. */
    setGeometry(x: number, y: number, width: number, height: number): void {
        /** Provides if behavior. */
        if (x === this.x() && y === this.y() && width === this.width()
            && height === this.height())
            return;

        this.#m_geometry.setGeometry(x, y, width, height);
        this.#m_layout?.update();
        this.update();
    }

    /** Provides move behavior. */
    move(x: number, y: number): void {
        this.setGeometry(x, y, this.width(), this.height());
    }

    /** Provides resize behavior. */
    resize(width: number, height: number): void {
        this.setGeometry(this.x(), this.y(), width, height);
    }

    /** Sets the visible. */
    setVisible(visible: boolean): void {
	    /** Provides if behavior. */
	    if (this.#m_visible === visible)
		    return;

	    this.#m_visible = visible;
        this.#notifyVisibilityChange();
	    const parent = this.parent();
	    /** Provides if behavior. */
	    if (parent !== null)
		    parent.childVisibilityChanged(this);
	    this.update();
    }

    /** Called when this widget or an ancestor changes visibility or parent. */
    protected visibilityChangeEvent(): void {}

    #notifyVisibilityChange(): void {
        this.visibilityChangeEvent();
        for (const child of [...this.children()])
            if (child instanceof CWidget) child.#notifyVisibilityChange();
    }

    /** Sets the enabled. */
    setEnabled(enabled: boolean): void {
        /** Provides if behavior. */
        if (this.#m_enabled === enabled)
            return;

        this.#m_enabled = enabled;
        this.update();
    }

    /** Returns whether the visible condition is active. */
    isVisible(): boolean {
        return this.#m_visible;
    }

	/** Provides font behavior. */
	font(): CFont {
		return new CFont(this.#m_font);
	}

    /** Provides font metrics behavior. */
    fontMetrics() : CFontMetrics {
        return this.#m_fontMetrics;
    }

	/** Sets the font. */
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

    /** Provides style behavior. */
    style(): CStyle {
	    return CApplication.instance().style();
    }

	/** Sets the cursor. */
	setCursor(cursor: CCursorShape): void
	{
		this.#m_cursor = cursor;
	}

	/** Provides cursor behavior. */
	cursor(): CCursorShape
	{
		return this.#m_cursor;
	}

    /** Shows the widget. */
    show(): void {
        this.setVisible(true);
    }

    /** Hides the widget. */
    hide(): void {
        this.setVisible(false);
    }

    /** Provides accepts click focus behavior. */
    acceptsClickFocus(): boolean {
		/** Provides return behavior. */
		return (this.#m_focusPolicy
			& CFocusPolicy.ClickFocus) !== 0;
	}

	/** Provides accepts tab focus behavior. */
	acceptsTabFocus(): boolean {
		/** Provides return behavior. */
		return (this.#m_focusPolicy
			& CFocusPolicy.TabFocus) !== 0;
	}

    /** Provides focus policy behavior. */
    focusPolicy(): CFocusPolicy {
		return this.#m_focusPolicy;
	}

    /** Sets the policy and propagates it to an assigned focus proxy. */
    setFocusPolicy(policy: CFocusPolicy): void {
        this.#m_focusProxy?.setFocusPolicy(policy);
        if (this.#m_focusPolicy === policy) return;
        this.#m_focusPolicy = policy;
        if (policy === CFocusPolicy.NoFocus && this.hasFocus()) this.clearFocus();
    }

    /** Returns the direct focus proxy, or null. */
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

    /** Returns whether the enabled condition is active. */
    isEnabled(): boolean {
        return this.#m_enabled;
    }

	/** Returns whether this object has focus. */
	hasFocus(): boolean {
		return !this.#m_destroyed && CApplication.instance().focusWidget() === this.focusTarget();
	}

    /** Sets the focus. */
    setFocus(): void {
		/** Provides if behavior. */
		if (!this.canReceiveFocus())
			return;

		CApplication.instance().setFocusWidget(this);
	}

	/** Clears focus. */
	clearFocus(): void {
		/** Provides if behavior. */
		if (this.hasFocus())
			CApplication.instance().setFocusWidget(null);
	}

	/** Renders the widget. */
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
				if (CApplication.instance().isWindowWidget(child))
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
		} finally {
			painter.restore();
		}
	}

    /** Returns the widget's contents rectangle. */
    contentsRect(): CRect {
	    return this.rect();
    }

	/** Handles child offset behavior. */
	protected childOffset(): CPoint {
		return new CPoint(0, 0);
	}

    /** Provides widget at behavior. */
    widgetAt(x: number, y: number): CWidget | null {
        /** Provides if behavior. */
        if (!this.isVisible())
            return null;

        /** Provides if behavior. */
        if (!this.rect().contains(new CPoint(x, y)))
            return null;

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

    /** Provides layout behavior. */
    layout(): CLayout | null {
	    return this.#m_layout;
    }

    /** Sets the layout. */
    setLayout(layout: CLayout): void {
	    /** Provides if behavior. */
	    if (this.#m_layout === layout)
		    return;

	    this.#m_layout = layout;
	    layout.setParentWidget(this);
	    layout.update();
    }

    /** Returns a copy; apply changes with setSizePolicy(). */
    sizePolicy(): CSizePolicy { return new CSizePolicy(this.#m_sizePolicy); }

    setSizePolicy(policy: CSizePolicy): void;
    setSizePolicy(horizontal: CSizePolicyType, vertical: CSizePolicyType): void;
    setSizePolicy(policy: CSizePolicy | CSizePolicyType, vertical = CSizePolicyType.Preferred): void {
        const next = policy instanceof CSizePolicy ? new CSizePolicy(policy) : new CSizePolicy(policy, vertical);
        if (this.#m_sizePolicy.isEqual(next)) return;
        this.#m_sizePolicy = next;
        const parent = this.parent();
        if (parent instanceof CWidget) parent.layout()?.update();
    }

    /** Returns the minimum size. */
    minimumSize(): CSize {
	    return new CSize(this.#m_minimumSize.width(), this.#m_minimumSize.height());
    }

    /** Returns the minimum width. */
    minimumWidth(): number {
        return this.#m_minimumSize.width();
    }

    /** Returns the maximum width. */
    maximumWidth(): number {
        return this.#m_maximumSize.width();
    }

    /** Returns the minimum height. */
    minimumHeight(): number {
        return this.#m_minimumSize.height();
    }

    /** Returns the maximum height. */
    maximumHeight(): number {
        return this.#m_maximumSize.height();
    }

    /** Returns the maximum size. */
    maximumSize(): CSize {
	    return new CSize(this.#m_maximumSize.width(), this.#m_maximumSize.height());
    }

    /** Sets the minimum size. */
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

    /** Sets the maximum size. */
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

    /** Sets the fixed size. */
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

    /** Returns the preferred size of the widget. */
    sizeHint(): CSize {
        /** Provides if behavior. */
        if (this.#m_layout !== null)
		    return this.#m_layout.sizeHint();
        else
	        return new CSize(0, 0);
    }

    /** Sets the tool tip. */
    setToolTip(toolTip: string): void
	{
		this.#m_toolTip = toolTip;
	}

	/** Provides tool tip behavior. */
	toolTip(): string
	{
		return this.#m_toolTip;
	}

    /** Provides accept drops behavior. */
    acceptDrops(): boolean {
		return this.#m_acceptDrops;
	}

	/** Sets the accept drops. */
	setAcceptDrops(accept: boolean): void {
		this.#m_acceptDrops = accept;
	}

    /** Provides update behavior. */
    update(): void {
        CApplication.instance().requestRepaint();
    }

    /** Provides event behavior. */
    event(event: CEvent): boolean {
        /** Provides if behavior. */
        if (!this.isEnabled()) {
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

    /** Provides map from canvas behavior. */
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

    /** Provides map to canvas behavior. */
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

    /** Handles the paint event. */
    protected paintEvent(_painter: CPainter): void {
    }

    /** Handles the mouse press event. */
    protected mousePressEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /** Handles the mouse release event. */
    protected mouseReleaseEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /** Handles the mouse double-click event. */
    protected mouseDoubleClickEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /** Handles the mouse move event. */
    protected mouseMoveEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /** Handles the mouse enter event. */
    protected mouseEnterEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /** Handles the mouse leave event. */
    protected mouseLeaveEvent(event: CMouseEvent): void {
        event.ignore();
    }

    /** Handles the focus in event. */
    protected focusInEvent(event: CFocusEvent): void {
	    event.accept();
	    this.update();
    }

    /** Handles the focus out event. */
    protected focusOutEvent(event: CFocusEvent): void {
        event.accept();
	    this.update();
    }

    /** Handles the key press event. */
    protected keyPressEvent(event: CKeyEvent): void {
        event.ignore();
    }

    /** Handles the key release event. */
    protected keyReleaseEvent(event: CKeyEvent): void {
        event.ignore();
    }

    /** Handles the wheel event. */
    protected wheelEvent(event: CWheelEvent): void {
	    event.ignore();
    }

    /** Handles the context menu event. */
    protected contextMenuEvent(event: CContextMenuEvent): void {
        event.ignore();
    }

    /** Handles child visibility changed behavior. */
    protected childVisibilityChanged(_child: CWidget): void {
	    this.#m_layout?.update();
	    this.update();
    }

	/** Handles the drag enter event. */
	protected dragEnterEvent(event: CDragEnterEvent): void {
		event.ignore();
	}

	/** Handles the drag move event. */
	protected dragMoveEvent(event: CDragMoveEvent): void {
		event.ignore();
	}

	/** Handles the drag leave event. */
	protected dragLeaveEvent(event: CDragLeaveEvent): void {
		event.ignore();
	}

	/** Handles the drop event. */
	protected dropEvent(event: CDropEvent): void {
		event.ignore();
	}
}
