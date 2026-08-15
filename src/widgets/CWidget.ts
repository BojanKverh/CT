import { CApplication } from "../core/CApplication.js";
import { CObject } from "../core/CObject.js";
import { CPoint } from "../geometry/CPoint.js";
import { CRect } from "../geometry/CRect.js";
import type { CPainter } from "../painting/CPainter.js";
import { CEvent, CEventType } from "../events/CEvent.js";
import { CMouseEvent } from "../events/CMouseEvent.js";
import { CFocusEvent } from "../events/CFocusEvent.js";

export class CWidget extends CObject {
    #m_geometry = new CRect();

    #m_visible = true;
    #m_enabled = true;
	#m_font: string;

    constructor(parent: CWidget | null = null) {
        /*
         * Parent deliberately isn't passed to CObject here.
         *
         * CWidget.setParent() also maintains the application's
         * top-level widget registry, so widget construction is
         * handled explicitly after the base object is initialized.
         */
        super(null);

        if (parent !== null) {
            super.setParent(parent);
            this.#m_font = parent.font();
        } else {
            CApplication.instance().registerTopLevelWidget(this);
            this.#m_font = CApplication.instance().font();
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

        /*
         * Let CObject validate the new hierarchy first.
         * If it rejects the operation, the top-level registry
         * must remain unchanged.
         */
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
        if (
            x === this.x()
            && y === this.y()
            && width === this.width()
            && height === this.height()
        )
            return;

        this.#m_geometry.setGeometry(x, y, width, height);
        this.update();
    }

    move(x: number, y: number): void {
        if (x === this.x() && y === this.y())
            return;

        this.#m_geometry.setGeometry(
            x,
            y,
            this.width(),
            this.height()
        );

        this.update();
    }

    resize(width: number, height: number): void {
        if (width === this.width() && height === this.height())
            return;

        this.#m_geometry.setGeometry(
            this.x(),
            this.y(),
            width,
            height
        );

        this.update();
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

	setFont(font: string): void {
		if (this.#m_font === font)
			return;

		this.#m_font = font;
		this.update();
	}

    show(): void {
        this.setVisible(true);
    }

    hide(): void {
        this.setVisible(false);
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
            const widget = child.widgetAt(
                x - child.x(),
                y - child.y()
            );

            if (widget !== null)
                return widget;
        }

        return this;
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
        event.ignore();
    }

    protected focusOutEvent(event: CFocusEvent): void {
        event.ignore();
    }
}
