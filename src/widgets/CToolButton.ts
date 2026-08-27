import type { CAction } from "../core/CAction.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CPoint } from "../geometry/CPoint.js";
import { CSize } from "../geometry/CSize.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import type { CPainter } from "../painting/CPainter.js";
import { CAbstractButton } from "./CAbstractButton.js";
import { CWidget } from "./CWidget.js";
import { CPixmap } from "../painting/CPixmap.js";

export enum CToolButtonStyle {
	IconOnly,
	TextOnly,
	TextBesideIcon,
	TextUnderIcon
}

export class CToolButton extends CAbstractButton {
	#m_down = false;
	#m_hovered = false;
	#m_autoRaise = false;
	#m_icon: CPixmap | null = null;
	#m_toolButtonStyle = CToolButtonStyle.IconOnly;
	#m_defaultAction: CAction | null = null;

	constructor(parent: CWidget | null = null) {
		super(parent);
	}

	override setText(text: string): void {
		super.setText(text);
		this.#m_toolButtonStyle = CToolButtonStyle.TextOnly;
		this.update();
	}

	setIcon(icon: CPixmap | null): void {
		this.#m_icon = icon;
		this.#m_toolButtonStyle = CToolButtonStyle.IconOnly;
		this.update();
	}

	setTextAndIcon(text: string, icon: CPixmap | null): void {
		super.setText(text);
		this.#m_icon = icon;
		this.#m_toolButtonStyle = CToolButtonStyle.TextUnderIcon;
		this.update();
	}

	icon(): CPixmap | null {
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

	defaultAction(): CAction | null {
		return this.#m_defaultAction;
	}

	setDefaultAction(action: CAction | null): void {
		if (this.#m_defaultAction === action)
			return;

		this.#m_defaultAction = action;

		if (action !== null) {
			action.changed.connect(() => {
				if (this.#m_defaultAction === action)
					this.#syncFromAction();
			});
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
		const iconWidth = icon?.width() ?? 0;
		const iconHeight = icon?.height() ?? 0;

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
		this.style().drawToolButton(painter, this);
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
		this.setEnabled(action.isEnabled());
		this.setCheckable(action.isCheckable());
		this.setChecked(action.isChecked());
		this.update();
	}
}
