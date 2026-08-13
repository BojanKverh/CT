import { CObject } from "./CObject.js";
import type { CWidget } from "../widgets/CWidget.js";

export class CApplication extends CObject {
    static #m_instance: CApplication | null = null;

    #m_canvas: HTMLCanvasElement;
    #m_topLevelWidgets = new Set<CWidget>();

    #m_updatesEnabled = false;
    #m_frameRequest: number | null = null;

    constructor(canvas: HTMLCanvasElement) {
        super();

        if (CApplication.#m_instance !== null)
            throw new Error("Only one CApplication instance can exist.");

        CApplication.#m_instance = this;
        this.#m_canvas = canvas;
    }

    static instance(): CApplication {
        if (CApplication.#m_instance === null)
            throw new Error("CApplication has not been created.");

        return CApplication.#m_instance;
    }

    static exists(): boolean {
        return CApplication.#m_instance !== null;
    }

    canvas(): HTMLCanvasElement {
        return this.#m_canvas;
    }

    topLevelWidgets(): readonly CWidget[] {
        return [...this.#m_topLevelWidgets];
    }

    registerTopLevelWidget(widget: CWidget): void {
        if (widget.parent() !== null)
            throw new Error("A top-level widget cannot have a parent.");

        this.#m_topLevelWidgets.add(widget);
    }

    unregisterTopLevelWidget(widget: CWidget): void {
        this.#m_topLevelWidgets.delete(widget);
    }

    updatesEnabled(): boolean {
        return this.#m_updatesEnabled;
    }

    startUpdates(): void {
        if (this.#m_updatesEnabled)
            return;

        this.#m_updatesEnabled = true;

        this.requestRepaint();
    }

    stopUpdates(): void {
        if (!this.#m_updatesEnabled)
            return;

        this.#m_updatesEnabled = false;

        if (this.#m_frameRequest !== null) {
            cancelAnimationFrame(this.#m_frameRequest);
            this.#m_frameRequest = null;
        }
    }

    requestRepaint(): void {
        if (!this.#m_updatesEnabled)
            return;

        if (this.#m_frameRequest !== null)
            return;

        this.#m_frameRequest = requestAnimationFrame(() => {
            this.#m_frameRequest = null;

            this.#repaint();
        });
    }

    destroy(): void {
        if (CApplication.#m_instance !== this)
            return;

        this.stopUpdates();

        this.#m_topLevelWidgets.clear();
        CApplication.#m_instance = null;
    }

    #repaint(): void {
        /*
         * Actual widget painting will be implemented later.
         */
    }
}