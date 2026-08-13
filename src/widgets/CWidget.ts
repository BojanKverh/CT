import { CObject } from "../core/CObject.js";
import { CRect } from "../geometry/CRect.js";

export class CWidget extends CObject {
    #m_geometry = new CRect();

    #m_visible = true;
    #m_enabled = true;

    constructor(parent: CWidget | null = null) {
        super(parent);
    }

    override parent(): CWidget | null {
        return super.parent() as CWidget | null;
    }

    override setParent(parent: CWidget | null): void {
        super.setParent(parent);
    }

    override children(): readonly CWidget[] {
        return super.children() as readonly CWidget[];
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

    setGeometry(
        x: number,
        y: number,
        width: number,
        height: number
    ): void {
        this.#m_geometry.setGeometry(x, y, width, height);
    }

    move(x: number, y: number): void {
        this.#m_geometry.setGeometry(
            x,
            y,
            this.width(),
            this.height()
        );
    }

    resize(width: number, height: number): void {
        this.#m_geometry.setGeometry(
            this.x(),
            this.y(),
            width,
            height
        );
    }

    isVisible(): boolean {
        return this.#m_visible;
    }

    setVisible(visible: boolean): void {
        this.#m_visible = visible;
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

    setEnabled(enabled: boolean): void {
        this.#m_enabled = enabled;
    }
}