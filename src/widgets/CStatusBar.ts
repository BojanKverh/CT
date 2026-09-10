import { CSize } from "../geometry/CSize.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";
import { CTimer } from "../core/CTimer.js";

/** Implements the status bar widget. */
export class CStatusBar extends CWidget {
	static readonly DefaultHeight = 24;
	static readonly Margin = 3;
	static readonly Spacing = 6;

	#m_widgets: CWidget[] = [];
	#m_permanentWidgets: CWidget[] = [];

	#m_currentMessage = "";
	#m_messageTimer = new CTimer(this);

	#m_savedVisibility = new Map<CWidget, boolean>();

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.#m_messageTimer.setSingleShot(true);

		this.#m_messageTimer.timeout.connect(() => {
			this.clearMessage();
		});
	}

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize {
		return new CSize(0, CStatusBar.DefaultHeight);
	}

	/** Adds widget. */
	addWidget(widget: CWidget): CWidget {
		widget.setParent(this);

		this.#m_widgets.push(widget);
		this.#updateItemGeometry();

		return widget;
	}

	/** Adds permanent widget. */
	addPermanentWidget(widget: CWidget): CWidget {
		widget.setParent(this);

		this.#m_permanentWidgets.push(widget);
		this.#updateItemGeometry();

		return widget;
	}

	/** Removes widget. */
	removeWidget(widget: CWidget): void {
		let index = this.#m_widgets.indexOf(widget);

		/** Provides if behavior. */
		if (index !== -1) {
			this.#m_widgets.splice(index, 1);
			widget.setParent(null);

			this.#updateItemGeometry();
			this.update();

			return;
		}

		index = this.#m_permanentWidgets.indexOf(widget);

		/** Provides if behavior. */
		if (index === -1)
			return;

		this.#m_permanentWidgets.splice(index, 1);
		widget.setParent(null);

		this.#updateItemGeometry();
		this.update();
	}

	/** Returns the current message. */
	currentMessage(): string {
		return this.#m_currentMessage;
	}

	/** Shows message. */
	showMessage(message: string, timeout = 0): void {
		this.#stopMessageTimer();

		/** Provides if behavior. */
		if (this.#m_currentMessage === "")
			this.#hideNormalWidgets();

		this.#m_currentMessage = message;

		/** Provides if behavior. */
		if (message === "") {
			this.clearMessage();
			return;
		}

		/** Provides if behavior. */
		if (timeout > 0) {
			this.#m_messageTimer.start(timeout);
		}

		this.update();
	}

	/** Clears message. */
	clearMessage(): void {
		this.#stopMessageTimer();

		/** Provides if behavior. */
		if (this.#m_currentMessage === "")
			return;

		this.#m_currentMessage = "";

		this.#restoreNormalWidgets();
		this.update();
	}

	/** Sets the geometry. */
	override setGeometry(
		x: number,
		y: number,
		width: number,
		height: number
	): void {
		super.setGeometry(x, y, width, height);

		this.#updateItemGeometry();
	}

	/** Provides resize behavior. */
	override resize(width: number, height: number): void {
		super.resize(width, height);

		this.#updateItemGeometry();
	}

	/** Handles the paint event. */
	protected override paintEvent(painter: CPainter): void {
        const palette = this.palette();

		painter.setBrush(
			palette.color(
				CPaletteColorRole.Window
			).toCss()
		);

		painter.setPen(
			palette.color(
				CPaletteColorRole.Mid
			).toCss()
		);

		painter.drawRect(
			0, 0,
			this.width(), this.height()
		);

		/** Provides if behavior. */
		if (this.#m_currentMessage === "")
			return;

		painter.setPen(
			palette.color(
				CPaletteColorRole.WindowText
			).toCss()
		);

        painter.setTextAlign("left");
        painter.setTextBaseline("middle");
        painter.setFont(this.font());
        painter.drawText(this.#m_currentMessage, CStatusBar.Margin, this.height() / 2);
	}

	#hideNormalWidgets(): void {
		this.#m_savedVisibility.clear();

		/** Provides for behavior. */
		for (const widget of this.#m_widgets) {
			this.#m_savedVisibility.set(
				widget,
				widget.isVisible()
			);

			widget.hide();
		}
	}

	#restoreNormalWidgets(): void {
		/** Provides for behavior. */
		for (const widget of this.#m_widgets) {
			/** Provides if behavior. */
			if (this.#m_savedVisibility.get(widget))
				widget.show();
		}

		this.#m_savedVisibility.clear();
	}

	#stopMessageTimer(): void {
		/** Provides if behavior. */
		if (this.#m_messageTimer === null)
			return;

		this.#m_messageTimer.stop();
	}

	#messageWidth(): number {
		let right = this.width() - CStatusBar.Margin;

		/** Provides if behavior. */
		if (this.#m_permanentWidgets.length > 0) {
			const first =
				this.#m_permanentWidgets[0];
            
            /** Provides if behavior. */
            if (first !== undefined)
			    right = first.x() - CStatusBar.Spacing;
		}

		return Math.max(
			0,
			right - CStatusBar.Margin
		);
	}

	#updateItemGeometry(): void {
		const margin = CStatusBar.Margin;
		const spacing = CStatusBar.Spacing;

		const height = Math.max(
			0,
			this.height() - 2 * margin
		);

		let left = margin;

		/** Provides for behavior. */
		for (const widget of this.#m_widgets) {
			const hint = widget.sizeHint();

			widget.setGeometry(
				left,
				margin,
				hint.width(),
				height
			);

			left += hint.width() + spacing;
		}

		let right = this.width() - margin;

		/** Provides for behavior. */
		for (
			let i = this.#m_permanentWidgets.length - 1;
			i >= 0;
			--i
		) {
			const widget =
				this.#m_permanentWidgets[i];
            /** Provides if behavior. */
            if (widget === undefined)
                continue;

			const hint = widget.sizeHint();

			right -= hint.width();

			widget.setGeometry(
				right,
				margin,
				hint.width(),
				height
			);

			right -= spacing;
		}
	}
}