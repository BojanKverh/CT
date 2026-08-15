import { CObject } from "./CObject.js";
import type { CWidget } from "../widgets/CWidget.js";
import type { CPaintDevice } from "../painting/CPaintDevice.js";
import { CCanvasPaintDevice } from "../painting/CCanvasPaintDevice.js";
import { CPainter } from "../painting/CPainter.js";
import { CPoint } from "../geometry/CPoint.js";
import { CRect } from "../geometry/CRect.js";
import { CEventType } from "../events/CEvent.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CFocusEvent } from "../events/CFocusEvent.js";

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

	#onPointerDown = (event: PointerEvent): void => {
		this.#dispatchMouseEvent(CEventType.MousePress, event);
	};

	#onPointerUp = (event: PointerEvent): void => {
		this.#dispatchMouseEvent(CEventType.MouseRelease, event);
	};

	#onPointerMove = (event: PointerEvent): void => {
		this.#updateHoverWidget(event);
		this.#dispatchMouseEvent(CEventType.MouseMove, event);
	};

    #onKeyDown = (event: KeyboardEvent): void => {
		this.#dispatchKeyEvent(CEventType.KeyPress, event);
	};

	#onKeyUp = (event: KeyboardEvent): void => {
		this.#dispatchKeyEvent(CEventType.KeyRelease, event);
	};

	constructor(canvas: HTMLCanvasElement) {
		super();

		if (CApplication.#m_instance !== null)
			throw new Error("Only one CApplication instance can exist.");

		this.#m_paintDevice = new CCanvasPaintDevice(canvas);
		CApplication.#m_instance = this;

		canvas.addEventListener("pointerdown", this.#onPointerDown);
		canvas.addEventListener("pointerup", this.#onPointerUp);
		canvas.addEventListener("pointermove", this.#onPointerMove);
        if (typeof window !== "undefined") {
	        window.addEventListener("keydown", this.#onKeyDown);
	        window.addEventListener("keyup", this.#onKeyUp);
        }
	}

    destroy(): void {
		if (CApplication.#m_instance !== this)
			return;

		this.stopUpdates();

		const canvas = this.#m_paintDevice.canvas();
		canvas.removeEventListener("pointerdown", this.#onPointerDown);
		canvas.removeEventListener("pointerup", this.#onPointerUp);
		canvas.removeEventListener("pointermove", this.#onPointerMove);
		if (typeof window !== "undefined") {
			window.removeEventListener("keydown", this.#onKeyDown);
			window.removeEventListener("keyup", this.#onKeyUp);
		}

		this.#m_topLevelWidgets.clear();
		this.#m_mouseGrabber = null;
		this.#m_hoverWidget = null;
        this.#m_focusWidget = null;
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

	#widgetAt(x: number, y: number): CWidget | null {
		const widgets = [...this.#m_topLevelWidgets];

		for (let i = widgets.length - 1; i >= 0; --i) {
			const widget = widgets[i]!;

			const target = widget.widgetAt(
				x - widget.x(), y - widget.y()
			);

			if (target !== null)
				return target;
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
	}

	#dispatchMouseEvent(type: CEventType,
		pointerEvent: PointerEvent): void {
		const position = this.#canvasPosition(pointerEvent);

		let target = this.#m_mouseGrabber;

		if (target === null)
			target = this.#widgetAt(position.x(), position.y());

		while (target !== null) {
			if (this.#sendMouseEvent(target, type, pointerEvent)) {
				if (type === CEventType.MousePress) {
					target.setFocus();
					this.grabMouse(target);
                }

				break;
			}

			target = target.parent();
		}

		if (type === CEventType.MouseRelease)
			this.releaseMouse();
	}

	#dispatchKeyEvent(type: CEventType,
		keyboardEvent: KeyboardEvent): void {
		const target = this.#m_focusWidget;

		if (target === null)
			return;

		const event = new CKeyEvent(type, keyboardEvent.key,
			keyboardEvent.ctrlKey, keyboardEvent.shiftKey,
			keyboardEvent.altKey, keyboardEvent.metaKey
		);

		target.event(event);
	}

	#updateHoverWidget(pointerEvent: PointerEvent): void {
		const position = this.#canvasPosition(pointerEvent);
		const widget = this.#widgetAt(position.x(), position.y());

		if (widget === this.#m_hoverWidget)
			return;

		const oldWidget = this.#m_hoverWidget;
		this.#m_hoverWidget = widget;

		if (oldWidget !== null)
			this.#sendMouseEvent(
				oldWidget, CEventType.MouseLeave, pointerEvent
			);

		if (widget !== null)
			this.#sendMouseEvent(
				widget, CEventType.MouseEnter, pointerEvent
			);
	}

	#sendMouseEvent(widget: CWidget, type: CEventType,
		pointerEvent: PointerEvent): boolean {
		const position = this.#canvasPosition(pointerEvent);
		const localPosition = widget.mapFromCanvas(
			position.x(), position.y()
		);

		const event = new CMouseEvent(
			type, localPosition.x(), localPosition.y(),
			this.#mouseButton(pointerEvent.button)
		);

		return widget.event(event);
	}
}
