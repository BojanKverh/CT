import { CSignal } from "../core/CSignal.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import { CApplication } from "../core/CApplication.js";
import { CWidget } from "../widgets/CWidget.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CRect } from "../geometry/CRect.js";
import { CPoint } from "../geometry/CPoint.js";

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
	#m_owner: CWidget | null = null;
    static readonly TitleBarHeight = 20;
    #m_dragging = false;
    #m_dragOffsetX = 0;
    #m_dragOffsetY = 0;
    #m_closeButtonHovered = false;

	readonly accepted = new CSignal<[]>();
	readonly rejected = new CSignal<[]>();

    static readonly CloseButtonWidth = 24;

	constructor(parent: CWidget | null = null)
	{
		super(null);

		this.#m_owner = parent;
		this.hide();

		// CWidget without a parent registers itself as a normal top-level widget.
		// A dialog belongs to the application's window/overlay stack instead.
		CApplication.instance().unregisterTopLevelWidget(this);
	}

	override rect(): CRect {
		return new CRect(
			0,
			0,
			this.width(),
			this.height() + CDialog.TitleBarHeight
		);
	}

	override contentsRect(): CRect {
		return new CRect(0, 0, this.width(), this.height());
	}

	protected override childOffset(): CPoint {
		return new CPoint(0, CDialog.TitleBarHeight);
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

		if (this.x() === 0 && this.y() === 0)
			this.#center();
		
		this.#m_open = true;
		this.#m_result = CDialogResult.Rejected;

		CApplication.instance().registerWindowWidget(this);

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

		CApplication.instance().unregisterWindowWidget(this);
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
	    painter.drawRect(0, 0, this.width(), this.rect().height());
	    painter.setBrush(highlight);
	    painter.setPen(highlight);
	    painter.drawRect(0, 0, this.width(), CDialog.TitleBarHeight);

	    painter.setPen(highlightedText);
	    painter.setFont(this.font());

	    painter.drawText(this.#m_windowTitle, 10, 3 * CDialog.TitleBarHeight / 4);
        painter.setPen(highlightedText);
        
        if (this.#m_closeButtonHovered) {
        	painter.setBrush(this.palette().color(CPaletteColorRole.HighlightedText).toCss());
            painter.setPen(this.palette().color(CPaletteColorRole.Highlight).toCss());
        }

	    painter.fillRect(new CRect(this.width() - CDialog.CloseButtonWidth, 0, CDialog.CloseButtonWidth, CDialog.TitleBarHeight));
        painter.setFont(this.font());
        painter.setTextAlign("center");
        painter.setTextBaseline("middle");

        painter.drawText("×", this.width() - CDialog.CloseButtonWidth / 2, CDialog.TitleBarHeight / 2);
    }

    protected override mousePressEvent(event: CMouseEvent): void
    {
	    if (event.button() !== CMouseButton.LeftButton) {
		    event.ignore();
		    return;
	    }

	    if (this.#isCloseButtonAt(event.x(), event.y())) {
		    event.accept();
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
	    const closeButtonHovered = this.#isCloseButtonAt(event.x(), event.y());
	    if (closeButtonHovered !== this.#m_closeButtonHovered) { 
            this.#m_closeButtonHovered = closeButtonHovered;
		    this.update();
	    }

	    if (!this.#m_dragging) {
		    event.ignore();
		    return;
	    }

	    this.move(this.x() + event.x() - this.#m_dragOffsetX, this.y() + event.y() - this.#m_dragOffsetY);
	    event.accept();
    }

    protected override mouseReleaseEvent(event: CMouseEvent): void
    {
	    if (event.button() !== CMouseButton.LeftButton) {
		    event.ignore();
		    return;
	    }

	    if (this.#isCloseButtonAt(event.x(), event.y())) {
		    this.#m_dragging = false;
		    this.reject();
		    event.accept();
		    return;
	    }

	    if (!this.#m_dragging) {
		    event.ignore();
		    return;
	    }

	    this.#m_dragging = false;
	    event.accept();
    }

    protected override mouseLeaveEvent(event: CMouseEvent): void {
        this.#m_closeButtonHovered = false;
        this.update();
        event.accept();
    }

    #isCloseButtonAt(x: number, y: number): boolean
    {
	    return x >= this.width() - CDialog.CloseButtonWidth && x < this.width() && y >= 0 &&
		    y < CDialog.TitleBarHeight;
    }

	#center(): void
	{
		if (this.#m_owner !== null) {
			const ownerOrigin = this.#m_owner.mapToCanvas(0, 0);
			this.move(
				ownerOrigin.x() + Math.floor((this.#m_owner.width() - this.width()) / 2),
				ownerOrigin.y() + Math.floor((this.#m_owner.height() - this.rect().height()) / 2)
			);
			return;
		}

		const canvas = CApplication.instance().canvas();
		this.move(
			Math.floor((canvas.width - this.width()) / 2),
			Math.floor((canvas.height - this.rect().height()) / 2)
		);
	}
}