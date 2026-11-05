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

	/** Returns whether the hovered condition is active. */
	isHovered(): boolean
	{
		return this.#m_hovered;
	}

	/** Returns whether the down condition is active. */
	isDown(): boolean
	{
		return this.#m_down;
	}

	/** Returns whether the current condition is active. */
	isCurrent(): boolean
	{
		return this.#m_current;
	}

	/** Sets the current. */
	setCurrent(current: boolean): void
	{
		/** Provides if behavior. */
		if (this.#m_current === current)
			return;

		this.#m_current = current;
		this.update();
	}

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize
	{
		return new CSize(
			this.fontMetrics().textWidth(this.text()) +
				2 * CToolBoxButton.#PADDING + 16,
			CToolBoxButton.#HEIGHT
		);
	}

	/** Handles the mouse press event. */
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

	/** Handles the mouse release event. */
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

	/** Handles the mouse move event. */
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

	/** Handles the mouse leave event. */
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

	/** Handles the paint event. */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionToolBoxButton();
		option.initFromToolBoxButton(this);

		this.style().drawToolBoxButton(painter, option);
	}
}