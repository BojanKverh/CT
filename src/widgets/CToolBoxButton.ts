import { CAbstractButton } from "./CAbstractButton.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CSize } from "../geometry/CSize.js";
import type { CPainter } from "../painting/CPainter.js";
import type { CWidget } from "./CWidget.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";

export class CToolBoxButton extends CAbstractButton
{
	static readonly #HEIGHT = 28;
	static readonly #PADDING = 8;

	#m_hovered = false;
	#m_down = false;
	#m_current = false;

	constructor(parent: CWidget | null = null)
	{
		super(parent);
        this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	isHovered(): boolean
	{
		return this.#m_hovered;
	}

	isDown(): boolean
	{
		return this.#m_down;
	}

	isCurrent(): boolean
	{
		return this.#m_current;
	}

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
				2 * CToolBoxButton.#PADDING,
			CToolBoxButton.#HEIGHT
		);
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

	protected override paintEvent(painter: CPainter): void
	{
        this.style().drawToolBoxButton(painter, this);
	}
}