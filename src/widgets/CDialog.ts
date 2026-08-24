import { CSignal } from "../core/CSignal.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import { CApplication } from "../core/CApplication.js";
import { CWidget } from "./CWidget.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";

export enum CDialogResult {
	Rejected = 0,
	Accepted = 1
}

export class CDialog extends CWidget
{
	#m_windowTitle = "";
	#m_open = false;
	#m_modal = false;
	#m_result = CDialogResult.Rejected;
    static readonly TitleBarHeight = 20;
    #m_dragging = false;
    #m_dragOffsetX = 0;
    #m_dragOffsetY = 0;

	readonly accepted = new CSignal<[]>();
	readonly rejected = new CSignal<[]>();

	constructor(parent: CWidget | null = null)
	{
		super(parent);

		this.hide();
	}

	windowTitle(): string
	{
		return this.#m_windowTitle;
	}

	setWindowTitle(title: string): void
	{
		if (this.#m_windowTitle === title)
			return;

		this.#m_windowTitle = title;
		this.update();
	}

	isOpen(): boolean
	{
		return this.#m_open;
	}

	isModal(): boolean
	{
		return this.#m_modal;
	}

	setModal(modal: boolean): void
	{
		if (this.#m_modal === modal)
			return;

		this.#m_modal = modal;
	}

	result(): CDialogResult
	{
		return this.#m_result;
	}

	open(): void
	{
		if (this.#m_open)
			return;

		this.#m_open = true;
		this.#m_result = CDialogResult.Rejected;

		if (this.#m_modal)
			CApplication.instance().registerModalWidget(this);

		this.show();
		this.setFocus();
	}

	exec(): void
	{
		this.setModal(true);
		this.open();
	}

	close(): void
	{
		if (!this.#m_open)
			return;

		if (this.#m_modal)
			CApplication.instance().unregisterModalWidget(this);

		this.#m_open = false;

		this.hide();
	}

	accept(): void
	{
		if (!this.#m_open)
			return;

		this.#m_result = CDialogResult.Accepted;

		this.close();
		this.accepted.emit();
	}

	reject(): void
	{
		if (!this.#m_open)
			return;

		this.#m_result = CDialogResult.Rejected;

		this.close();
		this.rejected.emit();
	}

	protected override keyPressEvent(event: CKeyEvent): void
	{
		if (event.key() === "Escape") {
			this.reject();
			event.accept();
			return;
		}

		event.ignore();
	}

	protected override paintEvent(painter: CPainter): void
    {
	    const base = this.palette().color(CPaletteColorRole.Base).toCss();
	    const text = this.palette().color(CPaletteColorRole.Text).toCss();
	    const highlight = this.palette().color(CPaletteColorRole.Highlight).toCss();
	    const highlightedText = this.palette().color(CPaletteColorRole.HighlightedText).toCss();

	    painter.setBrush(base);
	    painter.setPen(text);
	    painter.drawRect(0, 0, this.width(), this.height());
	    painter.setBrush(highlight);
	    painter.setPen(highlight);
	    painter.drawRect(0, 0, this.width(), CDialog.TitleBarHeight);

	    painter.setPen(highlightedText);
	    painter.setFont(this.font());

	    painter.drawText(this.#m_windowTitle, 10, 3 * CDialog.TitleBarHeight / 4);
    }

    protected override mousePressEvent(event: CMouseEvent): void
    {
	    if (event.button() !== CMouseButton.LeftButton) {
		    event.ignore();
		    return;
	    }

	    if (event.y() >= CDialog.TitleBarHeight) {
		    event.ignore();
		    return;
	    }

	    this.#m_dragging = true;
	    this.#m_dragOffsetX = event.x();
	    this.#m_dragOffsetY = event.y();
	    event.accept();
    }

    protected override mouseMoveEvent(event: CMouseEvent): void
    {
	    if (!this.#m_dragging) {
		    event.ignore();
		    return;
	    }

	    this.move(
		    this.x() + event.x() - this.#m_dragOffsetX,
		    this.y() + event.y() - this.#m_dragOffsetY
	    );

	    event.accept();
    }

    protected override mouseReleaseEvent(event: CMouseEvent): void
    {
	    if (!this.#m_dragging) {
		    event.ignore();
		    return;
	    }

	    this.#m_dragging = false;
	    event.accept();
    }
}