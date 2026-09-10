import { CObject } from "./CObject.js";
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

export class CApplication extends CObject {
	static #m_instance: CApplication | null = null;

	#m_paintDevice: CCanvasPaintDevice;
	#m_topLevelWidgets = new Set<CWidget>();
	#m_mouseGrabber: CWidget | null = null;
	#m_hoverWidget: CWidget | null = null;
	#m_focusWidget: CWidget | null = null;
	#m_updatesEnabled = false;
	#m_frameRequest: number | null = null;
	#m_font = "14px sans-serif";
    #m_palette = new CPalette();
    #m_style: CStyle = new CDefaultStyle();
    #m_popupWidgets: CPopupWidget[] = [];
	#m_windowWidgets: CWidget[] = [];
	#m_modalWidgets: CWidget[] = [];
	#m_toolTipWidget: CToolTipWidget | null = null;
	#m_toolTipTarget: CWidget | null = null;
	#m_toolTipTimer = new CTimer(this);
	#m_mouseX = 0;
	#m_mouseY = 0;
	#m_activeDrag: CDrag | null = null;
	#m_dragTarget: CWidget | null = null;
	#m_clipboard = new CClipboard(this);

	static readonly #TOOL_TIP_DELAY = 700;
	static readonly #TOOL_TIP_OFFSET_X = 12;
	static readonly #TOOL_TIP_OFFSET_Y = 18;

	#onPointerDown = (event: PointerEvent): void => {
		this.#dispatchMouseEvent(CEventType.MousePress, event);
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
		canvas.addEventListener("pointerup", this.#onPointerUp);
		canvas.addEventListener("pointermove", this.#onPointerMove);
		canvas.addEventListener("wheel", this.#onWheel);
		canvas.addEventListener("pointercancel", this.#onPointerCancel);
		canvas.addEventListener("contextmenu", this.#onContextMenu);

        if (typeof window !== "undefined") {
	        window.addEventListener("keydown", this.#onKeyDown);
	        window.addEventListener("keyup", this.#onKeyUp);
        }
	}

    override destroy(): void {
		if (CApplication.#m_instance !== this)
			return;

		this.stopUpdates();

		const canvas = this.#m_paintDevice.canvas();
		canvas.removeEventListener("pointerdown", this.#onPointerDown);
		canvas.removeEventListener("pointerup", this.#onPointerUp);
		canvas.removeEventListener("pointermove", this.#onPointerMove);
		canvas.removeEventListener("wheel", this.#onWheel);
		canvas.removeEventListener("pointercancel", this.#onPointerCancel);
		canvas.removeEventListener("contextmenu", this.#onContextMenu);

		if (typeof window !== "undefined") {
			window.removeEventListener("keydown", this.#onKeyDown);
			window.removeEventListener("keyup", this.#onKeyUp);
		}

		this.#cancelToolTipTimer();
		this.#m_toolTipWidget?.hide();
		this.#m_toolTipWidget = null;
		this.#m_toolTipTarget = null;

		this.#m_topLevelWidgets.clear();
		this.#m_popupWidgets.length = 0;
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

	static instance(): CApplication {
		if (CApplication.#m_instance === null)
			throw new Error("CApplication has not been created.");

		return CApplication.#m_instance;
	}

	static exists(): boolean {
		return CApplication.#m_instance !== null;
	}

	canvas(): HTMLCanvasElement {
		return this.#m_paintDevice.canvas();
	}

	paintDevice(): CPaintDevice {
		return this.#m_paintDevice;
	}

	topLevelWidgets(): readonly CWidget[] {
		return [...this.#m_topLevelWidgets];
	}

	font(): string {
		return this.#m_font;
	}

	setFont(font: string): void {
		if (this.#m_font === font)
			return;

		this.#m_font = font;
		this.requestRepaint();
	}

    palette(): CPalette {
	    return this.#m_palette;
    }

    setPalette(palette: CPalette): void {
	    if (this.#m_palette === palette)
		    return;

	    this.#m_palette = palette;
	    this.requestRepaint();
    }

    style(): CStyle {
	    return this.#m_style;
    }

    setStyle(style: CStyle): void {
	    if (this.#m_style === style)
		    return;

    	this.#m_style = style;
	    this.requestRepaint();
    }

	registerTopLevelWidget(widget: CWidget): void {
		if (widget.parent() !== null)
			throw new Error("A top-level widget cannot have a parent.");

		this.#m_topLevelWidgets.add(widget);
	}

	unregisterTopLevelWidget(widget: CWidget): void {
		this.#m_topLevelWidgets.delete(widget);
	}

	updatesEnabled(): boolean {
		return this.#m_updatesEnabled;
	}

	focusWidget(): CWidget | null {
		return this.#m_focusWidget;
	}

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

	startUpdates(): void {
		if (this.#m_updatesEnabled)
			return;

		this.#m_updatesEnabled = true;
		this.requestRepaint();
	}

	stopUpdates(): void {
		if (!this.#m_updatesEnabled)
			return;

		this.#m_updatesEnabled = false;

		if (this.#m_frameRequest !== null) {
			cancelAnimationFrame(this.#m_frameRequest);
			this.#m_frameRequest = null;
		}
	}

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

	grabMouse(widget: CWidget): void {
		this.#m_mouseGrabber = widget;
	}

	releaseMouse(): void {
		this.#m_mouseGrabber = null;
	}

	mouseGrabber(): CWidget | null {
		return this.#m_mouseGrabber;
	}

	hoverWidget(): CWidget | null {
		return this.#m_hoverWidget;
	}

	closeAllPopups(): void
	{
		const popups = [...this.#m_popupWidgets];

		for (let i = popups.length - 1; i >= 0; --i)
			popups[i]!.close();
	}

	popupWidgets(): readonly CPopupWidget[] {
		return [...this.#m_popupWidgets];
	}

	registerPopupWidget(widget: CPopupWidget): void {
		const index = this.#m_popupWidgets.indexOf(widget);

		if (index !== -1)
			this.#m_popupWidgets.splice(index, 1);

		this.#m_popupWidgets.push(widget);
		this.requestRepaint();
	}

	unregisterPopupWidget(widget: CPopupWidget): void {
		const index = this.#m_popupWidgets.indexOf(widget);

		if (index === -1)
			return;

		this.#m_popupWidgets.splice(index, 1);
		this.requestRepaint();
	}

	registerWindowWidget(widget: CWidget): void {
		const index = this.#m_windowWidgets.indexOf(widget);

		if (index !== -1)
			this.#m_windowWidgets.splice(index, 1);

		this.#m_windowWidgets.push(widget);
		this.requestRepaint();
	}

	unregisterWindowWidget(widget: CWidget): void {
		const index = this.#m_windowWidgets.indexOf(widget);

		if (index === -1)
			return;

		this.#m_windowWidgets.splice(index, 1);
		this.requestRepaint();
	}

	isWindowWidget(widget: CWidget): boolean {
		return this.#m_windowWidgets.includes(widget);
	}

	registerModalWidget(widget: CWidget): void
	{
		this.closeAllPopups();
		const index = this.#m_modalWidgets.indexOf(widget);

		if (index !== -1)
			this.#m_modalWidgets.splice(index, 1);

		this.#m_modalWidgets.push(widget);
	}

	unregisterModalWidget(widget: CWidget): void
	{
		const index = this.#m_modalWidgets.indexOf(widget);

		if (index === -1)
			return;

		this.#m_modalWidgets.splice(index, 1);
	}

	modalWidgets(): readonly CWidget[]
	{
		return [...this.#m_modalWidgets];
	}

	topModalWidget(): CWidget | null
	{
		if (this.#m_modalWidgets.length === 0)
			return null;

		return this.#m_modalWidgets[this.#m_modalWidgets.length - 1]!;
	}

	toolTipVisible(): boolean
	{
		return this.#m_toolTipWidget?.isVisible() ?? false;
	}

	focusNextWidget(forward = true): boolean {
		const widgets = this.#focusableWidgets();

		if (widgets.length === 0)
			return false;

		const current = this.#m_focusWidget;
		let index = widgets.indexOf(current!);

		if (forward)
			index = (index + 1 + widgets.length) % widgets.length;
		else
			index = (index - 1 + widgets.length) % widgets.length;

		widgets[index]!.setFocus();

		return true;
	}

	activeDrag(): CDrag | null {
		return this.#m_activeDrag;
	}

	dragTarget(): CWidget | null {
		return this.#m_dragTarget;
	}

	startDrag(drag: CDrag): void {
		if (!drag.isActive())
			return;

		if (this.#m_activeDrag !== null)
			this.cancelDrag();

		this.#m_activeDrag = drag;
		this.#m_dragTarget = null;
		this.#dismissToolTip();
	}

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

	#canvasPosition(event: PointerEvent): CPoint {
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

		while (target !== null) {
			const oldFocus = this.#m_focusWidget;

			if (this.#sendMouseEvent(target, type, pointerEvent)) {
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
		if (type === CEventType.KeyPress && keyboardEvent.key === "Escape" &&
			this.#m_popupWidgets.length > 0) {
			const popup = this.#m_popupWidgets[this.#m_popupWidgets.length - 1]!;
			popup.close();
			keyboardEvent.preventDefault();
			return;
		}

		let target = this.#m_focusWidget;
		if (target === null)
			return;

		const altGraph = typeof keyboardEvent.getModifierState === "function"? 
			keyboardEvent.getModifierState("AltGraph") : false;
		const event = new CKeyEvent(type, keyboardEvent.key,
			keyboardEvent.ctrlKey, keyboardEvent.shiftKey,
			keyboardEvent.altKey, keyboardEvent.metaKey, keyboardEvent.code, 
			altGraph);

		while (target !== null) {
			if (target.event(event))
				break;

			target = target.parent();
		}

		if (event.isAccepted()) {
			if (typeof keyboardEvent.preventDefault === "function")
				keyboardEvent.preventDefault();
			return;
		}

		if (type === CEventType.KeyPress && keyboardEvent.key === "Tab") {
			if (this.focusNextWidget(!keyboardEvent.shiftKey))
				keyboardEvent.preventDefault();
		}
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

	#sendMouseEvent(widget: CWidget, type: CEventType, pointerEvent: PointerEvent): boolean {
		const position = this.#canvasPosition(pointerEvent);
		const localPosition = widget.mapFromCanvas(
			position.x(), position.y()
		);

		const event = new CMouseEvent(type, localPosition.x(), localPosition.y(),
				this.#mouseButton(pointerEvent.button), pointerEvent.shiftKey);

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

		const visit = (widget: CWidget): void => {
			if (
				widget.isVisible()
				&& widget.isEnabled()
				&& widget.acceptsTabFocus()
			)
				result.push(widget);

			for (const child of widget.children()) {
				if (child instanceof CWidget)
					visit(child);
			}
		};

		for (const widget of this.#m_topLevelWidgets)
			visit(widget);

		return result;
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
