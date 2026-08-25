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
import { CStyle } from "../gui/CStyle.js";

export class CWidget extends CObject {
    #m_geometry = new CRect();

    #m_visible = true;
    #m_enabled = true;
	#m_font: string;
    #m_layout: CLayout | null = null;
    #m_minimumSize = new CSize(0, 0);
    #m_palette: CPalette;

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

	setFont(font: string, propagate = false): void {
		const changed = this.#m_font !== font;

		if (changed)
			this.#m_font = font;

		if (propagate) {
			for (const child of this.children())
				child.setFont(font, true);
		}

		if (changed)
			this.update();
	}

    palette() : CPalette {
        return this.#m_palette;
    }

    setPalette(palette: CPalette, propagate = false): void {
        const changed = this.#m_palette !== palette;
        if (changed)
	        this.#m_palette = palette;

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

    show(): void {
        this.setVisible(true);
    }

    hide(): void {
        this.setVisible(false);
    }

	destroy(): void
	{
		const app = CApplication.instance();

		for (const child of [...this.children()])
			child.destroy();

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
		if (!this.isEnabled())
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

			for (const child of this.children())
                if (child instanceof CWidget)
				    child.render(painter);
		} finally {
			painter.restore();
		}
	}    

    widgetAt(x: number, y: number): CWidget | null {
        if (!this.isVisible())
            return null;

        if (!this.rect().contains(new CPoint(x, y)))
            return null;

        const children = this.children();

        for (let i = children.length - 1; i >= 0; --i) {
            const child = children[i]!;
            if (!(child instanceof CWidget))
                continue;
            const widget = child.widgetAt(
                x - child.x(),
                y - child.y()
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
	    return new CSize(this.#m_minimumSize.width(),
		    this.#m_minimumSize.height()
    	);
    }

    setMinimumSize(width: number, height: number): void {
    	if (this.#m_minimumSize.width() === width
		        && this.#m_minimumSize.height() === height
	    )
		    return;

	    this.#m_minimumSize.resize(width, height);
    	const parent = this.parent();
    	if (parent instanceof CWidget)
	    	parent.layout()?.update();
    }

    sizeHint(): CSize {
	    return new CSize(0, 0);
    }

    protected paintEvent(_painter: CPainter): void {
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

            widget = widget.parent();
        }

        return new CPoint(localX, localY);
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
}
