import { CAction } from "../core/CAction.js";
import { COrientation } from "../gui/COrientation.js";
import { CPainter } from "../painting/CPainter.js";
import { CToolButton } from "./CToolButton.js";
import { CWidget } from "./CWidget.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import { CStyleOptionToolBar } from "../gui/CStyleOptionToolBar.js";

type CToolBarItem =
	| {
		type: "action";
		action: CAction;
		button: CToolButton;
	}
	| {
		type: "separator";
		widget: CToolBarSeparator;
	}
	| {
		type: "widget";
		widget: CWidget;
	};

class CToolBarSeparator extends CWidget {
	#m_orientation: COrientation;

	constructor(
		orientation: COrientation,
		parent: CWidget
	) {
		super(parent);

		this.#m_orientation = orientation;
	}

	setOrientation(orientation: COrientation): void {
		if (this.#m_orientation === orientation)
			return;

		this.#m_orientation = orientation;
		this.update();
	}

	protected override paintEvent(painter: CPainter): void {
		const palette = this.palette();

		painter.setPen(
			palette.color(
				CPaletteColorRole.Mid
			).toCss()
		);

		if (this.#m_orientation === COrientation.Horizontal) {
			const x = this.width() / 2;

			painter.drawLine(
				x, 4,
				x, this.height() - 4
			);
		} else {
			const y = this.height() / 2;

			painter.drawLine(
				4, y,
				this.width() - 4, y
			);
		}
	}
}

export class CToolBar extends CWidget {
	static readonly DefaultExtent = 36;
	static readonly Spacing = 2;
	static readonly Margin = 4;
	static readonly SeparatorExtent = 8;

	#m_items: CToolBarItem[] = [];
	#m_orientation = COrientation.Horizontal;

	constructor(parent: CWidget | null = null) {
		super(parent);
	}

	orientation(): COrientation {
		return this.#m_orientation;
	}

	setOrientation(orientation: COrientation): void {
		if (this.#m_orientation === orientation)
			return;

		this.#m_orientation = orientation;

		for (const item of this.#m_items) {
			if (item.type === "separator")
				item.widget.setOrientation(orientation);
		}

		this.#updateItemGeometry();
		this.update();
	}

	count(): number {
		return this.#m_items.length;
	}

	addAction(action: CAction): CToolButton {
		const button = new CToolButton(this);

		button.setDefaultAction(action);
		button.setAutoRaise(true);

		this.#m_items.push({type: "action", action, button});

		this.#updateItemGeometry();
		this.update();

		return button;
	}

	addSeparator(): CWidget {
		const separator = new CToolBarSeparator(
			this.#m_orientation,
			this
		);

		this.#m_items.push({
			type: "separator",
			widget: separator
		});

		this.#updateItemGeometry();
		this.update();

		return separator;
	}

	addWidget(widget: CWidget): CWidget {
		widget.setParent(this);

		this.#m_items.push({type: "widget", widget});
		this.#updateItemGeometry();
		this.update();

		return widget;
	}

	actionAt(index: number): CAction | null {
		const item = this.#m_items[index];

		if (item === undefined || item.type !== "action")
			return null;

		return item.action;
	}

	widgetForAction(action: CAction): CToolButton | null {
		for (const item of this.#m_items) {
			if (
				item.type === "action" &&
				item.action === action
			) {
				return item.button;
			}
		}

		return null;
	}

	clear(): void {
		for (const item of this.#m_items) {
			const widget = item.type === "action"
				? item.button
				: item.widget;

			widget.setParent(null);
		}

		this.#m_items = [];

		this.update();
	}

	override setGeometry(
		x: number,
		y: number,
		width: number,
		height: number
	): void {
		super.setGeometry(x, y, width, height);

		this.#updateItemGeometry();
	}

	override resize(width: number, height: number): void {
		super.resize(width, height);

		this.#updateItemGeometry();
	}

	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionToolBar();
		option.initFromToolBar(this);

		this.style().drawToolBar(painter, option);
	}

	#updateItemGeometry(): void {
		const margin = CToolBar.Margin;
		const spacing = CToolBar.Spacing;

		let position = margin;

		for (const item of this.#m_items) {
			const widget = item.type === "action"
				? item.button
				: item.widget;

			if (item.type === "separator") {
				if (this.#m_orientation === COrientation.Horizontal) {
					widget.setGeometry(
						position,
						margin,
						CToolBar.SeparatorExtent,
						Math.max(0, this.height() - 2 * margin)
					);

					position += CToolBar.SeparatorExtent + spacing;
				} else {
					widget.setGeometry(
						margin,
						position,
						Math.max(0, this.width() - 2 * margin),
						CToolBar.SeparatorExtent
					);

					position += CToolBar.SeparatorExtent + spacing;
				}

				continue;
			}

			const hint = widget.sizeHint();

			if (this.#m_orientation === COrientation.Horizontal) {
				const height = Math.max(0, this.height() - 2 * margin);
				widget.setGeometry(position, margin, hint.width(), height);

				position += hint.width() + spacing;
			} else {
				const width = Math.max(
					0,
					this.width() - 2 * margin
				);

				widget.setGeometry(margin, position, width, hint.height());
				position += hint.height() + spacing;
			}
		}
	}
}