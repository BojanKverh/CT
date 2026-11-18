import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CAbstractButton } from "./CAbstractButton.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CSize } from "../geometry/CSize.js";
import type { CPainter } from "../painting/CPainter.js";
import type { CWidget } from "./CWidget.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CStyleOptionToolBoxButton } from "../gui/CStyleOptionToolBoxButton.js";

/** Implements the tool box button widget. */
export class CToolBoxButton extends CAbstractButton
{
	static readonly #HEIGHT = 28;
	static readonly #PADDING = 8;

	#m_hovered = false;
	#m_down = false;
	#m_current = false;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null)
	{
		/** Provides super behavior. */
		super(parent);
        this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	/**
	 * Checks whether the tool box button is hovered.
	 * @returns `true` if the tool box button is hovered, otherwise `false`.
	 */
	isHovered(): boolean
	{
		return this.#m_hovered;
	}

	/**
	 * Checks whether the tool box button is down.
	 * @returns `true` if the tool box button is down, otherwise `false`.
	 */
	isDown(): boolean
	{
		return this.#m_down;
	}

	/**
	 * Checks whether the tool box button is current.
	 * @returns `true` if the tool box button is current, otherwise `false`.
	 */
	isCurrent(): boolean
	{
		return this.#m_current;
	}

	/**
	 * Sets the current.
	 * @param current Current flag.
	 */
	setCurrent(current: boolean): void
	{
		/** Provides if behavior. */
		if (this.#m_current === current)
			return;

		this.#m_current = current;
		this.update();
	}

	/**
	 * Returns the preferred size of the widget.
	 * @returns A new `CSize`.
	 */
	override sizeHint(): CSize
	{
		return new CSize(
			this.fontMetrics().textWidth(this.text()) +
				2 * CToolBoxButton.#PADDING + 16,
			CToolBoxButton.#HEIGHT
		);
	}

    /**
     * Responds to a key press for the tool box button. May accept the event. May emit `clicked`.
     * @param event Event for a key press.
     */
    protected override keyPressEvent(event: CKeyEvent): void {
        if (event.key() !== "Enter" && event.key() !== "Return") {
            super.keyPressEvent(event);
            return;
        }

        event.accept();
        this.clicked.emit();
    }

	/**
	 * Responds to a pointer button press for the tool box button. May update the down. May request a repaint and accept or ignore the event depending on the input.
	 * @param event Event for a pointer button press.
	 */
	protected override mousePressEvent(event: CMouseEvent): void
	{
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton ||
			!this.isEnabled()) {
			event.ignore();
			return;
		}

		this.#m_down = true;

		event.accept();
		this.update();
	}

	/**
	 * Responds to a pointer button release for the tool box button. May update the down. May request a repaint and accept or ignore the event depending on the input. May emit `clicked`.
	 * @param event Event for a pointer button release.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void
	{
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;

		event.accept();
		this.update();

		/** Provides if behavior. */
		if (wasDown && this.isEnabled())
			this.clicked.emit();
	}

	/**
	 * Responds to pointer movement for the tool box button. May update the hovered. May request a repaint and accept or ignore the event depending on the input.
	 * @param event Event for pointer movement.
	 */
	protected override mouseMoveEvent(event: CMouseEvent): void
	{
		/** Provides if behavior. */
		if (this.#m_hovered) {
			event.ignore();
			return;
		}

		this.#m_hovered = true;

		event.accept();
		this.update();
	}

	/**
	 * Responds to pointer exit for the tool box button. May update the hovered, the down. May request a repaint and accept or ignore the event depending on the input.
	 * @param event Event for pointer exit.
	 */
	protected override mouseLeaveEvent(event: CMouseEvent): void
    {
	    /** Provides if behavior. */
	    if (!this.#m_hovered && !this.#m_down) {
		    event.ignore();
		    return;
	    }

	    this.#m_hovered = false;
	    this.#m_down = false;

	    event.accept();
	    this.update();
    }

	/**
	 * Draws the tool box button through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionToolBoxButton();
		option.initFromToolBoxButton(this);

		this.style().drawToolBoxButton(painter, option);
	}
}