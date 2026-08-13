import { CApplication } from "../core/CApplication.js";
import { CObject } from "../core/CObject.js";
import { CRect } from "../geometry/CRect.js";
import { CPainter } from "../painting/CPainter.js";

export class CWidget extends CObject {
    #m_geometry = new CRect();

    #m_visible = true;
    #m_enabled = true;

    constructor(parent: CWidget | null = null) {
        /*
         * Parent deliberately isn't passed to CObject here.
         *
         * CWidget.setParent() also maintains the application's
         * top-level widget registry, so widget construction is
         * handled explicitly after the base object is initialized.
         */
        super(null);

        if (parent !== null)
            super.setParent(parent);
        else
            CApplication.instance().registerTopLevelWidget(this);
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
        return new CRect(
            this.#m_geometry.x(),
            this.#m_geometry.y(),
            this.#m_geometry.width(),
            this.#m_geometry.height()
        );
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
        if (x === this.x() && y === this.y() 
            && width === this.width() && height === this.height())
            return;

        this.#m_geometry.setGeometry(x, y, width, height);
        this.update();
    }

    move(x: number, y: number): void {
        if (x === this.x() && y === this.y())
            return;

        this.#m_geometry.setGeometry(x, y, this.width(), this.height());
        this.update();
    }

    resize(width: number, height: number): void {
        if (width === this.width() && height === this.height())
            return;
        
        this.#m_geometry.setGeometry(this.x(), this.y(), width, height);
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

    show(): void {
        this.setVisible(true);
    }

    hide(): void {
        this.setVisible(false);
    }

    isEnabled(): boolean {
        return this.#m_enabled;
    }

    render(painter: CPainter): void {
        if (!this.isVisible())
            return;

        painter.save();

        try {
            painter.translate(this.x(), this.y());

            this.paintEvent(painter);

            for (const child of this.children())
            child.render(painter);
        } finally {
            painter.restore();
        }
}

    protected paintEvent(_painter: CPainter): void {
    }

    update(): void {
        CApplication.instance().requestRepaint();
    }
}