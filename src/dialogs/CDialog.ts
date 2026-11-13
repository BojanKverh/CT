import { CSize } from "../geometry/CSize.js";
import type { CLayout } from "../layouts/CLayout.js";
import { CSizeGrip } from "../widgets/CSizeGrip.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CPushButton } from "../widgets/CPushButton.js";
import { CSignal } from "../core/CSignal.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CPaletteColorRole } from "../gui/CPalette.js";
import type { CPainter } from "../painting/CPainter.js";
import { CApplication } from "../core/CApplication.js";
import { CWidget } from "../widgets/CWidget.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CRect } from "../geometry/CRect.js";
import { CPoint } from "../geometry/CPoint.js";

/**
 * Represents the result of a dialog.
 */
export enum CDialogResult {
/**
 * The dialog was rejected or closed without acceptance.
 */
	Rejected = 0,
/**
 * The dialog was accepted.
 */
	Accepted = 1
}

/**
 * Base class for top-level dialog windows.
 *
 * Provides modal and non-modal display, a title bar, acceptance/rejection semantics, and basic window dragging.
 */
export class CDialog extends CWidget
{
	#m_windowTitle = "";
	#m_open = false;
	#m_modal = false;
	#m_result = CDialogResult.Rejected;
	#m_centerOnOpen = true;
    static readonly TitleBarHeight = 20;
    #m_dragging = false;
    #m_dragOffsetX = 0;
    #m_dragOffsetY = 0;
    #m_closeButtonHovered = false;
    #m_sizeGripMode: boolean | null = null;
    #m_sizeGrip: CSizeGrip | null = null;
    #m_sizeGripReservation = 0;
    #m_disposed = false;
    static readonly #SizeGripExtent = 16;

/**
 * Emitted when the dialog is accepted.
 */
	readonly accepted = new CSignal<[]>();
/**
 * Emitted when the dialog is rejected.
 */
	readonly rejected = new CSignal<[]>();

    static readonly CloseButtonWidth = 24;

/**
 * Creates a dialog.
 *
 * @param parent Optional owner widget.
 */
	constructor(parent: CWidget | null = null)
	{
		super(parent);

		this.hide();

		// A parentless dialog is visually managed by the window/overlay stack,
		// not by the ordinary top-level-widget stack.
		if (parent === null)
			CApplication.instance().unregisterTopLevelWidget(this);
	}

/**
 * Returns the full dialog rectangle, including the title bar.
 *
 * @returns The dialog rectangle.
 */
	override rect(): CRect {
		return new CRect(
			0,
			0,
			this.width(),
			this.height() + CDialog.TitleBarHeight
		);
	}

/**
 * Returns the rectangle available to dialog contents.
 *
 * @returns The content rectangle.
 */
	override contentsRect(): CRect {
		return new CRect(0, 0, this.width(), Math.max(0, this.height()
            - (this.isSizeGripEnabled() ? CDialog.#SizeGripExtent : 0)));
	}

    override sizeHint(): CSize {
        const hint = super.sizeHint();
        return this.layout() !== null && this.isSizeGripEnabled()
            ? new CSize(hint.width(), hint.height() + CDialog.#SizeGripExtent) : hint;
    }

    override heightForWidth(width: number): number {
        const height = super.heightForWidth(width);
        return height < 0 ? height : height + (this.isSizeGripEnabled() ? CDialog.#SizeGripExtent : 0);
    }

    override setVisible(visible: boolean): void {
        if (!visible) this.#m_sizeGrip?.hide();
        super.setVisible(visible);
        if (visible) this.#syncSizeGrip();
    }

    /** Effective setting: automatic with a layout, unless explicitly overridden.
     * A dialog fixed on both axes never exposes a resize grip. */
    isSizeGripEnabled(): boolean {
        return !this.#m_disposed && (this.#m_sizeGripMode ?? this.layout() !== null)
            && (this.minimumWidth() < this.maximumWidth() || this.minimumHeight() < this.maximumHeight());
    }

    /** Overrides automatic behavior. The grip occupies its own bottom strip. */
    setSizeGripEnabled(enabled: boolean): void {
        if (this.#m_disposed) return;
        this.#m_sizeGripMode = enabled;
        this.#syncSizeGrip();
    }

    /** Restores automatic enabling whenever this dialog has a layout. */
    resetSizeGripEnabled(): void {
        if (this.#m_disposed) return;
        this.#m_sizeGripMode = null;
        this.#syncSizeGrip();
    }

    override setLayout(layout: CLayout): void {
        super.setLayout(layout);
        this.#syncSizeGrip();
    }

    override setGeometry(x: number, y: number, width: number, height: number): void {
        super.setGeometry(x, y, width, height);
        this.#syncSizeGrip();
    }

    override setMinimumSize(width: number, height: number): void {
        super.setMinimumSize(width, height);
        this.#syncSizeGrip();
    }

    override setMaximumSize(width: number, height: number): void {
        super.setMaximumSize(width, height);
        this.#syncSizeGrip();
    }

    #syncSizeGrip(): void {
        if (this.#m_disposed) return;
        const enabled = this.isSizeGripEnabled();
        const reservation = enabled ? CDialog.#SizeGripExtent : 0;
        const changed = reservation !== this.#m_sizeGripReservation;
        this.#m_sizeGripReservation = reservation;
        if (enabled && this.#m_sizeGrip === null) {
            this.#m_sizeGrip = new CSizeGrip(this);
            this.#m_sizeGrip.setFocusPolicy(CFocusPolicy.NoFocus);
        }
        const grip = this.#m_sizeGrip;
        if (grip !== null) {
            grip.move(Math.max(0, this.width() - grip.width()), Math.max(0, this.height() - grip.height()));
            grip.setVisible(enabled && this.width() >= grip.width() && this.height() >= grip.height());
        }
        if (changed) this.layout()?.update();
        this.update();
    }

    override destroy(): void {
        if (this.#m_disposed) return;
        this.#m_disposed = true;
        this.close();
        super.destroy();
        this.#m_sizeGrip = null;
    }

/**
 * Returns the offset applied to child widgets below the title bar.
 *
 * @returns The child content offset.
 */
	protected override childOffset(): CPoint {
		return new CPoint(0, CDialog.TitleBarHeight);
	}

/**
 * Returns the dialog window title.
 *
 * @returns The current window title.
 */
	windowTitle(): string
	{
		return this.#m_windowTitle;
	}

/**
 * Sets the dialog window title.
 *
 * @param title New window title.
 */
	setWindowTitle(title: string): void
	{
		if (this.#m_windowTitle === title)
			return;

		this.#m_windowTitle = title;
		this.update();
	}

/**
 * Returns whether the dialog is currently open.
 *
 * @returns `true` if the dialog is open.
 */
	isOpen(): boolean
	{
		return this.#m_open;
	}

/**
 * Returns whether the dialog is modal.
 *
 * @returns `true` if the dialog is modal.
 */
	isModal(): boolean
	{
		return this.#m_modal;
	}

/**
 * Sets whether the dialog is modal.
 *
 * @param modal `true` to make the dialog modal.
 */
	setModal(modal: boolean): void
	{
		if (this.#m_modal === modal)
			return;

		this.#m_modal = modal;
	}

/**
 * Returns the current dialog result.
 *
 * @returns The current acceptance result.
 */
	result(): CDialogResult
	{
		return this.#m_result;
	}

    /** Returns the explicitly configured default button, including if disabled. */
    defaultButton(): CPushButton | null {
        return this.#pushButtons().find(button => button.isDefault()) ?? null;
    }

    /** Sets the default button; null clears it. Buttons from other dialogs are ignored. */
    setDefaultButton(button: CPushButton | null): void {
        const buttons = this.#pushButtons();
        if (button !== null && !buttons.includes(button)) return;
        for (const candidate of buttons) candidate.setDefault(candidate === button);
    }

    #pushButtons(): CPushButton[] {
        const buttons: CPushButton[] = [];
        const visit = (widget: CWidget): void => {
            for (const child of widget.children()) {
                // Each nested dialog owns an independent default button.
                if (!(child instanceof CWidget) || child instanceof CDialog) continue;
                if (child instanceof CPushButton) buttons.push(child);
                visit(child);
            }
        };
        visit(this);
        return buttons;
    }

    #activateDefaultButton(event: CKeyEvent): boolean {
        if (!this.#m_open || !this.isVisible() || !this.isEnabled()) return false;
        const app = CApplication.instance();
        if (app.popupWidgets().length > 0) return false;
        const modal = app.topModalWidget();
        if (modal !== null) {
            let owner: CWidget | null = this;
            while (owner !== null && owner !== modal) owner = owner.parent();
            if (owner === null) return false;
        }
        const button = this.defaultButton();
        if (button === null) return false;
        for (let owner: CWidget | null = button; owner !== null; owner = owner.parent()) {
            if (!owner.isVisible() || !owner.isEnabled()) return false;
            if (owner === this) break;
        }
        // Use the button's existing Enter handling; focus stays in the field.
        return button.event(event);
    }

/**
 * Opens the dialog.
 */
	open(): void
	{
		if (this.#m_open)
			return;

		if (this.#m_centerOnOpen)
			this.centerOnCanvas();
		
		this.#m_open = true;
		this.#m_result = CDialogResult.Rejected;

        const app = CApplication.instance();
        if (!this.#m_modal) app.rememberNonModalFocus(this);
        app.registerWindowWidget(this);

        if (this.#m_modal) app.registerModalWidget(this);

		this.show();
		this.setFocus();
	}

/**
 * Opens the dialog modally.
 */
	exec(): void
	{
		this.setModal(true);
		this.open();
	}

/**
 * Closes the dialog without changing its current result.
 */
	close(): void
	{
		if (!this.#m_open)
			return;

        const app = CApplication.instance();
        let focused = app.focusWidget();
        while (focused !== null && focused !== this) focused = focused.parent();
        app.unregisterWindowWidget(this);
        this.#m_open = false;
        this.hide();
        app.unregisterModalWidget(this);
        app.restoreNonModalFocus(this, focused === this);
	}

/**
 * Accepts and closes the dialog, then emits `accepted`.
 */
	accept(): void
	{
		if (!this.#m_open)
			return;

		this.#m_result = CDialogResult.Accepted;

		this.close();
		this.accepted.emit();
	}

/**
 * Rejects and closes the dialog, then emits `rejected`.
 */
	reject(): void
	{
		if (!this.#m_open)
			return;

		this.#m_result = CDialogResult.Rejected;

		this.close();
		this.rejected.emit();
	}

/**
 * Handles keyboard input for the dialog.
 *
 * Pressing Escape rejects the dialog.
 *
 * @param event Key event to handle.
 */
	protected override keyPressEvent(event: CKeyEvent): void
	{
        if ((event.key() === "Enter" || event.key() === "Return")
            && !event.ctrl() && !event.shift() && !event.alt() && !event.meta() && !event.altGraph()
            && this.#activateDefaultButton(event)) return;

		if (event.key() === "Escape") {
			this.reject();
			event.accept();
			return;
		}

		event.ignore();
	}

/**
 * Paints the dialog frame and title bar.
 *
 * @param painter Painter used to render the dialog.
 */
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

/**
 * Handles mouse presses on the title bar and close button.
 *
 * @param event Mouse event to handle.
 */
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

/**
 * Handles dialog dragging and close-button hover state.
 *
 * @param event Mouse event to handle.
 */
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

/**
 * Finishes a title-bar drag or activates the close button.
 *
 * @param event Mouse event to handle.
 */
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

/**
 * Clears title-bar hover state when the pointer leaves the dialog.
 *
 * @param event Mouse event to handle.
 */
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

    /** Whether opening the dialog centers it on the logical canvas. Defaults to true. */
    isCenterOnOpen(): boolean {
        return this.#m_centerOnOpen;
    }

    /** Disable before open()/exec() to preserve an explicitly configured position. */
    setCenterOnOpen(enabled: boolean): void {
        this.#m_centerOnOpen = enabled;
    }

    /** Centers the complete window, including its title bar, on the logical canvas.
     * Owner offsets are removed because dialog geometry uses parent coordinates.
     */
    centerOnCanvas(): void {
        const device = CApplication.instance().paintDevice();
        const origin = this.mapToCanvas(0, 0);
        const parentX = origin.x() - this.x();
        const parentY = origin.y() - this.y();
        this.move(
            Math.max(0, Math.floor((device.width() - this.width()) / 2)) - parentX,
            Math.max(0, Math.floor((device.height() - this.rect().height()) / 2)) - parentY
        );
    }
}
