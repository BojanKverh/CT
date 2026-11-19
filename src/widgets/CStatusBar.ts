/** @module Widgets/CStatusBar */
import { CSize } from "../geometry/CSize.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import { CWidget } from "./CWidget.js";
import { CTimer } from "../core/CTimer.js";

/** Bottom status area supporting temporary messages, normal widgets and permanent widgets. */
export class CStatusBar extends CWidget {
    /** Default preferred logical height. */
    static readonly DefaultHeight = 24;
    /** Default logical inset around contents. */
    static readonly Margin = 3;
    /** Default logical gap between adjacent items. */
    static readonly Spacing = 6;

	#m_widgets: CWidget[] = [];
	#m_permanentWidgets: CWidget[] = [];

	#m_currentMessage = "";
	#m_messageTimer = new CTimer(this);

	#m_savedVisibility = new Map<CWidget, boolean>();

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
		super(parent);

		this.#m_messageTimer.setSingleShot(true);

		this.#m_messageTimer.timeout.connect(() => {
			this.clearMessage();
		});
	}

	override sizeHint(): CSize {
		return new CSize(0, CStatusBar.DefaultHeight);
	}

    /**
    * Adds a normal status widget. Temporary messages hide normal widgets.
    */
    addWidget(widget: CWidget): CWidget {
		widget.setParent(this);

		this.#m_widgets.push(widget);
		this.#updateItemGeometry();

		return widget;
	}

    /**
    * Adds a widget that remains available beside temporary status messages.
    */
    addPermanentWidget(widget: CWidget): CWidget {
		widget.setParent(this);

		this.#m_permanentWidgets.push(widget);
		this.#updateItemGeometry();

		return widget;
	}

    /**
    * Removes a registered normal or permanent widget and reparents it away from the status bar.
    */
    removeWidget(widget: CWidget): void {
		let index = this.#m_widgets.indexOf(widget);

		if (index !== -1) {
			this.#m_widgets.splice(index, 1);
			widget.setParent(null);

			this.#updateItemGeometry();
			this.update();

			return;
		}

		index = this.#m_permanentWidgets.indexOf(widget);

		if (index === -1)
			return;

		this.#m_permanentWidgets.splice(index, 1);
		widget.setParent(null);

		this.#updateItemGeometry();
		this.update();
	}

    /**
    * Returns the temporary message text, or an empty string when none is active.
    */
    currentMessage(): string {
		return this.#m_currentMessage;
	}

    /**
    * Displays a message and hides normal status widgets. A positive timeout clears it after that many milliseconds; zero keeps it until cleared.
    */
    showMessage(message: string, timeout = 0): void {
		this.#stopMessageTimer();

		if (this.#m_currentMessage === "")
			this.#hideNormalWidgets();

		this.#m_currentMessage = message;

		if (message === "") {
			this.clearMessage();
			return;
		}

		if (timeout > 0) {
			this.#m_messageTimer.start(timeout);
		}

		this.update();
	}

    /**
    * Stops the message timer, removes the message and restores normal widget visibility.
    */
    clearMessage(): void {
		this.#stopMessageTimer();

		if (this.#m_currentMessage === "")
			return;

		this.#m_currentMessage = "";

		this.#restoreNormalWidgets();
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

		for (const widget of this.#m_widgets) {
			this.#m_savedVisibility.set(
				widget,
				widget.isVisible()
			);

			widget.hide();
		}
	}

	#restoreNormalWidgets(): void {
		for (const widget of this.#m_widgets) {
			if (this.#m_savedVisibility.get(widget))
				widget.show();
		}

		this.#m_savedVisibility.clear();
	}

	#stopMessageTimer(): void {
		if (this.#m_messageTimer === null)
			return;

		this.#m_messageTimer.stop();
	}

	#messageWidth(): number {
		let right = this.width() - CStatusBar.Margin;

		if (this.#m_permanentWidgets.length > 0) {
			const first =
				this.#m_permanentWidgets[0];

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

		for (
			let i = this.#m_permanentWidgets.length - 1;
			i >= 0;
			--i
		) {
			const widget =
				this.#m_permanentWidgets[i];
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