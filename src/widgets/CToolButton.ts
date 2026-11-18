import type { CAction } from "../core/CAction.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CPoint } from "../geometry/CPoint.js";
import { CSize } from "../geometry/CSize.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CPainter } from "../painting/CPainter.js";
import { CAbstractButton } from "./CAbstractButton.js";
import { CWidget } from "./CWidget.js";
import { CToolButtonStyle } from "../gui/CToolButtonStyle.js";
import { CIcon } from "../gui/CIcon.js";
import { CStyleOptionToolButton } from "../gui/CStyleOptionToolButton.js";
import { CStyleState } from "../gui/CStyleOption.js";

/** Implements the tool button widget. */
export class CToolButton extends CAbstractButton {
	#m_down = false;
	#m_hovered = false;
	#m_autoRaise = false;
	#m_icon: CIcon | null = null;
	#m_toolButtonStyle = CToolButtonStyle.IconOnly;
	#m_defaultAction: CAction | null = null;
	#m_actionChangedHandler: (() => void) | null = null;
    #m_iconSize = new CSize(16, 16);


	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);
	}

	/**
	 * Changes the caption and switches to text-only styling.
	 * @param text Text to display.
	 */
	override setText(text: string): void {
		super.setText(text);
		this.#m_toolButtonStyle = CToolButtonStyle.TextOnly;
		this.update();
	}

	/**
	 * Sets the icon.
	 * @param icon Icon.
	 */
	setIcon(icon: CIcon | null): void {
		this.#m_icon = icon;
		this.#m_toolButtonStyle = CToolButtonStyle.IconOnly;
		this.update();
	}

	/**
	 * Sets the caption and icon and switches to text-under-icon styling.
	 * @param text Caption displayed below the icon.
	 * @param icon Icon to display, or `null` for none.
	 */
	setTextAndIcon(text: string, icon: CIcon | null): void {
		super.setText(text);
		this.#m_icon = icon;
		this.#m_toolButtonStyle = CToolButtonStyle.TextUnderIcon;
		this.update();
	}

	/**
	 * Reads the icon.
	 * @returns The icon.
	 */
	icon(): CIcon | null {
		return this.#m_icon;
	}

	/**
	 * Checks whether the tool button is down.
	 * @returns `true` if the tool button is down, otherwise `false`.
	 */
	isDown(): boolean {
		return this.#m_down;
	}

	/**
	 * Checks whether the tool button is hovered.
	 * @returns `true` if the tool button is hovered, otherwise `false`.
	 */
	isHovered(): boolean {
		return this.#m_hovered;
	}

	/**
	 * Reads whether the tool button uses auto-raise styling.
	 * @returns `true` if auto-raise is enabled.
	 */
	autoRaise(): boolean {
		return this.#m_autoRaise;
	}

	/**
	 * Sets the auto raise.
	 * @param autoRaise Auto raise flag.
	 */
	setAutoRaise(autoRaise: boolean): void {
		/** Provides if behavior. */
		if (this.#m_autoRaise === autoRaise)
			return;

		this.#m_autoRaise = autoRaise;
		this.update();
	}

	/**
	 * Reads the tool button style.
	 * @returns The tool button style.
	 */
	toolButtonStyle(): CToolButtonStyle {
		return this.#m_toolButtonStyle;
	}

	/**
	 * Sets the tool button style.
	 * @param style Style.
	 */
	setToolButtonStyle(style: CToolButtonStyle): void {
		/** Provides if behavior. */
		if (this.#m_toolButtonStyle === style)
			return;

		this.#m_toolButtonStyle = style;
		this.update();
	}

    /**
     * Reads the icon size.
     * @returns The icon size.
     */
    iconSize(): CSize {
    	return this.#m_iconSize;
    }

    /**
     * Changes the icon dimensions used for drawing.
     * @param size Requested icon width and height in logical pixels.
     */
    setIconSize(size: CSize): void {
	    this.#m_iconSize = size;
	    this.update();
    }


	/**
	 * Reads the default action.
	 * @returns The default action.
	 */
	defaultAction(): CAction | null {
		return this.#m_defaultAction;
	}

	/**
	 * Sets the default action.
	 * @param action Action.
	 */
	setDefaultAction(action: CAction | null): void {
		/** Provides if behavior. */
		if (this.#m_defaultAction === action)
			return;

		this.#disconnectAction();
		this.#m_defaultAction = action;

		/** Provides if behavior. */
		if (action !== null) {
			this.#connectAction(action);

			/** Provides if behavior. */
			if (action.icon() !== null && action.text().length > 0) {
				this.#m_toolButtonStyle = CToolButtonStyle.TextUnderIcon;
			} else  if (action.icon() !== null) {
				this.#m_toolButtonStyle = CToolButtonStyle.IconOnly;
			} else {
				this.#m_toolButtonStyle = CToolButtonStyle.TextOnly;
			}
		}

		this.#syncFromAction();
	}

	/**
	 * Returns the preferred size of the widget.
	 * @returns The size hint.
	 */
	override sizeHint(): CSize {
		const margin = 6;
		const spacing = 6;
		const fm = new CFontMetrics(this.font());
		const textWidth = fm.textWidth(this.text());
		const textHeight = fm.height();
		const icon = this.#m_icon;
		const iconWidth = icon !== null ? this.#m_iconSize.width() : 0;
		const iconHeight = icon !== null ? this.#m_iconSize.height() : 0;

		/** Provides switch behavior. */
		switch (this.#m_toolButtonStyle) {
			case CToolButtonStyle.IconOnly:
				return new CSize(
					Math.max(28, iconWidth + 2 * margin),
					Math.max(28, iconHeight + 2 * margin)
				);

			case CToolButtonStyle.TextOnly:
				return new CSize(
					Math.max(28, textWidth + 2 * margin),
					Math.max(28, textHeight + 2 * margin)
				);

			case CToolButtonStyle.TextBesideIcon:
				return new CSize(
					Math.max(
						28,
						iconWidth + spacing + textWidth + 2 * margin
					),
					Math.max(
						28,
						Math.max(iconHeight, textHeight) + 2 * margin
					)
				);

			case CToolButtonStyle.TextUnderIcon:
				return new CSize(
					Math.max(
						28,
						Math.max(iconWidth, textWidth) + 2 * margin
					),
					Math.max(
						28,
						iconHeight + spacing + textHeight + 2 * margin
					)
				);
		}
	}

	/**
	 * Responds to a pointer button press for the tool button. May update the down. May request a repaint and accept or ignore the event depending on the input.
	 * @param event Event for a pointer button press.
	 */
	protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_down = true;
		event.accept();
		this.update();

		/** Provides if behavior. */
		if (this.isAutoRepeat())
			this.startAutoRepeat();
	}

	/**
	 * Responds to a pointer button release for the tool button. May update the down. May request a repaint and accept or ignore the event depending on the input.
	 * @param event Event for a pointer button release.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		const inside = this.rect().contains(
			new CPoint(event.x(), event.y())
		);

		this.#m_down = false;
		event.accept();
		this.update();

		/** Provides if behavior. */
		if (wasDown && inside)
			this.#trigger();

		/** Provides if behavior. */
		if (this.isAutoRepeat())
			this.stopAutoRepeat();
	}

	/**
	 * Responds to pointer entry for the tool button. May update the hovered. May accept the event and request a repaint.
	 * @param event Event for pointer entry.
	 */
	protected override mouseEnterEvent(event: CMouseEvent): void {
		this.#m_hovered = true;
		event.accept();
		this.update();
	}

	/**
	 * Responds to pointer exit for the tool button. May update the hovered. May accept the event and request a repaint.
	 * @param event Event for pointer exit.
	 */
	protected override mouseLeaveEvent(event: CMouseEvent): void {
		this.#m_hovered = false;
		event.accept();
		this.update();
	}

	/**
	 * Responds to a key press for the tool button. May update the down. May request a repaint and accept or ignore the event depending on the input.
	 * @param event Event for a key press.
	 */
	protected override keyPressEvent(event: CKeyEvent): void {
		/** Provides if behavior. */
		if (event.key() === " ") {
			this.#m_down = true;
			event.accept();
			this.update();
			return;
		}

		/** Provides if behavior. */
		if (event.key() === "Enter") {
			event.accept();
			this.#trigger();
			return;
		}

		event.ignore();
	}

	/**
	 * Responds to a key release for the tool button. May update the down. May request a repaint and accept or ignore the event depending on the input.
	 * @param event Event for a key release.
	 */
	protected override keyReleaseEvent(event: CKeyEvent): void {
		/** Provides if behavior. */
		if (event.key() !== " ") {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;
		event.accept();
		this.update();

		/** Provides if behavior. */
		if (wasDown)
			this.#trigger();
	}

	/**
	 * Draws the tool button through the supplied painter.
	 * @param painter Painter for the current drawing operation.
	 */
	protected override paintEvent(painter: CPainter): void {
		
		const option = new CStyleOptionToolButton();
		option.initFromButton(this);
		option.text = this.text();
		option.icon = this.icon();
		option.iconSize = this.iconSize();
		option.toolButtonStyle = this.toolButtonStyle();
		option.autoRaise = this.autoRaise();

		/** Provides if behavior. */
		if (this.isHovered())
			option.state |= CStyleState.MouseOver;

		/** Provides if behavior. */
		if (this.isDown())
			option.state |= CStyleState.Sunken;
		
		/** Provides if behavior. */
		if (this.isChecked())
			option.state |= CStyleState.On;

		this.style().drawToolButton(painter, option);
	}

	#trigger(): void {
		const action = this.#m_defaultAction;

		/** Provides if behavior. */
		if (action !== null) {
			action.trigger();
			this.#syncFromAction();
		} else if (this.isCheckable()) {
			this.toggle();
		}

		this.clicked.emit();
	}

	#syncFromAction(): void {
		const action = this.#m_defaultAction;

		/** Provides if behavior. */
		if (action === null) {
			this.update();
			return;
		}

		super.setText(action.text());
		this.#m_icon = action.icon();
		this.setEnabled(action.isEnabled());
		this.setCheckable(action.isCheckable());
		this.setChecked(action.isChecked());
		this.update();
	}

	#connectAction(action: CAction): void {
		const handler = (): void => {
			/** Provides if behavior. */
			if (this.#m_defaultAction === action)
				this.#syncFromAction();
		};

		this.#m_actionChangedHandler = handler;
		action.changed.connect(handler);
	}

	#disconnectAction(): void {
		const action = this.#m_defaultAction;
		const handler = this.#m_actionChangedHandler;

		/** Provides if behavior. */
		if (action !== null && handler !== null)
			action.changed.disconnect(handler);

		this.#m_actionChangedHandler = null;
	}
}
