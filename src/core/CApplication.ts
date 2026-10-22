import { CObject } from "./CObject.js";
import { CShortcut } from "./CShortcut.js";
import { CWidget } from "../widgets/CWidget.js";
import type { CPaintDevice } from "../painting/CPaintDevice.js";
import { CCanvasPaintDevice } from "../painting/CCanvasPaintDevice.js";
import { CPainter } from "../painting/CPainter.js";
import { CPoint } from "../geometry/CPoint.js";
import { CRect } from "../geometry/CRect.js";
import { CEventType } from "../events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CFocusEvent } from "../events/CFocusEvent.js";
import { CWheelEvent } from "../events/CWheelEvent.js";
import { CPalette } from "../gui/CPalette.js";
import { CDefaultStyle } from "../gui/CDefaultStyle.js";
import type { CStyle } from "../gui/CStyle.js";
import type { CPopupWidget } from "../widgets/CPopupWidget.js";
import type { CToolTipWidget } from "../widgets/CToolTipWidget.js";
import { CCursorShape } from "../gui/CCursorShape.js";
import { CTimer } from "./CTimer.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CContextMenuEvent, CContextMenuReason } from "../events/CContextMenuEvent.js";
import { CDrag } from "./CDrag.js";
import { CDragEnterEvent } from "../events/CDragEnterEvent.js";
import { CDragMoveEvent } from "../events/CDragMoveEvent.js";
import { CDragLeaveEvent } from "../events/CDragLeaveEvent.js";
import { CDropEvent } from "../events/CDropEvent.js";
import { CDropAction } from "../events/CDropAction.js";
import { CClipboard } from "./CClipboard.js";
import { CFont } from "../gui/CFont.js";

/**
 * Central Canvas Toolkit application object that owns the canvas integration, event dispatch, focus, popups, drag-and-drop and repaint scheduling.
 * Only one CApplication instance may exist at a time.
 */
type CClipboardEditor = CWidget & {
    selectedText(): string;
    copy(): void;
    cut(): void;
    paste(): void;
    isReadOnly(): boolean;
};

export class CApplication extends CObject {
	static #m_instance: CApplication | null = null;

	#m_paintDevice: CCanvasPaintDevice;
	#m_topLevelWidgets = new Set<CWidget>();
	#m_mouseGrabber: CWidget | null = null;
	#m_hoverWidget: CWidget | null = null;
	#m_focusWidget: CWidget | null = null;
	#m_updatesEnabled = false;
	#m_frameRequest: number | null = null;
	#m_font = new CFont();
    #m_palette = new CPalette();
    #m_style: CStyle = new CDefaultStyle();
    #m_popupWidgets: CPopupWidget[] = [];
    #m_popupFocus = new Map<CPopupWidget, CWidget | null>();
	#m_windowWidgets: CWidget[] = [];
	#m_modalWidgets: CWidget[] = [];
	#m_toolTipWidget: CToolTipWidget | null = null;
	#m_toolTipTarget: CWidget | null = null;
	#m_toolTipTimer = new CTimer(this);
	#m_mouseX = 0;
	#m_mouseY = 0;
	#m_clickCount = 1;
	#m_lastClick: { widget: CWidget; button: number; x: number; y: number;
		time: number; count: number } | null = null;
	#m_activeDrag: CDrag | null = null;
	#m_dragTarget: CWidget | null = null;
	#m_clipboard = new CClipboard(this);

	static readonly #TOOL_TIP_DELAY = 700;
	static readonly #TOOL_TIP_OFFSET_X = 12;
	static readonly #TOOL_TIP_OFFSET_Y = 18;

	#onPointerDown = (event: PointerEvent): void => {
		this.#dispatchMouseEvent(CEventType.MousePress, event);
	};

	#onDoubleClick = (event: MouseEvent): void => {
		this.#dispatchDoubleClick(event);
	};
	
	#onPointerUp = (event: PointerEvent): void => {
		this.#dismissToolTip();

		if (this.#m_activeDrag !== null) {
			this.#dispatchDrop(event);
			this.#releasePointer(event);
			return;
		}

		this.#dispatchMouseEvent(CEventType.MouseRelease, event);
	};

	#onPointerMove = (event: PointerEvent): void => {
		const position = this.#canvasPosition(event);
		this.#m_mouseX = position.x();
		this.#m_mouseY = position.y();

		if (this.#m_activeDrag !== null) {
			this.#dispatchDragMove(event);
			return;
		}

		this.#updateHoverWidget(event);
		this.#updateToolTipTarget();
		this.#dispatchMouseEvent(CEventType.MouseMove, event);
	};

	#onWheel = (event: WheelEvent) : void => {
		this.#dispatchWheelEvent(CEventType.Wheel, event);
	}
    #onCopy = (event: ClipboardEvent): void => { this.#dispatchClipboardEvent("copy", event); };
    #onCut = (event: ClipboardEvent): void => { this.#dispatchClipboardEvent("cut", event); };
    #onPaste = (event: ClipboardEvent): void => { this.#dispatchClipboardEvent("paste", event); };
    #onKeyDown = (event: KeyboardEvent): void => {
		this.#dispatchKeyEvent(CEventType.KeyPress, event);
	};
	#onKeyUp = (event: KeyboardEvent): void => {
		this.#dispatchKeyEvent(CEventType.KeyRelease, event);
	};
	
	#onPointerCancel = (event: PointerEvent): void => {
		if (this.#m_activeDrag !== null)
			this.cancelDrag();

		this.#releasePointer(event);
	};

	#onContextMenu = (event: PointerEvent): void => {
		this.#dispatchContextMenuEvent(event);
	}

/**
 * Creates the application for an HTML canvas element.
 * @param canvas Canvas used for rendering and pointer input.
 * @throws Error if another CApplication instance already exists.
 */
	constructor(canvas: HTMLCanvasElement) {
		super();

		if (CApplication.#m_instance !== null)
			throw new Error("Only one CApplication instance can exist.");

		this.#m_paintDevice = new CCanvasPaintDevice(canvas);
		CApplication.#m_instance = this;
		this.#m_toolTipTimer.setSingleShot(true);
		this.#m_toolTipTimer.timeout.connect(() => {
			void this.#showToolTip();
		});

		canvas.addEventListener("pointerdown", this.#onPointerDown);
		canvas.addEventListener("dblclick", this.#onDoubleClick);
		canvas.addEventListener("pointerup", this.#onPointerUp);
		canvas.addEventListener("pointermove", this.#onPointerMove);
		canvas.addEventListener("wheel", this.#onWheel);
		canvas.addEventListener("pointercancel", this.#onPointerCancel);
		canvas.addEventListener("contextmenu", this.#onContextMenu);

        if (typeof window !== "undefined") {
	        window.addEventListener("keydown", this.#onKeyDown);
	        window.addEventListener("keyup", this.#onKeyUp);
            window.addEventListener("copy", this.#onCopy);
            window.addEventListener("cut", this.#onCut);
            window.addEventListener("paste", this.#onPaste);
        }
	}

/**
 * Destroys the application, removes browser event listeners and clears application-managed state.
 */
    override destroy(): void {
		if (CApplication.#m_instance !== this)
			return;

		this.stopUpdates();

		const canvas = this.#m_paintDevice.canvas();
		canvas.removeEventListener("pointerdown", this.#onPointerDown);
		canvas.removeEventListener("dblclick", this.#onDoubleClick);
		canvas.removeEventListener("pointerup", this.#onPointerUp);
		canvas.removeEventListener("pointermove", this.#onPointerMove);
		canvas.removeEventListener("wheel", this.#onWheel);
		canvas.removeEventListener("pointercancel", this.#onPointerCancel);
		canvas.removeEventListener("contextmenu", this.#onContextMenu);

		if (typeof window !== "undefined") {
			window.removeEventListener("keydown", this.#onKeyDown);
			window.removeEventListener("keyup", this.#onKeyUp);
            window.removeEventListener("copy", this.#onCopy);
            window.removeEventListener("cut", this.#onCut);
            window.removeEventListener("paste", this.#onPaste);
		}

		this.#cancelToolTipTimer();
		this.#m_toolTipWidget?.hide();
		this.#m_toolTipWidget = null;
		this.#m_toolTipTarget = null;

        // Widgets use the application during destruction; keep the singleton alive
        // until their child objects (including timers) have been released.
        if (this.#m_activeDrag !== null) this.cancelDrag();
        this.setFocusWidget(null);
        this.#m_popupFocus.clear();
        const roots = new Set<CWidget>([
            ...this.#m_topLevelWidgets, ...this.#m_windowWidgets,
            ...this.#m_modalWidgets, ...this.#m_popupWidgets
        ]);
        for (const widget of roots) {
            if (widget.parent() === null) widget.destroy();
        }

		this.#m_topLevelWidgets.clear();
		this.#m_popupWidgets.length = 0;
        this.#m_popupFocus.clear();
		this.#m_windowWidgets.length = 0;
		this.#m_mouseGrabber = null;
		this.#m_hoverWidget = null;
        this.#m_focusWidget = null;
		this.#m_modalWidgets.length = 0;
		if (this.#m_activeDrag !== null)
			this.cancelDrag();
		CClipboard.destroy();
		super.destroy();
		CApplication.#m_instance = null;

	}

/**
 * Returns the current application instance.
 * @returns Current application instance.
 * @throws Error if no CApplication has been created.
 */
	static instance(): CApplication {
		if (CApplication.#m_instance === null)
			throw new Error("CApplication has not been created.");

		return CApplication.#m_instance;
	}

/**
 * Checks whether an application instance exists.
 * @returns `true` if a CApplication currently exists.
 */
	static exists(): boolean {
		return CApplication.#m_instance !== null;
	}

/**
 * Returns the HTML canvas used by the application.
 * @returns Application canvas element.
 */
	canvas(): HTMLCanvasElement {
		return this.#m_paintDevice.canvas();
	}

/**
 * Returns the paint device associated with the application canvas.
 * @returns Application paint device.
 */
	paintDevice(): CPaintDevice {
		return this.#m_paintDevice;
	}

/**
 * Returns the registered top-level widgets.
 * @returns Snapshot of the top-level widget list.
 */
	topLevelWidgets(): readonly CWidget[] {
		return [...this.#m_topLevelWidgets];
	}

/**
 * Returns the application default font.
 * @returns Independent copy of the current font.
 */
	font(): CFont {
		return new CFont(this.#m_font);
	}

/**
 * Sets the application default font and schedules a repaint.
 * @param font Font to use as the application default.
 */
	setFont(font: CFont): void {
		if (this.#m_font.isEqual(font))
			return;

		this.#m_font = new CFont(font);
		this.requestRepaint();
	}

/**
 * Returns the application palette.
 * @returns Current application palette.
 */
    palette(): CPalette {
	    return this.#m_palette;
    }

/**
 * Sets the application palette and schedules a repaint.
 * @param palette Palette to use.
 */
    setPalette(palette: CPalette): void {
	    if (this.#m_palette === palette)
		    return;

	    this.#m_palette = palette;
	    this.requestRepaint();
    }

/**
 * Returns the application style.
 * @returns Current application style.
 */
    style(): CStyle {
	    return this.#m_style;
    }

/**
 * Sets the application style and schedules a repaint.
 * @param style Style to use.
 */
    setStyle(style: CStyle): void {
	    if (this.#m_style === style)
		    return;

    	this.#m_style = style;
	    this.requestRepaint();
    }

/**
 * Registers a top-level widget.
 * @param widget Parentless widget to register.
 * @throws Error if the widget has a parent.
 */
	registerTopLevelWidget(widget: CWidget): void {
		if (widget.parent() !== null)
			throw new Error("A top-level widget cannot have a parent.");

		this.#m_topLevelWidgets.add(widget);
	}

/**
 * Unregisters a top-level widget.
 * @param widget Widget to unregister.
 */
	unregisterTopLevelWidget(widget: CWidget): void {
		this.#m_topLevelWidgets.delete(widget);
	}

/**
 * Returns whether repaint updates are enabled.
 * @returns `true` if updates are enabled.
 */
	updatesEnabled(): boolean {
		return this.#m_updatesEnabled;
	}

/**
 * Returns the widget that currently owns keyboard focus.
 * @returns Focus widget, or `null` if none.
 */
	focusWidget(): CWidget | null {
		return this.#m_focusWidget;
	}

/**
 * Changes the keyboard focus widget and dispatches focus-out/focus-in events.
 * @param widget Widget to focus, or `null` to clear focus.
 */
    setFocusWidget(widget: CWidget | null): void {
	    if (this.#m_focusWidget === widget)
		    return;

	    const oldWidget = this.#m_focusWidget;
	    this.#m_focusWidget = widget;

	    if (oldWidget !== null) {
		    const event = new CFocusEvent(CEventType.FocusOut);
		    oldWidget.event(event);
	    }

	    if (widget !== null) {
		    const event = new CFocusEvent(CEventType.FocusIn);
		    widget.event(event);
	    }
    }

/**
 * Enables repaint updates and requests a repaint.
 */
	startUpdates(): void {
		if (this.#m_updatesEnabled)
			return;

		this.#m_updatesEnabled = true;
		this.requestRepaint();
	}

/**
 * Disables repaint updates and cancels any pending animation frame.
 */
	stopUpdates(): void {
		if (!this.#m_updatesEnabled)
			return;

		this.#m_updatesEnabled = false;

		if (this.#m_frameRequest !== null) {
			cancelAnimationFrame(this.#m_frameRequest);
			this.#m_frameRequest = null;
		}
	}

/**
 * Schedules a repaint on the next animation frame when updates are enabled.
 */
	requestRepaint(): void {
		if (!this.#m_updatesEnabled)
			return;

		if (this.#m_frameRequest !== null)
			return;

		this.#m_frameRequest = requestAnimationFrame(() => {
			this.#m_frameRequest = null;
			this.#repaint();
		});
	}

/**
 * Routes subsequent mouse events to a specific widget.
 * @param widget Widget that should grab mouse input.
 */
	grabMouse(widget: CWidget): void {
		this.#m_mouseGrabber = widget;
	}

/**
 * Releases the current mouse grab.
 */
	releaseMouse(): void {
		this.#m_mouseGrabber = null;
	}

/**
 * Returns the widget currently grabbing mouse input.
 * @returns Mouse grabber, or `null`.
 */
	mouseGrabber(): CWidget | null {
		return this.#m_mouseGrabber;
	}

/**
 * Returns the widget currently under the pointer.
 * @returns Hovered widget, or `null`.
 */
	hoverWidget(): CWidget | null {
		return this.#m_hoverWidget;
	}

/**
 * Closes all currently registered popup widgets.
 */
	closeAllPopups(): void
	{
		const popups = [...this.#m_popupWidgets];

		for (let i = popups.length - 1; i >= 0; --i)
			popups[i]!.close();
	}

/**
 * Returns the registered popup widgets in stacking order.
 * @returns Snapshot of the popup widget list.
 */
	popupWidgets(): readonly CPopupWidget[] {
		return [...this.#m_popupWidgets];
	}

/**
 * Registers a popup widget and moves it to the top of the popup stack.
 * @param widget Popup widget to register.
 */
	registerPopupWidget(widget: CPopupWidget): void {
		const index = this.#m_popupWidgets.indexOf(widget);
        if (index === -1) this.#m_popupFocus.set(widget, this.#m_focusWidget);

		if (index !== -1)
			this.#m_popupWidgets.splice(index, 1);

		this.#m_popupWidgets.push(widget);
		this.requestRepaint();
	}

/**
 * Unregisters a popup widget.
 * @param widget Popup widget to unregister.
 */
	unregisterPopupWidget(widget: CPopupWidget): void {
		const index = this.#m_popupWidgets.indexOf(widget);

		if (index === -1)
			return;

		this.#m_popupWidgets.splice(index, 1);
        const previousFocus = this.#m_popupFocus.get(widget) ?? null;
        this.#m_popupFocus.delete(widget);
        if (this.#m_focusWidget !== null && this.#belongsToModal(this.#m_focusWidget, widget)) {
            this.setFocusWidget(previousFocus !== null && previousFocus.isVisible() && previousFocus.isEnabled()
                ? previousFocus : null);
        }
		this.requestRepaint();
	}

/**
 * Registers a window widget and moves it to the top of the window stack.
 * @param widget Window widget to register.
 */
	registerWindowWidget(widget: CWidget): void {
		const index = this.#m_windowWidgets.indexOf(widget);

		if (index !== -1)
			this.#m_windowWidgets.splice(index, 1);

		this.#m_windowWidgets.push(widget);
		this.requestRepaint();
	}

/**
 * Unregisters a window widget.
 * @param widget Window widget to unregister.
 */
	unregisterWindowWidget(widget: CWidget): void {
		const index = this.#m_windowWidgets.indexOf(widget);

		if (index === -1)
			return;

		this.#m_windowWidgets.splice(index, 1);
		this.requestRepaint();
	}

/**
 * Checks whether a widget is registered as a window.
 * @param widget Widget to test.
 * @returns `true` if the widget is a registered window.
 */
	isWindowWidget(widget: CWidget): boolean {
		return this.#m_windowWidgets.includes(widget);
	}

/**
 * Registers a modal widget after closing open popups.
 * @param widget Modal widget to register.
 */
	registerModalWidget(widget: CWidget): void
	{
		this.closeAllPopups();
		const index = this.#m_modalWidgets.indexOf(widget);

		if (index !== -1)
			this.#m_modalWidgets.splice(index, 1);

		this.#m_modalWidgets.push(widget);
	}

/**
 * Unregisters a modal widget.
 * @param widget Modal widget to unregister.
 */
	unregisterModalWidget(widget: CWidget): void
	{
		const index = this.#m_modalWidgets.indexOf(widget);

		if (index === -1)
			return;

		this.#m_modalWidgets.splice(index, 1);
	}

/**
 * Returns the registered modal widgets.
 * @returns Snapshot of the modal widget stack.
 */
	modalWidgets(): readonly CWidget[]
	{
		return [...this.#m_modalWidgets];
	}

/**
 * Returns the topmost modal widget.
 * @returns Top modal widget, or `null` when no modal widget is registered.
 */
	topModalWidget(): CWidget | null
	{
		if (this.#m_modalWidgets.length === 0)
			return null;

		return this.#m_modalWidgets[this.#m_modalWidgets.length - 1]!;
	}

/**
 * Returns whether a tooltip is currently visible.
 * @returns `true` if a tooltip is visible.
 */
	toolTipVisible(): boolean
	{
		return this.#m_toolTipWidget?.isVisible() ?? false;
	}

/**
 * Moves keyboard focus to the next or previous focusable widget.
 * @param forward `true` to move forward; `false` to move backward.
 * @returns `true` if focus was moved.
 */
	focusNextWidget(forward = true): boolean {
		const widgets = this.#focusableWidgets();

		if (widgets.length === 0)
			return false;

		const current = this.#m_focusWidget;
		let index = widgets.indexOf(current!);

		if (index < 0)
            index = forward ? 0 : widgets.length - 1;
        else
            index = (index + (forward ? 1 : -1) + widgets.length) % widgets.length;

		widgets[index]!.setFocus();

		return true;
	}

/**
 * Returns the active drag operation.
 * @returns Active drag, or `null`.
 */
	activeDrag(): CDrag | null {
		return this.#m_activeDrag;
	}

/**
 * Returns the current drag target widget.
 * @returns Drag target, or `null`.
 */
	dragTarget(): CWidget | null {
		return this.#m_dragTarget;
	}

/**
 * Registers an already active drag operation with the application.
 * @param drag Active drag operation to manage.
 */
	startDrag(drag: CDrag): void {
		if (!drag.isActive())
			return;

		if (this.#m_activeDrag !== null)
			this.cancelDrag();

		this.#m_activeDrag = drag;
		this.#m_dragTarget = null;
		this.#dismissToolTip();
	}

/**
 * Cancels the active drag operation and notifies the current drag target.
 */
	cancelDrag(): void {
		if (this.#m_activeDrag === null)
			return;

		if (this.#m_dragTarget !== null) {
			const event = new CDragLeaveEvent();
			event.ignore();
			this.#m_dragTarget.event(event);
		}

		this.#m_activeDrag.cancel();
		this.#m_activeDrag = null;
		this.#m_dragTarget = null;
	}

/**
 * Returns the application clipboard.
 * @returns Application clipboard instance.
 */
	clipboard(): CClipboard {
		return this.#m_clipboard;
	}

	#mouseButton(button: number): CMouseButton {
		switch (button) {
		case 0:
			return CMouseButton.LeftButton;

		case 1:
			return CMouseButton.MiddleButton;

		case 2:
			return CMouseButton.RightButton;

		default:
			return CMouseButton.NoButton;
		}
	}

	#canvasPosition(event: MouseEvent): CPoint {
		const canvas = this.#m_paintDevice.canvas();
		const rect = canvas.getBoundingClientRect();

		return new CPoint(
			(event.clientX - rect.left) * canvas.width / rect.width,
			(event.clientY - rect.top) * canvas.height / rect.height
		);
	}

	#widgetAt(x: number, y: number): CWidget | null
	{
		for (let i = this.#m_popupWidgets.length - 1; i >= 0; --i) {
			const popup = this.#m_popupWidgets[i]!;

			const target = popup.widgetAt(
				x - popup.x(),
				y - popup.y()
			);

			if (target !== null)
				return target;
		}

		const modal = this.topModalWidget();
		if (modal !== null) {
			const pos = modal.mapFromCanvas(x, y);
			return modal.widgetAt(pos.x(), pos.y());
		}

		for (let i = this.#m_windowWidgets.length - 1; i >= 0; --i) {
			const windowWidget = this.#m_windowWidgets[i]!;
			if (!windowWidget.isVisible())
				continue;

			const pos = windowWidget.mapFromCanvas(x, y);
			const target = windowWidget.widgetAt(pos.x(), pos.y());

			if (target !== null)
				return target;
		}

		const widgets = [...this.#m_topLevelWidgets];

		for (let i = widgets.length - 1; i >= 0; --i) {
			const widget = widgets[i]!;

			const target = widget.widgetAt(
				x - widget.x(),
				y - widget.y()
			);

			if (target !== null)
				return target;
		}

		return null;
	}

	#dropTargetAt(x: number, y: number): CWidget | null {
		let target = this.#widgetAt(x, y);

		while (target !== null) {
			if (target.isEnabled() && target.acceptDrops())
				return target;

			target = target.parent();
		}

		return null;
	}

	#repaint(): void {
		const painter = new CPainter(this.#m_paintDevice);

		painter.clearRect(new CRect(
			0, 0, this.#m_paintDevice.width(),
			this.#m_paintDevice.height()
		));

		for (const widget of this.#m_topLevelWidgets)
			widget.render(painter);

		for (const windowWidget of this.#m_windowWidgets) {
			if (!windowWidget.isVisible())
				continue;

			const origin = windowWidget.mapToCanvas(0, 0);

			painter.save();
			try {
				painter.translate(
					origin.x() - windowWidget.x(),
					origin.y() - windowWidget.y()
				);
				windowWidget.render(painter);
			} finally {
				painter.restore();
			}
		}

		for (const popup of this.#m_popupWidgets)
			popup.render(painter);

		if (this.#m_toolTipWidget?.isVisible())
			this.#m_toolTipWidget.render(painter);
	}

	#dispatchMouseEvent(type: CEventType, pointerEvent: PointerEvent): void
	{
		const position = this.#canvasPosition(pointerEvent);
		if (type === CEventType.MousePress && this.#m_popupWidgets.length > 0) {
			const popupIndex = this.#popupAt(position.x(), position.y());

			if (popupIndex === -1) {
				this.#closeAllPopups();
				return;
			}

			this.#closePopupsAbove(popupIndex);
		}

		let target = this.#m_mouseGrabber;
		if (target === null)
			target = this.#widgetAt(position.x(), position.y());

		if (type === CEventType.MousePress && target !== null)
			this.#m_clickCount = this.#countMouseClicks(target, pointerEvent, position);
		if (type === CEventType.MouseMove && this.#m_lastClick !== null
			&& Math.hypot(position.x() - this.#m_lastClick.x,
				position.y() - this.#m_lastClick.y) > 5)
			this.#m_lastClick = null;
		const clickCount = type === CEventType.MousePress || type === CEventType.MouseRelease
			? this.#m_clickCount : 1;

		while (target !== null) {
			const oldFocus = this.#m_focusWidget;

			if (this.#sendMouseEvent(target, type, pointerEvent, clickCount)) {
				if (type === CEventType.MousePress) {
					if (this.#m_focusWidget === oldFocus && target.acceptsClickFocus())
						target.setFocus();

					this.grabMouse(target);
					this.#m_paintDevice.canvas().setPointerCapture(pointerEvent.pointerId);
				}
				break;
			}

			target = target.parent();
		}

		if (type === CEventType.MouseRelease)
			this.#releasePointer(pointerEvent);

		if (type === CEventType.MouseMove) {
			if (this.#m_hoverWidget === null)
				this.#setCursor(CCursorShape.Arrow);
			else
				this.#setCursor(this.#m_hoverWidget.cursor());
		}
	}

	#dispatchDoubleClick(mouseEvent: MouseEvent): void {
		const position = this.#canvasPosition(mouseEvent);
		let target = this.#widgetAt(position.x(), position.y());
		this.#m_clickCount = Math.max(2, mouseEvent.detail || 2);
		if (target !== null)
			this.#m_lastClick = { widget: target, button: mouseEvent.button,
				x: position.x(), y: position.y(), time: Date.now(), count: this.#m_clickCount };

		while (target !== null) {
			if (this.#sendMouseEvent(
				target, CEventType.MouseDoubleClick, mouseEvent, this.#m_clickCount
			))
				break;

			target = target.parent();
		}
	}

	#dispatchWheelEvent(type: CEventType, wheelEvent: WheelEvent): void {
		let target = this.#m_hoverWidget;
		if (target === null)
			return;

		while (target !== null) {
			if (this.#sendWheelEvent(target, type, wheelEvent)) {
				if (type === CEventType.Wheel && (target.focusPolicy() & CFocusPolicy.WheelFocus)
						=== CFocusPolicy.WheelFocus)
					target.setFocus();
				break;
			}
			target = target.parent();
		}
	}

	#dispatchKeyEvent(type: CEventType, keyboardEvent: KeyboardEvent): void {
        if (this.#isDomEditor(keyboardEvent.target) && (keyboardEvent.ctrlKey || keyboardEvent.metaKey) &&
            ["c", "x", "v"].includes(keyboardEvent.key.toLowerCase())) return;
		if (type === CEventType.KeyPress && keyboardEvent.key === "Escape" &&
			this.#m_popupWidgets.length > 0) {
			const popup = this.#m_popupWidgets[this.#m_popupWidgets.length - 1]!;
			popup.close();
			keyboardEvent.preventDefault();
			return;
		}

        const boundary = this.#m_popupWidgets[this.#m_popupWidgets.length - 1]
            ?? this.topModalWidget();
        const focus = this.#m_focusWidget;
        let target = (focus !== null && focus.isVisible() && focus.isEnabled()
            && (boundary === null || this.#belongsToModal(focus, boundary)) ? focus : null)
            ?? boundary;
        if (target === null) {
            // A window action remains available even when an editor clears focus.
            const windows = [...this.#m_topLevelWidgets, ...this.#m_windowWidgets];
            for (let i = windows.length - 1; i >= 0; --i) {
                const candidate = windows[i]!;
                if (candidate.isVisible() && candidate.isEnabled()) { target = candidate; break; }
            }
        }
		if (target === null)
			return;

		const requestsContextMenu = keyboardEvent.key === "ContextMenu"
			|| (keyboardEvent.key === "F10" && keyboardEvent.shiftKey);
		if (type === CEventType.KeyPress && requestsContextMenu
			&& !keyboardEvent.ctrlKey && !keyboardEvent.altKey && !keyboardEvent.metaKey
			&& this.#dispatchKeyboardContextMenuEvent(target)) {
			if (typeof keyboardEvent.preventDefault === "function")
				keyboardEvent.preventDefault();
			return;
		}

		const altGraph = typeof keyboardEvent.getModifierState === "function"? 
			keyboardEvent.getModifierState("AltGraph") : false;
		const event = new CKeyEvent(type, keyboardEvent.key,
			keyboardEvent.ctrlKey, keyboardEvent.shiftKey,
			keyboardEvent.altKey, keyboardEvent.metaKey, keyboardEvent.code, 
			altGraph);

		if (type === CEventType.KeyPress && this.#dispatchShortcut(target, event)) {
			keyboardEvent.preventDefault?.();
			return;
		}

        // Let the browser produce a ClipboardEvent with the real system data.
        // Preventing keydown here would suppress the subsequent paste/copy event.
        const key = keyboardEvent.key.toLowerCase();
        if (type === CEventType.KeyPress && typeof ClipboardEvent !== "undefined" &&
            (event.ctrl() || event.meta()) && !event.alt() && !event.altGraph() &&
            (!event.shift() || key === "v") && ["c", "x", "v"].includes(key) &&
            !this.#isDomEditor(keyboardEvent.target) && this.#clipboardEditor() !== null) return;

		while (target !== null) {
			if (target.event(event))
				break;

			target = target === boundary ? null : target.parent();
		}

		if (event.isAccepted()) {
			if (typeof keyboardEvent.preventDefault === "function")
				keyboardEvent.preventDefault();
			return;
		}

		if (type === CEventType.KeyPress && keyboardEvent.key === "Tab") {
			if (this.focusNextWidget(!keyboardEvent.shiftKey) || boundary !== null)
				keyboardEvent.preventDefault();
		}
	}

    #isDomEditor(target: EventTarget | null): boolean {
        const element = target as (HTMLElement | null);
        return element != null && (element.isContentEditable === true ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName));
    }

    #clipboardEditor(): CClipboardEditor | null {
        let widget = this.#m_focusWidget;
        const boundary = this.#m_popupWidgets[this.#m_popupWidgets.length - 1] ?? this.topModalWidget();
        if (widget === null || (boundary !== null && boundary !== undefined && !this.#belongsToModal(widget, boundary))) return null;
        // Validate the whole ancestry before touching the clipboard.
        for (let owner: CWidget | null = widget; owner !== null; owner = owner.parent()) {
            if (!owner.isVisible() || !owner.isEnabled()) return null;
            if (owner === boundary) break;
        }
        while (widget !== null) {
            const candidate = widget as Partial<CClipboardEditor>;
            if (typeof candidate.selectedText === "function" && typeof candidate.copy === "function" &&
                typeof candidate.cut === "function" && typeof candidate.paste === "function" &&
                typeof candidate.isReadOnly === "function") return widget as CClipboardEditor;
            if (widget === boundary) break;
            widget = widget.parent();
        }
        return null;
    }

    #dispatchClipboardEvent(kind: "copy" | "cut" | "paste", event: ClipboardEvent): void {
        if (event.defaultPrevented || this.#isDomEditor(event.target)) return;
        const editor = this.#clipboardEditor();
        const data = event.clipboardData;
        if (editor === null || data == null) return;
        if (kind !== "copy" && editor.isReadOnly()) return;
        if (kind === "paste") {
            // An empty clipboard must not cause insertion of old internal data.
            if (!Array.from(data.types).includes("text/plain")) return;
            this.#m_clipboard.withNativeClipboard(() => {
                this.#m_clipboard.setText(data.getData("text/plain"));
                editor.paste();
            });
        } else {
            const text = editor.selectedText();
            if (text.length === 0) return;
            data.setData("text/plain", text);
            this.#m_clipboard.withNativeClipboard(() => {
                if (kind === "cut") editor.cut(); else editor.copy();
            });
        }
        event.preventDefault();
    }

	#dispatchShortcut(focused: CWidget, event: CKeyEvent): boolean {
		const recorder = focused as CWidget & { capturesShortcuts?: () => boolean };
		if (recorder.capturesShortcuts?.() === true) return false;
		const boundary = this.#m_popupWidgets[this.#m_popupWidgets.length - 1]
			?? this.topModalWidget();
		if (boundary && !this.#belongsToModal(focused, boundary)) return false;
		const path: CWidget[] = [];
		let current: CWidget | null = focused;
		while (current !== null) {
			if (!current.isVisible() || !current.isEnabled()) return false;
			path.push(current);
			if (current === boundary) break;
			current = current.parent();
		}
		for (const owner of path) {
			const matches = (owner as CObject).children().filter((child): child is CShortcut =>
				child instanceof CShortcut && child.matches(event));
			if (matches.length === 0) continue;
			event.accept();
			if (matches.length === 1) matches[0]!.activated.emit();
			else for (const shortcut of matches) shortcut.activatedAmbiguously.emit();
			return true;
		}
		return false;
	}

	#updateHoverWidget(pointerEvent: PointerEvent): void {
		const position = this.#canvasPosition(pointerEvent);
		const widget = this.#widgetAt(position.x(), position.y());

		if (widget === this.#m_hoverWidget)
			return;

		const oldWidget = this.#m_hoverWidget;
		this.#m_hoverWidget = widget;
		if (this.#m_hoverWidget === null)
			this.#setCursor(CCursorShape.Arrow);
		else
			this.#setCursor(this.#m_hoverWidget.cursor());

		if (oldWidget !== null)
			this.#sendMouseEvent(
				oldWidget, CEventType.MouseLeave, pointerEvent
			);

		if (widget !== null)
			this.#sendMouseEvent(
				widget, CEventType.MouseEnter, pointerEvent
			);
	}

	/** Pointer events commonly have detail=0, so keep a fallback click sequence. */
	#countMouseClicks(widget: CWidget, event: MouseEvent, position: CPoint): number {
		const time = Date.now();
		const previous = this.#m_lastClick;
		const continues = previous !== null && previous.widget === widget
			&& previous.button === event.button && time - previous.time <= 500
			&& Math.hypot(position.x() - previous.x, position.y() - previous.y) <= 5;
		const count = Number.isFinite(event.detail) && event.detail > 0
			? Math.trunc(event.detail)
			: continues && previous.count < 3 ? previous.count + 1 : 1;
		this.#m_lastClick = { widget, button: event.button, x: position.x(), y: position.y(),
			time, count };
		return count;
	}

	#sendMouseEvent(widget: CWidget, type: CEventType, mouseEvent: MouseEvent,
		clickCount = 1): boolean {
		const position = this.#canvasPosition(mouseEvent);
		const localPosition = widget.mapFromCanvas(
			position.x(), position.y()
		);

		const event = new CMouseEvent(type, localPosition.x(), localPosition.y(),
				this.#mouseButton(mouseEvent.button), mouseEvent.shiftKey, clickCount);

		return widget.event(event);
	}

	#sendWheelEvent(widget: CWidget, type: CEventType, wheelEvent: WheelEvent): boolean {
		const event = new CWheelEvent(wheelEvent.deltaX, wheelEvent.deltaY);
		return widget.event(event);
	}

	#belongsToModal(widget: CWidget, modal: CWidget): boolean
	{
		let current: CWidget | null = widget;

		while (current !== null) {
			if (current === modal)
				return true;

			current = current.parent();
		}

		return false;
	}

	#popupAt(x: number, y: number): number {
		for (let i = this.#m_popupWidgets.length - 1; i >= 0; --i) {
			const popup = this.#m_popupWidgets[i]!;
			const target = popup.widgetAt(x - popup.x(), y - popup.y());

			if (target !== null)
				return i;
		}

		return -1;
	}

	#closePopupsAbove(index: number): void {
		const popups = [...this.#m_popupWidgets];

		for (let i = popups.length - 1; i > index; --i)
			popups[i]!.close();
	}

	#closeAllPopups(): void {
		const popups = [...this.#m_popupWidgets];

		for (let i = popups.length - 1; i >= 0; --i)
			popups[i]!.close();
	}

	#updateToolTipTarget(): void
	{
		let target = this.#m_hoverWidget;

		while (target !== null && target.toolTip().length === 0)
			target = target.parent();

		if (target === this.#m_toolTipTarget)
			return;

		this.#cancelToolTipTimer();
		this.#hideToolTip();

		this.#m_toolTipTarget = target;

		if (target === null)
			return;

		this.#m_toolTipTimer.start(CApplication.#TOOL_TIP_DELAY);
	}

	async #ensureToolTipWidget(): Promise<CToolTipWidget>
	{
		if (this.#m_toolTipWidget !== null)
			return this.#m_toolTipWidget;

		const { CToolTipWidget } = await import("../widgets/CToolTipWidget.js");
		const widget = new CToolTipWidget();

		this.unregisterTopLevelWidget(widget);
		widget.hide();

		this.#m_toolTipWidget = widget;

		return widget;
	}

	async #showToolTip(): Promise<void>
	{
		let target = this.#m_toolTipTarget;
		if (target === null || target.toolTip().length === 0)
			return;

		const toolTipWidget = await this.#ensureToolTipWidget();
		target = this.#m_toolTipTarget;

		if (target === null || target.toolTip().length === 0)
			return;

		toolTipWidget.setText(target.toolTip());
		let x = this.#m_mouseX + CApplication.#TOOL_TIP_OFFSET_X;
		let y = this.#m_mouseY + CApplication.#TOOL_TIP_OFFSET_Y;
		const canvas = this.canvas();

		if (x + toolTipWidget.width() > canvas.width)
			x = canvas.width - toolTipWidget.width();
		if (y + toolTipWidget.height() > canvas.height)
			y = this.#m_mouseY - toolTipWidget.height() - 8;

		x = Math.max(0, x);
		y = Math.max(0, y);

		toolTipWidget.move(x, y);
		toolTipWidget.show();

		this.requestRepaint();
	}

	#hideToolTip(): void
	{
		if (!this.#m_toolTipWidget?.isVisible())
			return;

		this.#m_toolTipWidget.hide();
		this.requestRepaint();
	}

	#cancelToolTipTimer(): void
	{
		this.#m_toolTipTimer.stop();
	}

	#dismissToolTip(): void
	{
		this.#cancelToolTipTimer();
		this.#hideToolTip();
		this.#m_toolTipTarget = null;
	}

	#setCursor(crsr: CCursorShape): void {
		let shape = "";
		switch (crsr) {
			case CCursorShape.Arrow:
				shape = "default";
				break;
			case CCursorShape.SplitH:
				shape = "col-resize";
				break;
			case CCursorShape.SplitV:
				shape = "row-resize";
				break;
			case CCursorShape.PointingHand:
				shape = "pointer";
				break;
			case CCursorShape.IBeam:
				shape = "text";
				break;
			case CCursorShape.Cross:
				shape = "crosshair";
				break;
			case CCursorShape.SizeFDiag:
				shape = "nwse-resize";
				break;
			case CCursorShape.Grab:
				shape = "grab";
				break;
			case CCursorShape.Grabbing:
				shape = "grabbing";
				break;
			case CCursorShape.Disabled:
				shape = "not-allowed";
				break;
		}

		if (shape.length > 0)
			this.#m_paintDevice.canvas().style.cursor = shape;
	}

    #focusableWidgets(): CWidget[] {
        const result: CWidget[] = [];
        const visited = new Set<CWidget>();
        const boundary = this.#m_popupWidgets[this.#m_popupWidgets.length - 1]
            ?? this.topModalWidget();
        const visit = (widget: CWidget): void => {
            if (visited.has(widget) || !widget.isVisible() || !widget.isEnabled()) return;
            visited.add(widget);
            if (widget.acceptsTabFocus()) result.push(widget);
            for (const child of widget.children()) {
                if (child instanceof CWidget) visit(child);
            }
        };
        if (boundary !== null) {
            visit(boundary);
        } else {
            for (const widget of this.#m_topLevelWidgets) visit(widget);
            // Parentless non-modal dialogs are registered as windows only.
            for (const widget of this.#m_windowWidgets) visit(widget);
        }
        return result;
    }

	/** Opens a keyboard context menu at the focused widget's centre. */
	#dispatchKeyboardContextMenuEvent(focused: CWidget): boolean {
		if (!focused.isEnabled() || !focused.isVisible())
			return false;

		const position = focused.mapToCanvas(
			Math.max(0, Math.floor(focused.width() / 2)),
			Math.max(0, Math.floor(focused.height() / 2)));
		let target: CWidget | null = focused;
		while (target !== null) {
			const event = new CContextMenuEvent(CContextMenuReason.Keyboard,
				target.mapFromCanvas(position.x(), position.y()), position);
			if (target.event(event))
				return true;
			target = target.parent();
		}
		return false;
	}

	#dispatchContextMenuEvent(domEvent: PointerEvent): void {
		const position = this.#canvasPosition(domEvent);
		let target = this.#widgetAt(position.x(), position.y());

		while (target !== null) {
			const localPosition = target.mapFromCanvas(
				position.x(), position.y());

			const event = new CContextMenuEvent(
				CContextMenuReason.Mouse,
				localPosition,
				position
			);

			if (target.event(event)) {
				domEvent.preventDefault();
				return;
			}

			target = target.parent();
		}
	}

	#releasePointer(event: PointerEvent): void {
		this.releaseMouse();

		if (this.#m_paintDevice.canvas().hasPointerCapture(event.pointerId))
			this.#m_paintDevice.canvas().releasePointerCapture(event.pointerId);
	}

	#proposedDragAction(): CDropAction {
		const drag = this.#m_activeDrag;

		if (drag === null)
			return CDropAction.IgnoreAction;

		if (drag.defaultAction() !== CDropAction.IgnoreAction)
			return drag.defaultAction();

		const actions = drag.supportedActions();

		if ((actions & CDropAction.CopyAction) !== 0)
			return CDropAction.CopyAction;

		if ((actions & CDropAction.MoveAction) !== 0)
			return CDropAction.MoveAction;

		if ((actions & CDropAction.LinkAction) !== 0)
			return CDropAction.LinkAction;

		return CDropAction.IgnoreAction;
	}

	#sendDragEnterEvent(widget: CWidget, position: CPoint): boolean {
		const drag = this.#m_activeDrag;

		if (drag === null || drag.mimeData() === null)
			return false;

		const localPosition = widget.mapFromCanvas(
			position.x(), position.y());

		const event = new CDragEnterEvent(localPosition,
			drag.mimeData()!, drag.supportedActions(),
			this.#proposedDragAction());

		event.ignore();
		widget.event(event);

		return event.isAccepted();
	}

	#sendDragMoveEvent(widget: CWidget, position: CPoint): boolean {
		const drag = this.#m_activeDrag;

		if (drag === null || drag.mimeData() === null)
			return false;

		const localPosition = widget.mapFromCanvas(
			position.x(), position.y());

		const event = new CDragMoveEvent(localPosition,
			drag.mimeData()!, drag.supportedActions(),
			this.#proposedDragAction());

		event.ignore();
		widget.event(event);

		return event.isAccepted();
	}

	#dispatchDragMove(pointerEvent: PointerEvent): void {
		const position = this.#canvasPosition(pointerEvent);
		let target = this.#dropTargetAt(position.x(), position.y());

		if (target !== this.#m_dragTarget) {
			if (this.#m_dragTarget !== null) {
				const leaveEvent = new CDragLeaveEvent();
				leaveEvent.ignore();
				this.#m_dragTarget.event(leaveEvent);
			}

			this.#m_dragTarget = null;

			if (target !== null &&
				this.#sendDragEnterEvent(target, position))
				this.#m_dragTarget = target;

			return;
		}

		if (target !== null)
			this.#sendDragMoveEvent(target, position);
	}

	#dispatchDrop(pointerEvent: PointerEvent): void {
		const drag = this.#m_activeDrag;

		if (drag === null)
			return;

		let action = CDropAction.IgnoreAction;

		if (this.#m_dragTarget !== null && drag.mimeData() !== null) {
			const position = this.#canvasPosition(pointerEvent);
			const localPosition = this.#m_dragTarget.mapFromCanvas(
				position.x(), position.y());

			const event = new CDropEvent(localPosition,
				drag.mimeData()!, drag.supportedActions(),
				this.#proposedDragAction());

			event.ignore();
			this.#m_dragTarget.event(event);

			if (event.isAccepted())
				action = event.dropAction();
		}

		drag.finish(action);
		this.#m_activeDrag = null;
		this.#m_dragTarget = null;
	}
}
