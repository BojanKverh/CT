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

export class CWidget extends CObject {
    #m_geometry = new CRect();

    #m_visible = true;
    #m_enabled = true;
	#m_font: string;
    #m_layout: CLayout | null = null;
    #m_minimumSize = new CSize(0, 0);
    #m_maximumSize = new CSize(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    #m_palette: CPalette;
    #m_toolTip = "";
    #m_fontMetrics: CFontMetrics;
    #m_cursor: CCursorShape = CCursorShape.Arrow;
    #m_focusPolicy = CFocusPolicy.NoFocus;
    #m_acceptDrops = false;

	constructor(parent: CWidget | null = null) {
        super(null);

        if (parent !== null) {
            super.setParent(parent);
            this.#m_font = parent.font();
            this.#m_palette = parent.palette();
        } else {
            CApplication.instance().registerTopLevelWidget(this);
            this.#m_font = CApplication.instance().font();
            this.#m_palette = CApplication.instance().palette();
        }

        this.#m_fontMetrics = new CFontMetrics(this.#m_font);
    }

    override parent(): CWidget | null {
        return super.parent() as CWidget | null;
    }

    override children(): readonly CWidget[] {
        return super.children() as readonly CWidget[];
    }

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
    }

    geometry(): CRect {
        return new CRect(this.x(), this.y(), this.width(), this.height());
    }

    rect(): CRect {
        return new CRect(0, 0, this.width(), this.height());
    }

    x(): number {
        return this.#m_geometry.x();
    }

    y(): number {
        return this.#m_geometry.y();
    }

    width(): number {
        return this.#m_geometry.width();
    }

    height(): number {
        return this.#m_geometry.height();
    }

    setGeometry(x: number, y: number, width: number, height: number): void {
        if (x === this.x() && y === this.y() && width === this.width()
            && height === this.height())
            return;

        this.#m_geometry.setGeometry(x, y, width, height);
        this.#m_layout?.update();
        this.update();
    }

    move(x: number, y: number): void {
        this.setGeometry(x, y, this.width(), this.height());
    }

    resize(width: number, height: number): void {
        this.setGeometry(this.x(), this.y(), width, height);
    }

    setVisible(visible: boolean): void {
	    if (this.#m_visible === visible)
		    return;

	    this.#m_visible = visible;
	    const parent = this.parent();
	    if (parent !== null)
		    parent.childVisibilityChanged(this);
	    this.update();
    }

    setEnabled(enabled: boolean): void {
        if (this.#m_enabled === enabled)
            return;

        this.#m_enabled = enabled;
        this.update();
    }

    isVisible(): boolean {
        return this.#m_visible;
    }

	font(): string {
		return this.#m_font;
	}

    fontMetrics() : CFontMetrics {
        return this.#m_fontMetrics;
    }

	setFont(font: string, propagate = false): void {
		const changed = this.#m_font !== font;

		if (changed)
			this.#m_font = font;

        this.#m_fontMetrics = new CFontMetrics(this.#m_font);

		if (propagate) {
			for (const child of this.children())
				child.setFont(font, true);
		}

		if (changed)
			this.update();
	}

    palette() : CPalette {
        return new CPalette(this.#m_palette);
    }

    setPalette(palette: CPalette, propagate = false): void {
        const changed = !this.#m_palette.isEqual(palette);
        if (changed)
	        this.#m_palette = new CPalette(palette);

	    if (propagate) {
		    for (const child of this.children())
			    child.setPalette(palette, true);
	    }

        if (changed)
	        this.update();
    }

    style(): CStyle {
	    return CApplication.instance().style();
    }

	setCursor(cursor: CCursorShape): void
	{
		this.#m_cursor = cursor;
	}

	cursor(): CCursorShape
	{
		return this.#m_cursor;
	}

    show(): void {
        this.setVisible(true);
    }

    hide(): void {
        this.setVisible(false);
    }

    acceptsClickFocus(): boolean {
		return (this.#m_focusPolicy
			& CFocusPolicy.ClickFocus) !== 0;
	}

	acceptsTabFocus(): boolean {
		return (this.#m_focusPolicy
			& CFocusPolicy.TabFocus) !== 0;
	}

    focusPolicy(): CFocusPolicy {
		return this.#m_focusPolicy;
	}

	setFocusPolicy(policy: CFocusPolicy): void {
		if (this.#m_focusPolicy === policy)
			return;

		this.#m_focusPolicy = policy;

		if (policy === CFocusPolicy.NoFocus
			&& this.hasFocus())
			this.clearFocus();
	}

	override destroy(): void
	{
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

    isEnabled(): boolean {
        return this.#m_enabled;
    }

	hasFocus(): boolean {
		return CApplication.instance().focusWidget() === this;
	}

    setFocus(): void {
		if (!this.isEnabled() || this.#m_focusPolicy === CFocusPolicy.NoFocus)
			return;

		CApplication.instance().setFocusWidget(this);
	}

	clearFocus(): void {
		if (this.hasFocus())
			CApplication.instance().setFocusWidget(null);
	}

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

				if (CApplication.instance().isWindowWidget(child))
					continue;

				child.render(painter);
			}

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

    contentsRect(): CRect {
	    return this.rect();
    }

	protected childOffset(): CPoint {
		return new CPoint(0, 0);
	}

    widgetAt(x: number, y: number): CWidget | null {
        if (!this.isVisible())
            return null;

        if (!this.rect().contains(new CPoint(x, y)))
            return null;

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

    layout(): CLayout | null {
	    return this.#m_layout;
    }

    setLayout(layout: CLayout): void {
	    if (this.#m_layout === layout)
		    return;

	    this.#m_layout = layout;
	    layout.setParentWidget(this);
	    layout.update();
    }

    minimumSize(): CSize {
	    return new CSize(this.#m_minimumSize.width(), this.#m_minimumSize.height());
    }

    minimumWidth(): number {
        return this.#m_minimumSize.width();
    }

    maximumWidth(): number {
        return this.#m_maximumSize.width();
    }

    minimumHeight(): number {
        return this.#m_minimumSize.height();
    }

    maximumHeight(): number {
        return this.#m_maximumSize.height();
    }

    maximumSize(): CSize {
	    return new CSize(this.#m_maximumSize.width(), this.#m_maximumSize.height());
    }

    setMinimumSize(width: number, height: number): void {
        width = Math.max(0, width);
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

    setMaximumSize(width: number, height: number): void {
        width = Math.max(0, width);
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

    setFixedSize(width: number, height: number): void {
        this.setMinimumSize(width, height);
        this.setMaximumSize(width, height);
        this.setMinimumSize(width, height);
        this.resize(width, height);
    }

    sizeHint(): CSize {
        if (this.#m_layout !== null)
		    return this.#m_layout.sizeHint();
        else
	        return new CSize(0, 0);
    }

    setToolTip(toolTip: string): void
	{
		this.#m_toolTip = toolTip;
	}

	toolTip(): string
	{
		return this.#m_toolTip;
	}

    acceptDrops(): boolean {
		return this.#m_acceptDrops;
	}

	setAcceptDrops(accept: boolean): void {
		this.#m_acceptDrops = accept;
	}

    update(): void {
        CApplication.instance().requestRepaint();
    }

    event(event: CEvent): boolean {
        if (!this.isEnabled()) {
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

    protected paintEvent(_painter: CPainter): void {
    }

    protected mousePressEvent(event: CMouseEvent): void {
        event.ignore();
    }

    protected mouseReleaseEvent(event: CMouseEvent): void {
        event.ignore();
    }

    protected mouseMoveEvent(event: CMouseEvent): void {
        event.ignore();
    }

    protected mouseEnterEvent(event: CMouseEvent): void {
        event.ignore();
    }

    protected mouseLeaveEvent(event: CMouseEvent): void {
        event.ignore();
    }

    protected focusInEvent(event: CFocusEvent): void {
	    event.accept();
	    this.update();
    }

    protected focusOutEvent(event: CFocusEvent): void {
        event.accept();
	    this.update();
    }

    protected keyPressEvent(event: CKeyEvent): void {
        event.ignore();
    }

    protected keyReleaseEvent(event: CKeyEvent): void {
        event.ignore();
    }

    protected wheelEvent(event: CWheelEvent): void {
	    event.ignore();
    }

    protected contextMenuEvent(event: CContextMenuEvent): void {
        event.ignore();
    }

    protected childVisibilityChanged(_child: CWidget): void {
	    this.#m_layout?.update();
	    this.update();
    }

	protected dragEnterEvent(event: CDragEnterEvent): void {
		event.ignore();
	}

	protected dragMoveEvent(event: CDragMoveEvent): void {
		event.ignore();
	}

	protected dragLeaveEvent(event: CDragLeaveEvent): void {
		event.ignore();
	}

	protected dropEvent(event: CDropEvent): void {
		event.ignore();
	}
}
