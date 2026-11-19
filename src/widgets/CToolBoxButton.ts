/** @module Widgets/CToolBoxButton */
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CAbstractButton } from "./CAbstractButton.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CSize } from "../geometry/CSize.js";
import type { CPainter } from "../painting/CPainter.js";
import type { CWidget } from "./CWidget.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CStyleOptionToolBoxButton } from "../gui/CStyleOptionToolBoxButton.js";

/** Focusable page header used by CToolBox; Enter activates the associated page. */
export class CToolBoxButton extends CAbstractButton
{
	static readonly #HEIGHT = 28;
	static readonly #PADDING = 8;

	#m_hovered = false;
	#m_down = false;
	#m_current = false;

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null)
	{
		super(parent);
        this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

    /**
    * Whether hover feedback is active.
    * The initial value is `false`.
    */
    isHovered(): boolean
	{
		return this.#m_hovered;
	}

    /**
    * Whether pressed feedback is active.
    * The initial value is `false`.
    */
    isDown(): boolean
	{
		return this.#m_down;
	}

    /**
    * Whether this heading belongs to the currently expanded toolbox page.
    */
    isCurrent(): boolean
	{
		return this.#m_current;
	}

    /**
    * Sets whether this header represents the toolbox's currently open page.
    */
    setCurrent(current: boolean): void
	{
		if (this.#m_current === current)
			return;

		this.#m_current = current;
		this.update();
	}

	override sizeHint(): CSize
	{
		return new CSize(
			this.fontMetrics().textWidth(this.text()) +
				2 * CToolBoxButton.#PADDING + 16,
			CToolBoxButton.#HEIGHT
		);
	}

    protected override keyPressEvent(event: CKeyEvent): void {
        if (event.key() !== "Enter" && event.key() !== "Return") {
            super.keyPressEvent(event);
            return;
        }

        event.accept();
        this.clicked.emit();
    }

	protected override mousePressEvent(event: CMouseEvent): void
	{
		if (event.button() !== CMouseButton.LeftButton ||
			!this.isEnabled()) {
			event.ignore();
			return;
		}

		this.#m_down = true;

		event.accept();
		this.update();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void
	{
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;

		event.accept();
		this.update();

		if (wasDown && this.isEnabled())
			this.clicked.emit();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void
	{
		if (this.#m_hovered) {
			event.ignore();
			return;
		}

		this.#m_hovered = true;

		event.accept();
		this.update();
	}

	protected override mouseLeaveEvent(event: CMouseEvent): void
    {
	    if (!this.#m_hovered && !this.#m_down) {
		    event.ignore();
		    return;
	    }

	    this.#m_hovered = false;
	    this.#m_down = false;

	    event.accept();
	    this.update();
    }

	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionToolBoxButton();
		option.initFromToolBoxButton(this);

		this.style().drawToolBoxButton(painter, option);
	}
}