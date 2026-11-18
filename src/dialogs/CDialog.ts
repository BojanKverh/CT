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
	 * Computes the complete frame bounds, including the title bar.
	 * @returns A new rectangle in dialog-local coordinates with the title bar included in its height.
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
	 * Computes the area used to lay out child widgets, reserving a bottom strip when the size grip is enabled.
	 * @returns Body rectangle in the child coordinate system, with height clamped to zero or greater.
	 */
	override contentsRect(): CRect {
		return new CRect(0, 0, this.width(), Math.max(0, this.height()
            - (this.isSizeGripEnabled() ? CDialog.#SizeGripExtent : 0)));
	}

    /**
     * Gets the layout's preferred body size and adds the size-grip strip when applicable.
     * @returns Preferred body size in logical pixels, excluding the title bar.
     */
    override sizeHint(): CSize {
        const hint = super.sizeHint();
        return this.layout() !== null && this.isSizeGripEnabled()
            ? new CSize(hint.width(), hint.height() + CDialog.#SizeGripExtent) : hint;
    }

    /**
     * Gets the layout's preferred height for a width and adds the size-grip allowance when applicable.
     * @param width Available width in logical pixels.
     * @returns Preferred body height, or `-1` if the layout supplies no width-dependent height.
     */
    override heightForWidth(width: number): number {
        const height = super.heightForWidth(width);
        return height < 0 ? height : height + (this.isSizeGripEnabled() ? CDialog.#SizeGripExtent : 0);
    }

    /**
     * Changes visibility and hides or refreshes the resize grip. Use `open()` or `close()` to change window registration.
     * @param visible Whether to show the dialog.
     */
    override setVisible(visible: boolean): void {
        if (!visible) this.#m_sizeGrip?.hide();
        super.setVisible(visible);
        if (visible) this.#syncSizeGrip();
    }

    /**
     * Checks the explicit setting or the layout-based default and whether at least one axis can resize.
     * @returns `true` if the dialog is alive and its resize grip is enabled.
     */
    isSizeGripEnabled(): boolean {
        return !this.#m_disposed && (this.#m_sizeGripMode ?? this.layout() !== null)
            && (this.minimumWidth() < this.maximumWidth() || this.minimumHeight() < this.maximumHeight());
    }

    /**
     * Overrides automatic grip selection and refreshes the reserved layout strip if needed.
     * @param enabled `true` to enable the grip on a resizable dialog, or `false` to hide it.
     */
    setSizeGripEnabled(enabled: boolean): void {
        if (this.#m_disposed) return;
        this.#m_sizeGripMode = enabled;
        this.#syncSizeGrip();
    }

    /** Clears the explicit override and updates the grip based on layout presence and size constraints. */
    resetSizeGripEnabled(): void {
        if (this.#m_disposed) return;
        this.#m_sizeGripMode = null;
        this.#syncSizeGrip();
    }

    /**
     * Installs and updates a layout and recalculates the resize-grip reservation.
     * @param layout Layout to attach to the dialog body.
     */
    override setLayout(layout: CLayout): void {
        super.setLayout(layout);
        this.#syncSizeGrip();
    }

    /**
     * Changes the window position and body size and repositions the resize grip.
     * @param x Horizontal position in parent coordinates, or canvas coordinates for a top-level window.
     * @param y Vertical position in parent coordinates, or canvas coordinates for a top-level window.
     * @param width Dialog width in logical pixels.
     * @param height Body height in logical pixels, excluding the title bar.
     */
    override setGeometry(x: number, y: number, width: number, height: number): void {
        super.setGeometry(x, y, width, height);
        this.#syncSizeGrip();
    }

    /**
     * Updates the minimum body size and refreshes resize-grip availability.
     * @param width Minimum width in logical pixels.
     * @param height Minimum body height in logical pixels.
     */
    override setMinimumSize(width: number, height: number): void {
        super.setMinimumSize(width, height);
        this.#syncSizeGrip();
    }

    /**
     * Updates the maximum body size and refreshes resize-grip availability.
     * @param width Maximum width in logical pixels.
     * @param height Maximum body height in logical pixels.
     */
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

    /** Closes the window, marks it disposed and destroys owned widgets. */
    override destroy(): void {
        if (this.#m_disposed) return;
        this.#m_disposed = true;
        this.close();
        super.destroy();
        this.#m_sizeGrip = null;
    }

/**
	 * Positions child widgets below the title bar.
	 * @returns A new point offset vertically by the title-bar height.
	 */
	protected override childOffset(): CPoint {
		return new CPoint(0, CDialog.TitleBarHeight);
	}

/**
	 * Reads the text drawn in the title bar.
	 * @returns Current window title.
	 */
	windowTitle(): string
	{
		return this.#m_windowTitle;
	}

/**
	 * Updates the title bar and requests repainting when its text changes.
	 * @param title New title text.
	 */
	setWindowTitle(title: string): void
	{
		if (this.#m_windowTitle === title)
			return;

		this.#m_windowTitle = title;
		this.update();
	}

/**
	 * Checks whether the dialog was opened and has not been closed.
	 * @returns `true` if the dialog is open.
	 */
	isOpen(): boolean
	{
		return this.#m_open;
	}

/**
	 * Reads the configured modality.
	 * @returns `true` if the dialog is configured as modal.
	 */
	isModal(): boolean
	{
		return this.#m_modal;
	}

/**
	 * Changes the modality flag used when the dialog opens. Changing it on an open dialog does not update its current registration.
	 * @param modal Whether to register as a modal dialog on opening.
	 */
	setModal(modal: boolean): void
	{
		if (this.#m_modal === modal)
			return;

		this.#m_modal = modal;
	}

/**
	 * Reads the result of the current or most recent run.
	 * @returns `Accepted` after acceptance, or `Rejected` after rejection or at the start of a run.
	 */
	result(): CDialogResult
	{
		return this.#m_result;
	}

    /**
     * Finds the explicitly designated default button among this dialog's descendants, excluding nested dialogs.
     * @returns The designated button even when disabled, or `null` if none is designated.
     */
    defaultButton(): CPushButton | null {
        return this.#pushButtons().find(button => button.isDefault()) ?? null;
    }

    /**
     * Marks one descendant as the default and clears that flag on the other buttons. Buttons outside this dialog are ignored.
     * @param button Button in this dialog to designate, or `null` to clear the default.
     */
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

/** Opens and focuses the dialog, resets its result to `Rejected` and registers its window and modality. An already open dialog is left as-is. */
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

/** Sets modal mode and opens the dialog without blocking. Observe `accepted` or `rejected` to handle its result. */
	exec(): void
	{
		this.setModal(true);
		this.open();
	}

/** Hides and unregisters the dialog and restores prior nonmodal focus when applicable. It preserves the result and emits neither result signal. */
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

/** Records acceptance, closes the dialog and emits `accepted`. A closed dialog ignores the request. */
	accept(): void
	{
		if (!this.#m_open)
			return;

		this.#m_result = CDialogResult.Accepted;

		this.close();
		this.accepted.emit();
	}

/** Records rejection, closes the dialog and emits `rejected`. A closed dialog ignores the request. */
	reject(): void
	{
		if (!this.#m_open)
			return;

		this.#m_result = CDialogResult.Rejected;

		this.close();
		this.rejected.emit();
	}

/**
	 * Routes unmodified Enter or Return to an eligible default button and rejects on Escape. Other keys are ignored.
	 * @param event Keyboard event containing the key and modifier states.
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
	 * Draws the frame, highlighted title bar, title text and close button using the dialog palette.
	 * @param painter Painter clipped and translated to the dialog's local bounds.
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
     * Accepts a left press on the close button or starts dragging from the title bar. Other presses are ignored.
     * @param event Mouse event with button and local pointer coordinates.
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
     * Refreshes the close-button hover state and moves the window when a title-bar drag is active.
     * @param event Mouse event with local pointer coordinates.
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
     * Rejects on a left release over the close button or ends an active title-bar drag.
     * @param event Mouse event with button and local pointer coordinates.
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
     * Clears close-button hover highlighting, requests repainting and accepts the event.
     * @param event Mouse leave event delivered to the dialog.
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

    /**
     * Checks whether the next open operation will center the window.
     * @returns `true` if automatic centering is enabled.
     */
    isCenterOnOpen(): boolean {
        return this.#m_centerOnOpen;
    }

    /**
     * Controls whether `open()` moves the window to the center of the canvas.
     * @param enabled `true` to center when opening, or `false` to keep the configured position.
     */
    setCenterOnOpen(enabled: boolean): void {
        this.#m_centerOnOpen = enabled;
    }

    /** Centers the complete window in the logical canvas, including the title bar. Converts the resulting coordinates to the parent's coordinate system. */
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
