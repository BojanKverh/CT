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

export class CToolButton extends CAbstractButton {
	#m_down = false;
	#m_hovered = false;
	#m_autoRaise = false;
	#m_icon: CIcon | null = null;
	#m_toolButtonStyle = CToolButtonStyle.IconOnly;
	#m_defaultAction: CAction | null = null;
	#m_actionChangedHandler: (() => void) | null = null;
    #m_iconSize = new CSize(16, 16);


	constructor(parent: CWidget | null = null) {
		super(parent);
	}

	override setText(text: string): void {
		super.setText(text);
		this.#m_toolButtonStyle = CToolButtonStyle.TextOnly;
		this.update();
	}

	setIcon(icon: CIcon | null): void {
		this.#m_icon = icon;
		this.#m_toolButtonStyle = CToolButtonStyle.IconOnly;
		this.update();
	}

	setTextAndIcon(text: string, icon: CIcon | null): void {
		super.setText(text);
		this.#m_icon = icon;
		this.#m_toolButtonStyle = CToolButtonStyle.TextUnderIcon;
		this.update();
	}

	icon(): CIcon | null {
		return this.#m_icon;
	}

	isDown(): boolean {
		return this.#m_down;
	}

	isHovered(): boolean {
		return this.#m_hovered;
	}

	autoRaise(): boolean {
		return this.#m_autoRaise;
	}

	setAutoRaise(autoRaise: boolean): void {
		if (this.#m_autoRaise === autoRaise)
			return;

		this.#m_autoRaise = autoRaise;
		this.update();
	}

	toolButtonStyle(): CToolButtonStyle {
		return this.#m_toolButtonStyle;
	}

	setToolButtonStyle(style: CToolButtonStyle): void {
		if (this.#m_toolButtonStyle === style)
			return;

		this.#m_toolButtonStyle = style;
		this.update();
	}

    iconSize(): CSize {
    	return this.#m_iconSize;
    }

    setIconSize(size: CSize): void {
	    this.#m_iconSize = size;
	    this.update();
    }


	defaultAction(): CAction | null {
		return this.#m_defaultAction;
	}

	setDefaultAction(action: CAction | null): void {
		if (this.#m_defaultAction === action)
			return;

		this.#disconnectAction();
		this.#m_defaultAction = action;

		if (action !== null) {
			this.#connectAction(action);

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

	override sizeHint(): CSize {
		const margin = 6;
		const spacing = 6;
		const fm = new CFontMetrics(this.font());
		const textWidth = fm.textWidth(this.text());
		const textHeight = fm.height();
		const icon = this.#m_icon;
		const iconWidth = icon !== null ? this.#m_iconSize.width() : 0;
		const iconHeight = icon !== null ? this.#m_iconSize.height() : 0;

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

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_down = true;
		event.accept();
		this.update();

		if (this.isAutoRepeat())
			this.startAutoRepeat();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void {
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

		if (wasDown && inside)
			this.#trigger();

		if (this.isAutoRepeat())
			this.stopAutoRepeat();
	}

	protected override mouseEnterEvent(event: CMouseEvent): void {
		this.#m_hovered = true;
		event.accept();
		this.update();
	}

	protected override mouseLeaveEvent(event: CMouseEvent): void {
		this.#m_hovered = false;
		event.accept();
		this.update();
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		if (event.key() === " ") {
			this.#m_down = true;
			event.accept();
			this.update();
			return;
		}

		if (event.key() === "Enter") {
			event.accept();
			this.#trigger();
			return;
		}

		event.ignore();
	}

	protected override keyReleaseEvent(event: CKeyEvent): void {
		if (event.key() !== " ") {
			event.ignore();
			return;
		}

		const wasDown = this.#m_down;
		this.#m_down = false;
		event.accept();
		this.update();

		if (wasDown)
			this.#trigger();
	}

	protected override paintEvent(painter: CPainter): void {
		
		const option = new CStyleOptionToolButton();
		option.initFromButton(this);
		option.text = this.text();
		option.icon = this.icon();
		option.iconSize = this.iconSize();
		option.toolButtonStyle = this.toolButtonStyle();
		option.autoRaise = this.autoRaise();

		if (this.isHovered())
			option.state |= CStyleState.MouseOver;

		if (this.isDown())
			option.state |= CStyleState.Sunken;
		
		if (this.isChecked())
			option.state |= CStyleState.On;

		this.style().drawToolButton(painter, option);
	}

	#trigger(): void {
		const action = this.#m_defaultAction;

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
			if (this.#m_defaultAction === action)
				this.#syncFromAction();
		};

		this.#m_actionChangedHandler = handler;
		action.changed.connect(handler);
	}

	#disconnectAction(): void {
		const action = this.#m_defaultAction;
		const handler = this.#m_actionChangedHandler;

		if (action !== null && handler !== null)
			action.changed.disconnect(handler);

		this.#m_actionChangedHandler = null;
	}
}
