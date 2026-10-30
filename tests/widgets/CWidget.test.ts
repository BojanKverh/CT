import { CSizePolicy, CSizePolicyType } from "../../src/geometry/CSizePolicy.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication";
import { CWidget } from "../../src/widgets/CWidget";
import { vi } from "vitest";
import { CPainter } from "../../src/painting/CPainter";
import { CPaintDevice } from "../../src/painting/CPaintDevice";
import { CPaintEngine } from "../../src/painting/CPaintEngine";
import { CEventType } from "../../src/events/CEvent";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { createTestCanvas } from "../helpers/createTestCanvas";
import { TestPaintEngine } from "../helpers/createTestPaintEngine";
import { CLayout } from "../../src/layouts/CLayout";
import { CFormLayout } from "../../src/layouts/CFormLayout";
import { CSize } from "../../src/geometry/CSize";
import { CPoint } from "../../src/geometry/CPoint";
import { CPalette } from "../../src/gui/CPalette";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy";
import { CContextMenuEvent, CContextMenuReason } from "../../src/events/CContextMenuEvent";
import { CFont } from "../../src/gui/CFont";

let animationFrameCallbacks = new Map<number, FrameRequestCallback>();
let nextAnimationFrameId = 1;

class TestLayout extends CLayout {
	updateCalls = 0;

	override update(): void {
		++this.updateCalls;
	}
	
	override sizeHint(): CSize {
		return new CSize(0, 0);
	}
}

function installAnimationFrameMock(): void {
	animationFrameCallbacks = new Map<number, FrameRequestCallback>();
	nextAnimationFrameId = 1;

	globalThis.requestAnimationFrame = (
		callback: FrameRequestCallback
	): number => {
		const id = nextAnimationFrameId++;

		animationFrameCallbacks.set(id, callback);

		return id;
	};

	globalThis.cancelAnimationFrame = (
		handle: number
	): void => {
		animationFrameCallbacks.delete(handle);
	};
}

function pendingAnimationFrameCount(): number {
	return animationFrameCallbacks.size;
}

function runNextAnimationFrame(): void {
	const entry = animationFrameCallbacks.entries().next();

	if (entry.done)
		return;

	const [id, callback] = entry.value;

	animationFrameCallbacks.delete(id);

	callback(0);
}

beforeEach(() => {
	installAnimationFrameMock();

	new CApplication(createTestCanvas());

	CApplication.instance().startUpdates();

	/*
	 * startUpdates() schedules the initial repaint.
	 * Execute it so each test starts with no pending frame.
	 */
	runNextAnimationFrame();
});

afterEach(() => {
	if (CApplication.exists())
		CApplication.instance().destroy();
});

class TestPaintDevice extends CPaintDevice {
	readonly engine = new TestPaintEngine();

	width(): number {
		return 800;
	}

	height(): number {
		return 600;
	}

	paintEngine(): CPaintEngine {
		return this.engine;
	}
}

class TestWidget extends CWidget {
	paintEventCalled = false;

	protected override paintEvent(_painter: CPainter): void {
		this.paintEventCalled = true;
	}
}

class ContextMenuWidget extends CWidget {
	contextMenuEventCalled = false;
	lastContextMenuEvent: CContextMenuEvent | null = null;
	acceptContextMenu = false;

	protected override contextMenuEvent(
		event: CContextMenuEvent): void {
		this.contextMenuEventCalled = true;
		this.lastContextMenuEvent = event;

		if (this.acceptContextMenu)
			event.accept();
		else
			event.ignore();
	}
}

function createPainter(): {
	painter: CPainter;
	device: TestPaintDevice;
} {
	const device = new TestPaintDevice();

	return {
		painter: new CPainter(device),
		device
	};
}

describe("CWidget", () => {
	test("creates a widget without a parent", () => {
		const widget = new CWidget();

		expect(widget.parent()).toBeNull();
		expect(widget.children()).toHaveLength(0);
	});

	test("creates a widget with a parent", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);

		expect(child.parent()).toBe(parent);
		expect(parent.children()).toContain(child);
	});

	test("has empty geometry by default", () => {
		const widget = new CWidget();

		expect(widget.x()).toBe(0);
		expect(widget.y()).toBe(0);
		expect(widget.width()).toBe(0);
		expect(widget.height()).toBe(0);
	});

	test("sets widget geometry", () => {
		const widget = new CWidget();

		widget.setGeometry(10, 20, 100, 50);

		expect(widget.x()).toBe(10);
		expect(widget.y()).toBe(20);
		expect(widget.width()).toBe(100);
		expect(widget.height()).toBe(50);
	});

	test("moves a widget without changing its size", () => {
		const widget = new CWidget();

		widget.setGeometry(10, 20, 100, 50);
		widget.move(30, 40);

		expect(widget.x()).toBe(30);
		expect(widget.y()).toBe(40);
		expect(widget.width()).toBe(100);
		expect(widget.height()).toBe(50);
	});

	test("resizes a widget without changing its position", () => {
		const widget = new CWidget();

		widget.setGeometry(10, 20, 100, 50);
		widget.resize(200, 150);

		expect(widget.x()).toBe(10);
		expect(widget.y()).toBe(20);
		expect(widget.width()).toBe(200);
		expect(widget.height()).toBe(150);
	});

	test("returns widget geometry", () => {
		const widget = new CWidget();

		widget.setGeometry(10, 20, 100, 50);

		const geometry = widget.geometry();

		expect(geometry.x()).toBe(10);
		expect(geometry.y()).toBe(20);
		expect(geometry.width()).toBe(100);
		expect(geometry.height()).toBe(50);
	});

	test("returns a copy of widget geometry", () => {
		const widget = new CWidget();

		widget.setGeometry(10, 20, 100, 50);

		const geometry = widget.geometry();
		geometry.setGeometry(30, 40, 200, 150);

		expect(widget.x()).toBe(10);
		expect(widget.y()).toBe(20);
		expect(widget.width()).toBe(100);
		expect(widget.height()).toBe(50);
	});

	test("is visible by default", () => {
		const widget = new CWidget();

		expect(widget.isVisible()).toBe(true);
	});

	test("changes visibility", () => {
		const widget = new CWidget();

		widget.setVisible(false);
		expect(widget.isVisible()).toBe(false);

		widget.setVisible(true);
		expect(widget.isVisible()).toBe(true);
	});

	test("hides a widget", () => {
		const widget = new CWidget();

		widget.hide();

		expect(widget.isVisible()).toBe(false);
	});

	test("shows a hidden widget", () => {
		const widget = new CWidget();

		widget.hide();
		widget.show();

		expect(widget.isVisible()).toBe(true);
	});

	test("is enabled by default", () => {
		const widget = new CWidget();

		expect(widget.isEnabled()).toBe(true);
	});

	test("changes enabled state", () => {
		const widget = new CWidget();

		widget.setEnabled(false);
		expect(widget.isEnabled()).toBe(false);

		widget.setEnabled(true);
		expect(widget.isEnabled()).toBe(true);
	});

	test("reparents a widget", () => {
		const parent1 = new CWidget();
		const parent2 = new CWidget();
		const child = new CWidget(parent1);

		child.setParent(parent2);

		expect(child.parent()).toBe(parent2);
		expect(parent1.children()).not.toContain(child);
		expect(parent2.children()).toContain(child);
	});

	test("keeps child geometry relative to its parent", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);

		parent.setGeometry(100, 50, 400, 300);
		child.setGeometry(20, 30, 100, 40);

		parent.move(200, 150);

		expect(child.x()).toBe(20);
		expect(child.y()).toBe(30);
		expect(child.width()).toBe(100);
		expect(child.height()).toBe(40);
	});

	test("keeps child geometry unchanged when reparented", () => {
		const parent1 = new CWidget();
		const parent2 = new CWidget();
		const child = new CWidget(parent1);

		child.setGeometry(20, 30, 100, 40);
		child.setParent(parent2);

		expect(child.x()).toBe(20);
		expect(child.y()).toBe(30);
		expect(child.width()).toBe(100);
		expect(child.height()).toBe(40);
	});

	test("renders a visible widget", () => {
		const widget = new TestWidget();
		const { painter } = createPainter();
		widget.render(painter);
		expect(widget.paintEventCalled).toBe(true);
	});

	test("does not render a hidden widget", () => {
		const widget = new TestWidget();
		const { painter } = createPainter();
		widget.hide();
		widget.render(painter);
		expect(widget.paintEventCalled).toBe(false);
	});

	test("saves and restores painter state when rendering", () => {
		const widget = new TestWidget();
		const { painter, device } = createPainter();
		widget.render(painter);
		expect(device.engine.save).toHaveBeenCalledOnce();
		expect(device.engine.restore).toHaveBeenCalledOnce();
	});

	test("translates painter to widget position", () => {
		const widget = new TestWidget();
		const { painter, device } = createPainter();
		widget.setGeometry(50, 70, 200, 100);
		widget.render(painter);
		expect(device.engine.translate).toHaveBeenCalledWith(50, 70);
	});

	test("renders child widgets", () => {
		const parent = new TestWidget();
		const child = new TestWidget(parent);
		const { painter } = createPainter();
		parent.render(painter);
		expect(parent.paintEventCalled).toBe(true);
		expect(child.paintEventCalled).toBe(true);
	});

	test("does not render children of a hidden widget", () => {
		const parent = new TestWidget();
		const child = new TestWidget(parent);
		const { painter } = createPainter();
		parent.hide();
		parent.render(painter);
		expect(parent.paintEventCalled).toBe(false);
		expect(child.paintEventCalled).toBe(false);
	});

	test("applies relative translations through widget hierarchy", () => {
		const parent = new TestWidget();
		const child = new TestWidget(parent);
		const { painter, device } = createPainter();
		parent.setGeometry(100, 50, 400, 300);
		child.setGeometry(20, 30, 100, 40);
		parent.render(painter);
		expect(device.engine.translate).toHaveBeenNthCalledWith(
			1, 100, 50 );

		expect(device.engine.translate).toHaveBeenNthCalledWith(
		2, 20, 30 );
	});

	test("saves and restores painter state for every widget", () => {
		const parent = new TestWidget();
		const child1 = new TestWidget(parent);
		const child2 = new TestWidget(parent);
		const { painter, device } = createPainter();
		parent.render(painter);
		expect(device.engine.save).toHaveBeenCalledTimes(3);
		expect(device.engine.restore).toHaveBeenCalledTimes(3);
	});

	test("renders children in insertion order", () => {
		const renderOrder: string[] = [];
		class OrderedWidget extends CWidget {
			constructor(
				private readonly name: string,
				parent: CWidget | null = null
			) {
				super(parent);
			}

			protected override paintEvent(_painter: CPainter): void {
				renderOrder.push(this.name);
			}
		}

		const parent = new OrderedWidget("parent");
		new OrderedWidget("child1", parent);
		new OrderedWidget("child2", parent);
		new OrderedWidget("child3", parent);

		const { painter } = createPainter();

		parent.render(painter);

		expect(renderOrder).toEqual([
			"parent", "child1", "child2", "child3"
		]);
	});

	test("restores painter state when paintEvent throws", () => {
			class ThrowingWidget extends CWidget {
				protected override paintEvent(_painter: CPainter): void {
					throw new Error("Paint failed");
				}
			}

			const widget = new ThrowingWidget();
			const { painter, device } = createPainter();

			expect(() => {
				widget.render(painter);
			}).toThrow("Paint failed");

			expect(device.engine.save).toHaveBeenCalledOnce();
			expect(device.engine.restore).toHaveBeenCalledOnce();
		});

		test("update requests a repaint", () => {
		const widget = new CWidget();

		expect(pendingAnimationFrameCount()).toBe(0);

		widget.update();

		expect(pendingAnimationFrameCount()).toBe(1);
	});

	test("multiple updates are coalesced into one repaint", () => {
		const widget = new CWidget();
		widget.update();
		widget.update();
		widget.update();
		expect(pendingAnimationFrameCount()).toBe(1);
	});

	test("setGeometry requests a repaint when geometry changes", () => {
		const widget = new CWidget();
		widget.setGeometry(10, 20, 100, 50);
		expect(pendingAnimationFrameCount()).toBe(1);
	});

	test("setGeometry does not request a repaint when geometry is unchanged", () => {
		const widget = new CWidget();
		widget.setGeometry(10, 20, 100, 50);
		runNextAnimationFrame();
		expect(pendingAnimationFrameCount()).toBe(0);
		widget.setGeometry(10, 20, 100, 50);
		expect(pendingAnimationFrameCount()).toBe(0);
	});

	test("move requests a repaint when position changes", () => {
		const widget = new CWidget();
		widget.setGeometry(10, 20, 100, 50);
		runNextAnimationFrame();
		widget.move(30, 40);
		expect(pendingAnimationFrameCount()).toBe(1);
	});

	test("move does not request a repaint when position is unchanged", () => {
		const widget = new CWidget();
		widget.setGeometry(10, 20, 100, 50);
		runNextAnimationFrame();
		widget.move(10, 20);
		expect(pendingAnimationFrameCount()).toBe(0);
	});

	test("resize requests a repaint when size changes", () => {
		const widget = new CWidget();
		widget.setGeometry(10, 20, 100, 50);
		runNextAnimationFrame();
		widget.resize(200, 150);
		expect(pendingAnimationFrameCount()).toBe(1);
	});

	test("resize does not request a repaint when size is unchanged", () => {
		const widget = new CWidget();
		widget.setGeometry(10, 20, 100, 50);
		runNextAnimationFrame();
		widget.resize(100, 50);
		expect(pendingAnimationFrameCount()).toBe(0);
	});

	test("setVisible requests a repaint when visibility changes", () => {
		const widget = new CWidget();
		widget.setVisible(false);
		expect(pendingAnimationFrameCount()).toBe(1);
	});

	test("setVisible does not request a repaint when visibility is unchanged", () => {
		const widget = new CWidget();
		widget.setVisible(true);
		expect(pendingAnimationFrameCount()).toBe(0);
	});

	test("hide requests a repaint", () => {
		const widget = new CWidget();
		widget.hide();
		expect(pendingAnimationFrameCount()).toBe(1);
	});

	test("show requests a repaint when showing a hidden widget", () => {
		const widget = new CWidget();
		widget.hide();
		runNextAnimationFrame();
		widget.show();
		expect(pendingAnimationFrameCount()).toBe(1);
	});

	test("setEnabled requests a repaint when enabled state changes", () => {
		const widget = new CWidget();
		widget.setEnabled(false);
		expect(pendingAnimationFrameCount()).toBe(1);
	});

	test("setEnabled does not request a repaint when state is unchanged", () => {
		const widget = new CWidget();
		widget.setEnabled(true);
		expect(pendingAnimationFrameCount()).toBe(0);
	});

	test("dispatches mouse press event to mousePressEvent", () => {
		class MousePressWidget extends CWidget {
			mousePressCalled = false;

			protected override mousePressEvent(event: CMouseEvent): void {
				this.mousePressCalled = true;
				event.accept();
			}
		}

		const widget = new MousePressWidget();
		const event = new CMouseEvent(CEventType.MousePress, 10,
			20, CMouseButton.LeftButton);

		const handled = widget.event(event);

		expect(widget.mousePressCalled).toBe(true);
		expect(handled).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("dispatches mouse release event to mouseReleaseEvent", () => {
		class MouseReleaseWidget extends CWidget {
			mouseReleaseCalled = false;

			protected override mouseReleaseEvent(event: CMouseEvent): void {
				this.mouseReleaseCalled = true;
				event.accept();
			}
		}

		const widget = new MouseReleaseWidget();
		const event = new CMouseEvent(CEventType.MouseRelease, 10,
			20, CMouseButton.LeftButton
		);

		const handled = widget.event(event);

		expect(widget.mouseReleaseCalled).toBe(true);
		expect(handled).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("dispatches mouse move event to mouseMoveEvent", () => {
		class MouseMoveWidget extends CWidget {
			mouseMoveCalled = false;

			protected override mouseMoveEvent(event: CMouseEvent): void {
				this.mouseMoveCalled = true;
				event.accept();
			}
		}

		const widget = new MouseMoveWidget();
		const event = new CMouseEvent(CEventType.MouseMove, 10,
			20, CMouseButton.NoButton);

		const handled = widget.event(event);

		expect(widget.mouseMoveCalled).toBe(true);
		expect(handled).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("default mouse press handler ignores event", () => {
		const widget = new CWidget();

		const event = new CMouseEvent(CEventType.MousePress, 10,
			20, CMouseButton.LeftButton );

		const handled = widget.event(event);

		expect(handled).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("default mouse release handler ignores event", () => {
		const widget = new CWidget();

		const event = new CMouseEvent(CEventType.MouseRelease, 10,
			20, CMouseButton.LeftButton);

		const handled = widget.event(event);

		expect(handled).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("default mouse move handler ignores event", () => {
		const widget = new CWidget();

		const event = new CMouseEvent(CEventType.MouseMove, 10,
			20, CMouseButton.NoButton);

		const handled = widget.event(event);

		expect(handled).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("returns false for an unsupported event type", () => {
		const widget = new CWidget();

		const event = { type: () => 999, isAccepted: () => true
			} as unknown as CMouseEvent;

		expect(widget.event(event)).toBe(false);
	});

	test("mouse handler can explicitly ignore event", () => {
		class IgnoringWidget extends CWidget {
			protected override mousePressEvent(event: CMouseEvent): void {
				event.ignore();
			}
		}

		const widget = new IgnoringWidget();

		const event = new CMouseEvent(CEventType.MousePress, 10,
			20, CMouseButton.LeftButton);

		const handled = widget.event(event);

		expect(handled).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("mouse handler receives event coordinates and button", () => {
		class InspectingWidget extends CWidget {
			receivedX: number | null = null;
			receivedY: number | null = null;
			receivedButton: CMouseButton | null = null;

			protected override mousePressEvent(event: CMouseEvent): void {
				this.receivedX = event.x();
				this.receivedY = event.y();
				this.receivedButton = event.button();
				event.accept();
			}
		}

		const widget = new InspectingWidget();
		
		const event = new CMouseEvent(CEventType.MousePress, 42,
			73, CMouseButton.RightButton
		);

		widget.event(event);

		expect(widget.receivedX).toBe(42);
		expect(widget.receivedY).toBe(73);
		expect(widget.receivedButton).toBe(CMouseButton.RightButton);
	});

	test("clips rendering to widget rectangle", () => {
		const widget = new TestWidget();
		const { painter, device } = createPainter();

		widget.setGeometry(10, 20, 100, 50);
		widget.render(painter);

		expect(device.engine.clipRect).toHaveBeenCalledWith(
			0, 0, 100, 50
		);
	});

	test("clips both parent and child during rendering", () => {
		const parent = new TestWidget();
		parent.setGeometry(10, 20, 100, 80);

		const child = new TestWidget(parent);
		child.setGeometry(70, 50, 100, 100);

		const { painter, device } = createPainter();

		parent.render(painter);

		expect(device.engine.clipRect).toHaveBeenNthCalledWith(
			1, 0, 0, 100, 80
		);
		expect(device.engine.clipRect).toHaveBeenNthCalledWith(
			2, 0, 0, 100, 100
		);
	});

	test("keeps its font when reparented", () => {
		const parent1 = new CWidget();
		parent1.setFont(new CFont("serif", 18));

		const parent2 = new CWidget();
		parent2.setFont(new CFont("monospace", 12));

		const child = new CWidget(parent1);

		expect(child.font().toCss()).toBe("18px serif");

		child.setParent(parent2);

		expect(child.font().toCss()).toBe("18px serif");
	});

	test("sets font only on widget by default", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);

		child.setFont(new CFont("Arial", 12));
		parent.setFont(new CFont("Arial", 20));

		expect(parent.font().toCss()).toBe("20px Arial");
		expect(child.font().toCss()).toBe("12px Arial");
	});

	test("propagates font to descendants", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);
		const grandchild = new CWidget(child);

		parent.setFont(new CFont("Arial", 20), true);

		expect(parent.font().toCss()).toBe("20px Arial");
		expect(child.font().toCss()).toBe("20px Arial");
		expect(grandchild.font().toCss()).toBe("20px Arial");
	});

	test("propagates font even when widget already has same font", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);

		parent.setFont(new CFont("Arial", 20));
		child.setFont(new CFont("Arial", 12));

		parent.setFont(new CFont("Arial", 20), true);

		expect(parent.font().toCss()).toBe("20px Arial");
		expect(child.font().toCss()).toBe("20px Arial");
	});

	test("returns an independent font copy", () => {
		const widget = new CWidget();
		widget.setFont(new CFont("Arial", 16));

		const font = widget.font();
		font.setPixelSize(24);

		expect(widget.font().pixelSize()).toBe(16);
	});

	test("dispatches mouse enter event to mouseEnterEvent", () => {
		class MouseEnterWidget extends CWidget {
			mouseEnterCalled = false;

			protected override mouseEnterEvent(
				event: CMouseEvent
			): void {
				this.mouseEnterCalled = true;
				event.accept();
			}
		}

		const widget = new MouseEnterWidget();

		const event = new CMouseEvent(
			CEventType.MouseEnter, 10, 20,
			CMouseButton.NoButton
		);

		const handled = widget.event(event);

		expect(widget.mouseEnterCalled).toBe(true);
		expect(handled).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("dispatches mouse leave event to mouseLeaveEvent", () => {
		class MouseLeaveWidget extends CWidget {
			mouseLeaveCalled = false;

			protected override mouseLeaveEvent(
				event: CMouseEvent
			): void {
				this.mouseLeaveCalled = true;
				event.accept();
			}
		}

		const widget = new MouseLeaveWidget();

		const event = new CMouseEvent(
			CEventType.MouseLeave, 10, 20,
			CMouseButton.NoButton
		);

		const handled = widget.event(event);

		expect(widget.mouseLeaveCalled).toBe(true);
		expect(handled).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("default mouse enter handler ignores event", () => {
		const widget = new CWidget();

		const event = new CMouseEvent(
			CEventType.MouseEnter, 10, 20,
			CMouseButton.NoButton
		);

		expect(widget.event(event)).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("default mouse leave handler ignores event", () => {
		const widget = new CWidget();

		const event = new CMouseEvent(
			CEventType.MouseLeave, 10, 20,
			CMouseButton.NoButton
		);

		expect(widget.event(event)).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("is enabled by default", () => {
		const widget = new CWidget();

		expect(widget.isEnabled()).toBe(true);
	});

	test("changes enabled state", () => {
		const widget = new CWidget();

		widget.setEnabled(false);

		expect(widget.isEnabled()).toBe(false);

		widget.setEnabled(true);

		expect(widget.isEnabled()).toBe(true);
	});

	test("disabled widget ignores mouse press event", () => {
		class PressWidget extends CWidget {
			pressCalls = 0;

			protected override mousePressEvent(
				event: CMouseEvent
			): void {
				++this.pressCalls;
				event.accept();
			}
		}

		const widget = new PressWidget();
		widget.setEnabled(false);

		const event = new CMouseEvent(
			CEventType.MousePress, 10, 10,
			CMouseButton.LeftButton
		);

		const handled = widget.event(event);

		expect(widget.pressCalls).toBe(0);
		expect(handled).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("disabled widget remains part of hit testing", () => {
		const parent = new CWidget();
		parent.resize(300, 200);

		const child = new CWidget(parent);
		child.setGeometry(20, 20, 100, 80);
		child.setEnabled(false);

		expect(parent.widgetAt(50, 50)).toBe(child);
	});

	test("mouse event can bubble past a disabled child", () => {
		let parentCalls = 0;
		let childCalls = 0;

		class ParentWidget extends CWidget {
			protected override mousePressEvent(
				event: CMouseEvent
			): void {
				++parentCalls;
				event.accept();
			}
		}

		class ChildWidget extends CWidget {
			protected override mousePressEvent(
				event: CMouseEvent
			): void {
				++childCalls;
				event.accept();
			}
		}

		const parent = new ParentWidget();
		parent.resize(300, 200);

		const child = new ChildWidget(parent);
		child.setGeometry(20, 20, 100, 80);
		child.setEnabled(false);

		let target: CWidget | null = parent.widgetAt(50, 50);

		while (target !== null) {
			const event = new CMouseEvent(
				CEventType.MousePress, 10, 10,
				CMouseButton.LeftButton
			);

			if (target.event(event))
				break;

			target = target.parent();
		}

		expect(childCalls).toBe(0);
		expect(parentCalls).toBe(1);
	});

	test("dispatches key press event to keyPressEvent", () => {
		class KeyPressWidget extends CWidget {
			keyPressCalled = false;

			protected override keyPressEvent(
				event: CKeyEvent
			): void {
				this.keyPressCalled = true;
				event.accept();
			}
		}

		const widget = new KeyPressWidget();

		const event = new CKeyEvent(
			CEventType.KeyPress, "Enter"
		);

		const handled = widget.event(event);

		expect(widget.keyPressCalled).toBe(true);
		expect(handled).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("dispatches key release event to keyReleaseEvent", () => {
		class KeyReleaseWidget extends CWidget {
			keyReleaseCalled = false;

			protected override keyReleaseEvent(
				event: CKeyEvent
			): void {
				this.keyReleaseCalled = true;
				event.accept();
			}
		}

		const widget = new KeyReleaseWidget();

		const event = new CKeyEvent(
			CEventType.KeyRelease, "Enter"
		);

		const handled = widget.event(event);

		expect(widget.keyReleaseCalled).toBe(true);
		expect(handled).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("default key press handler ignores event", () => {
		const widget = new CWidget();

		const event = new CKeyEvent(
			CEventType.KeyPress, "Enter"
		);

		expect(widget.event(event)).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("default key release handler ignores event", () => {
		const widget = new CWidget();

		const event = new CKeyEvent(
			CEventType.KeyRelease, "Enter"
		);

		expect(widget.event(event)).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("key handler receives key and modifiers", () => {
		class InspectingWidget extends CWidget {
			receivedKey: string | null = null;
			ctrl = false;
			shift = false;

			protected override keyPressEvent(
				event: CKeyEvent
			): void {
				this.receivedKey = event.key();
				this.ctrl = event.ctrl();
				this.shift = event.shift();
				event.accept();
			}
		}

		const widget = new InspectingWidget();

		widget.event(new CKeyEvent(
			CEventType.KeyPress, "A",
			true, true
		));

		expect(widget.receivedKey).toBe("A");
		expect(widget.ctrl).toBe(true);
		expect(widget.shift).toBe(true);
	});

	test("has 0x0 minimum size by default", () => {
		const widget = new CWidget();

		expect(widget.minimumSize().width()).toBe(0);
		expect(widget.minimumSize().height()).toBe(0);
	});

	test("sets minimum size", () => {
		const widget = new CWidget();

		widget.setMinimumSize(100, 50);

		expect(widget.minimumSize().width()).toBe(100);
		expect(widget.minimumSize().height()).toBe(50);
	});

	test("minimumSize returns a copy", () => {
		const widget = new CWidget();
		widget.setMinimumSize(100, 50);

		const size = widget.minimumSize();
		size.resize(200, 100);

		expect(widget.minimumSize().width()).toBe(100);
		expect(widget.minimumSize().height()).toBe(50);
	});

	test("setting minimum size updates parent layout", () => {
		const parent = new CWidget();
		const layout = new TestLayout();
		parent.setLayout(layout);

		const child = new CWidget(parent);

		const before = layout.updateCalls;
		child.setMinimumSize(100, 50);

		expect(layout.updateCalls).toBe(before + 1);
	});

	test("setting same minimum size does not update parent layout", () => {
		const parent = new CWidget();
		const layout = new TestLayout();
		parent.setLayout(layout);

		const child = new CWidget(parent);
		child.setMinimumSize(100, 50);

		const before = layout.updateCalls;
		child.setMinimumSize(100, 50);

		expect(layout.updateCalls).toBe(before);
	});

	test("has zero size hint by default", () => {
		const widget = new CWidget();

		expect(widget.sizeHint().width()).toBe(0);
		expect(widget.sizeHint().height()).toBe(0);
	});

	test("sizeHint can be overridden", () => {
		class HintWidget extends CWidget {
			override sizeHint(): CSize {
				return new CSize(120, 40);
			}
		}

		const widget = new HintWidget();

		expect(widget.sizeHint().width()).toBe(120);
		expect(widget.sizeHint().height()).toBe(40);
	});

	test("sets palette only on widget by default", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);

		const parentPalette = new CPalette();
		const childPalette = new CPalette();

		child.setPalette(childPalette);
		parent.setPalette(parentPalette);

		expect(parent.palette()).toStrictEqual(parentPalette);
		expect(child.palette()).toStrictEqual(childPalette);
	});

	test("propagates palette to children", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);
		const grandchild = new CWidget(child);

		const palette = new CPalette();
		parent.setPalette(palette, true);

		expect(parent.palette()).toStrictEqual(palette);
		expect(child.palette()).toStrictEqual(palette);
		expect(grandchild.palette()).toStrictEqual(palette);
	});

	test("propagates palette even when widget already has same palette", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);

		const palette = new CPalette();
		const otherPalette = new CPalette();

		parent.setPalette(palette);
		child.setPalette(otherPalette);
		parent.setPalette(palette, true);

		expect(parent.palette()).toStrictEqual(palette);
		expect(child.palette()).toStrictEqual(palette);
	});

	test("has empty tooltip by default", () =>
	{
		const widget = new CWidget();

		expect(widget.toolTip()).toBe("");
	});

	test("sets tooltip", () =>
	{
		const widget = new CWidget();

		widget.setToolTip("Hello");

		expect(widget.toolTip()).toBe("Hello");
	});

	test("clears tooltip", () =>
	{
		const widget = new CWidget();

		widget.setToolTip("Hello");
		widget.setToolTip("");

		expect(widget.toolTip()).toBe("");
	});

	test("sets maximum size", () => {
		const widget = new CWidget();

		widget.setMaximumSize(200, 100);

		expect(widget.maximumSize().width()).toBe(200);
		expect(widget.maximumSize().height()).toBe(100);
	});

	test("maximumSize returns a copy", () => {
		const widget = new CWidget();

		widget.setMaximumSize(200, 100);

		const size = widget.maximumSize();
		size.resize(300, 150);

		expect(widget.maximumSize().width()).toBe(200);
		expect(widget.maximumSize().height()).toBe(100);
	});

	test("does not set maximum size below minimum size", () => {
		const widget = new CWidget();

		widget.setMinimumSize(100, 50);
		widget.setMaximumSize(80, 40);

		expect(widget.maximumSize().width()).toBe(Number.MAX_SAFE_INTEGER);
		expect(widget.maximumSize().height()).toBe(Number.MAX_SAFE_INTEGER);
	});

	test("allows maximum size equal to minimum size", () => {
		const widget = new CWidget();

		widget.setMinimumSize(100, 50);
		widget.setMaximumSize(100, 50);

		expect(widget.maximumSize().width()).toBe(100);
		expect(widget.maximumSize().height()).toBe(50);
	});

	test("does not set minimum size above maximum size", () => {
		const widget = new CWidget();

		widget.setMaximumSize(100, 50);
		widget.setMinimumSize(120, 60);

		expect(widget.minimumSize().width()).toBe(0);
		expect(widget.minimumSize().height()).toBe(0);
	});

	test("updates geometry after field maximum size changes", () => {
		const parent = new CWidget();
		const field = new CWidget(parent);
		const layout = new CFormLayout();

		parent.resize(300, 100);
		parent.setLayout(layout);

		field.setMinimumSize(50, 20);
		layout.addRow("Field:", field);
		layout.update();

		expect(field.width()).toBeGreaterThan(80);

		field.setMaximumSize(80, 40);

		expect(field.width()).toBe(80);
	});

	test("has NoFocus policy by default", () => {
		const widget = new CWidget();

		expect(widget.focusPolicy()).toBe(CFocusPolicy.NoFocus);
	});

	test("sets focus policy", () => {
		const widget = new CWidget();

		widget.setFocusPolicy(CFocusPolicy.ClickFocus);

		expect(widget.focusPolicy()).toBe(
			CFocusPolicy.ClickFocus
		);
	});

	test("NoFocus widget cannot receive focus", () => {
		const widget = new CWidget();

		widget.setFocusPolicy(CFocusPolicy.NoFocus);
		widget.setFocus();

		expect(widget.hasFocus()).toBe(false);
	});

	test("changing focused widget to NoFocus clears focus", () => {
		const widget = new CWidget();

		widget.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget.setFocus();
		expect(widget.hasFocus()).toBe(true);

		widget.setFocusPolicy(CFocusPolicy.NoFocus);
		expect(widget.hasFocus()).toBe(false);
	});

	test("ClickFocus accepts click focus", () => {
		const widget = new CWidget();

		widget.setFocusPolicy(CFocusPolicy.ClickFocus);

		expect(widget.acceptsClickFocus()).toBe(true);
		expect(widget.acceptsTabFocus()).toBe(false);
	});

	test("TabFocus accepts tab focus", () => {
		const widget = new CWidget();

		widget.setFocusPolicy(CFocusPolicy.TabFocus);

		expect(widget.acceptsClickFocus()).toBe(false);
		expect(widget.acceptsTabFocus()).toBe(true);
	});

	test("StrongFocus accepts click and tab focus", () => {
		const widget = new CWidget();

		widget.setFocusPolicy(CFocusPolicy.StrongFocus);

		expect(widget.acceptsClickFocus()).toBe(true);
		expect(widget.acceptsTabFocus()).toBe(true);
	});

	test("NoFocus accepts neither click nor tab focus", () => {
		const widget = new CWidget();

		widget.setFocusPolicy(CFocusPolicy.NoFocus);

		expect(widget.acceptsClickFocus()).toBe(false);
		expect(widget.acceptsTabFocus()).toBe(false);
	});

	test("dispatches context menu event", () => {
		const widget = new ContextMenuWidget();

		const event = new CContextMenuEvent(
			CContextMenuReason.Mouse,
			new CPoint(10, 20),
			new CPoint(100, 200)
		);

		widget.event(event);

		expect(widget.contextMenuEventCalled).toBe(true);
		expect(widget.lastContextMenuEvent).toBe(event);
	});

	test("context menu event is ignored by default", () => {
		const widget = new CWidget();

		const event = new CContextMenuEvent(
			CContextMenuReason.Mouse,
			new CPoint(10, 20),
			new CPoint(100, 200)
		);

		expect(widget.event(event)).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("returns true when context menu event is accepted", () => {
		const widget = new ContextMenuWidget();
		widget.acceptContextMenu = true;

		const event = new CContextMenuEvent(
			CContextMenuReason.Mouse,
			new CPoint(10, 20),
			new CPoint(100, 200)
		);

		expect(widget.event(event)).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("returns false when context menu event is ignored", () => {
		const widget = new ContextMenuWidget();

		const event = new CContextMenuEvent(
			CContextMenuReason.Mouse,
			new CPoint(10, 20),
			new CPoint(100, 200)
		);

		expect(widget.event(event)).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("does not accept drops by default", () => {
		const widget = new CWidget();

		expect(widget.acceptDrops()).toBe(false);
	});

	test("can enable accepting drops", () => {
		const widget = new CWidget();

		widget.setAcceptDrops(true);

		expect(widget.acceptDrops()).toBe(true);
	});

	test("can disable accepting drops", () => {
		const widget = new CWidget();

		widget.setAcceptDrops(true);
		widget.setAcceptDrops(false);

		expect(widget.acceptDrops()).toBe(false);
	});
});

describe("CWidget.setTabOrder", () => {
    function setup() {
        const app = CApplication.instance();
        const root = new CWidget();
        const fields = Array.from({ length: 4 }, () => {
            const widget = new CWidget(root);
            widget.setFocusPolicy(CFocusPolicy.StrongFocus);
            return widget;
        });
        return { app, root, a: fields[0]!, b: fields[1]!, c: fields[2]!, d: fields[3]! };
    }
    function checkChain(app: CApplication, widgets: CWidget[], forward = true): void {
        widgets[0]!.setFocus();
        for (const widget of [...widgets.slice(1), widgets[0]!]) {
            expect(app.focusNextWidget(forward)).toBe(true);
            expect(app.focusWidget()).toBe(widget);
        }
    }
    test("default order follows the widget tree", () => {
        const { app, a, b, c, d } = setup();
        checkChain(app, [a, b, c, d]);
    });
    test("moves the second widget after the first and preserves the others", () => {
        const { app, a, b, c, d } = setup();
        a.setFocus();
        CWidget.setTabOrder(a, c);
        expect(app.focusWidget()).toBe(a);
        checkChain(app, [a, c, b, d]);
        checkChain(app, [a, d, b, c], false);
    });
    test("sequential calls define a complete custom chain", () => {
        const { app, a, b, c, d } = setup();
        CWidget.setTabOrder(d, b);
        CWidget.setTabOrder(b, a);
        CWidget.setTabOrder(a, c);
        checkChain(app, [d, b, a, c]);
        checkChain(app, [d, c, a, b], false);
    });
    test("repeated calls are idempotent and can replace an earlier order", () => {
        const { app, a, b, c, d } = setup();
        CWidget.setTabOrder(a, c);
        CWidget.setTabOrder(a, c);
        checkChain(app, [a, c, b, d]);
        CWidget.setTabOrder(a, d);
        checkChain(app, [a, d, c, b]);
    });
    test("hidden and disabled fields return to their configured positions", () => {
        const { app, a, b, c, d } = setup();
        c.hide(); b.setEnabled(false);
        CWidget.setTabOrder(a, c);
        checkChain(app, [a, d]);
        c.show(); b.setEnabled(true);
        checkChain(app, [a, c, b, d]);
    });
    test("NoFocus fields retain their configured position", () => {
        const { app, a, b, c, d } = setup();
        c.setFocusPolicy(CFocusPolicy.NoFocus);
        CWidget.setTabOrder(a, c);
        checkChain(app, [a, b, d]);
        c.setFocusPolicy(CFocusPolicy.StrongFocus);
        checkChain(app, [a, c, b, d]);
    });
    test("orders fields in different child containers", () => {
        const { app, root, a, b, c, d } = setup();
        const group = new CWidget(root);
        c.setParent(group);
        CWidget.setTabOrder(a, c);
        checkChain(app, [a, c, b, d]);
        group.hide();
        checkChain(app, [a, b, d]);
    });
    test("identical widgets and different hierarchies leave order unchanged", () => {
        const { app, a, b, c, d } = setup();
        const other = new CWidget();
        const outside = new CWidget(other);
        outside.setFocusPolicy(CFocusPolicy.StrongFocus);
        CWidget.setTabOrder(a, a);
        CWidget.setTabOrder(a, outside);
        checkChain(app, [a, b, c, d, outside]);
    });
    test("destroyed fields are skipped without losing the remaining order", () => {
        const { app, a, b, c, d } = setup();
        CWidget.setTabOrder(a, c);
        c.destroy();
        checkChain(app, [a, b, d]);
    });
    test("widgets added later remain reachable without duplicating existing fields", () => {
        const { app, root, a, b, c, d } = setup();
        CWidget.setTabOrder(a, c);
        const added = new CWidget(root);
        added.setFocusPolicy(CFocusPolicy.StrongFocus);
        checkChain(app, [a, c, b, d, added]);
    });
    test("reparenting a field to another hierarchy discards its old order", () => {
        const { app, a, b, c, d } = setup();
        CWidget.setTabOrder(a, c);
        const other = new CWidget();
        const existing = new CWidget(other);
        existing.setFocusPolicy(CFocusPolicy.StrongFocus);
        c.setParent(other);
        checkChain(app, [a, b, d, existing, c]);
    });
});

describe("CWidget focus proxies", () => {
    function setup() {
        const owner = new CWidget();
        const editor = new CWidget(owner); editor.setFocusPolicy(CFocusPolicy.StrongFocus);
        return { app: CApplication.instance(), owner, editor };
    }
    test("has no proxy by default", () => {
        const { owner } = setup(); expect(owner.focusProxy()).toBeNull(); expect(owner.focusTarget()).toBe(owner);
    });
    test("setFocus redirects to the proxy and both widgets report logical focus", () => {
        const { app, owner, editor } = setup(); owner.setFocusProxy(editor); owner.setFocus();
        expect(owner.focusProxy()).toBe(editor); expect(app.focusWidget()).toBe(editor);
        expect(owner.hasFocus()).toBe(true); expect(editor.hasFocus()).toBe(true);
    });
    test("clearFocus on the owner clears the real editor focus", () => {
        const { app, owner, editor } = setup(); owner.setFocusProxy(editor); editor.setFocus(); owner.clearFocus();
        expect(app.focusWidget()).toBeNull(); expect(editor.hasFocus()).toBe(false); expect(owner.hasFocus()).toBe(false);
    });
    test("proxy chains resolve to their final editor", () => {
        const { app, owner, editor } = setup(); const middle = new CWidget(owner);
        middle.setFocusProxy(editor); owner.setFocusProxy(middle); owner.setFocus();
        expect(app.focusWidget()).toBe(editor); expect(owner.focusTarget()).toBe(editor);
        expect(middle.hasFocus()).toBe(true);
    });
    test("rejects a proxy pointing to itself", () => {
        const { owner } = setup(); expect(() => owner.setFocusProxy(owner)).toThrow(RangeError);
        expect(owner.focusProxy()).toBeNull();
    });
    test("rejects direct and indirect cycles without changing the existing links", () => {
        const { owner, editor } = setup(); const middle = new CWidget(owner);
        owner.setFocusProxy(middle); middle.setFocusProxy(editor);
        expect(() => editor.setFocusProxy(owner)).toThrow(RangeError);
        expect(() => middle.setFocusProxy(owner)).toThrow(RangeError);
        expect(editor.focusProxy()).toBeNull(); expect(owner.focusTarget()).toBe(editor);
    });
    test("rejects a proxy from another hierarchy", () => {
        const { owner } = setup(); const outsider = new CWidget();
        expect(() => owner.setFocusProxy(outsider)).toThrow(RangeError); expect(owner.focusProxy()).toBeNull();
    });
    test("changing the proxy while focused transfers focus to the new target", () => {
        const { app, owner, editor } = setup(); owner.setFocusPolicy(CFocusPolicy.StrongFocus);
        const replacement = new CWidget(owner); replacement.setFocusPolicy(CFocusPolicy.StrongFocus);
        owner.setFocusProxy(editor); owner.setFocus(); owner.setFocusProxy(replacement);
        expect(app.focusWidget()).toBe(replacement); expect(editor.hasFocus()).toBe(false);
    });
    test("removing a proxy restores direct focus to an eligible owner", () => {
        const { app, owner, editor } = setup(); owner.setFocusPolicy(CFocusPolicy.StrongFocus);
        owner.setFocusProxy(editor); owner.setFocus(); owner.setFocusProxy(null);
        expect(owner.focusProxy()).toBeNull(); expect(app.focusWidget()).toBe(owner);
    });
    test("removing a proxy clears focus if the owner has NoFocus", () => {
        const { app, owner, editor } = setup(); owner.setFocusProxy(editor); owner.setFocus(); owner.setFocusProxy(null);
        expect(app.focusWidget()).toBeNull(); expect(owner.hasFocus()).toBe(false);
    });
    test("setting the same proxy does not repeat focus events", () => {
        const { owner, editor } = setup(); owner.setFocusProxy(editor); owner.setFocus();
        const event = vi.spyOn(editor, "event"); owner.setFocusProxy(editor); owner.setFocus();
        expect(event).not.toHaveBeenCalled();
    });
    test("owner focus policies propagate along the proxy chain", () => {
        const { owner, editor } = setup(); const middle = new CWidget(owner);
        middle.setFocusProxy(editor); owner.setFocusProxy(middle); owner.setFocusPolicy(CFocusPolicy.ClickFocus);
        expect(middle.focusPolicy()).toBe(CFocusPolicy.ClickFocus); expect(editor.focusPolicy()).toBe(CFocusPolicy.ClickFocus);
        owner.setFocusPolicy(CFocusPolicy.NoFocus); expect(editor.focusPolicy()).toBe(CFocusPolicy.NoFocus);
        owner.setFocus(); expect(editor.hasFocus()).toBe(false);
    });
    test("setting an unchanged NoFocus policy still propagates to a newly assigned proxy", () => {
        const { owner, editor } = setup(); owner.setFocusProxy(editor); owner.setFocusPolicy(CFocusPolicy.NoFocus);
        expect(editor.focusPolicy()).toBe(CFocusPolicy.NoFocus);
    });
    test("hidden or disabled targets and ancestors prevent focus transfer", () => {
        const { app, owner, editor } = setup(); const other = new CWidget(); other.setFocusPolicy(CFocusPolicy.StrongFocus);
        owner.setFocusProxy(editor); other.setFocus();
        editor.hide(); owner.setFocus(); expect(app.focusWidget()).toBe(other);
        editor.show(); editor.setEnabled(false); owner.setFocus(); expect(app.focusWidget()).toBe(other);
        editor.setEnabled(true); owner.hide(); owner.setFocus(); expect(app.focusWidget()).toBe(other);
        owner.show(); owner.setEnabled(false); owner.setFocus(); expect(app.focusWidget()).toBe(other);
    });
    test("destroying the proxy clears references and actual focus", () => {
        const { app, owner, editor } = setup(); owner.setFocusProxy(editor); owner.setFocus(); editor.destroy();
        expect(owner.focusProxy()).toBeNull(); expect(app.focusWidget()).toBeNull();
        expect(() => owner.setFocusProxy(editor)).toThrow(RangeError);
    });
    test("destroying an owner does not destroy its sibling proxy", () => {
        const root = new CWidget(); const owner = new CWidget(root); const editor = new CWidget(root);
        editor.setFocusPolicy(CFocusPolicy.StrongFocus); owner.setFocusProxy(editor); owner.destroy();
        editor.setFocus(); expect(editor.hasFocus()).toBe(true);
    });
    test("moving a target to another hierarchy removes its old proxy link", () => {
        const { owner, editor } = setup(); const other = new CWidget(); owner.setFocusProxy(editor); editor.setParent(other);
        expect(owner.focusProxy()).toBeNull();
    });
    test("moving the complete composite preserves its internal proxy", () => {
        const { owner, editor } = setup(); owner.setFocusProxy(editor); const other = new CWidget(); owner.setParent(other);
        expect(owner.focusProxy()).toBe(editor); owner.setFocus(); expect(editor.hasFocus()).toBe(true);
    });
});

describe("CWidget size policy", () => {
    test("defaults to Preferred on both axes", () => {
        const policy = new CWidget().sizePolicy();
        expect(policy.horizontalPolicy()).toBe(CSizePolicyType.Preferred);
        expect(policy.verticalPolicy()).toBe(CSizePolicyType.Preferred);
    });
    test("accepts independent horizontal and vertical policies", () => {
        const widget = new CWidget(); widget.setSizePolicy(CSizePolicyType.Expanding, CSizePolicyType.Fixed);
        expect(widget.sizePolicy().horizontalPolicy()).toBe(CSizePolicyType.Expanding);
        expect(widget.sizePolicy().verticalPolicy()).toBe(CSizePolicyType.Fixed);
    });
    test("stores a copy and returns a copy of the size policy", () => {
        const widget = new CWidget(); const policy = new CSizePolicy(); policy.setHorizontalStretch(3);
        widget.setSizePolicy(policy); policy.setHorizontalStretch(9);
        const result = widget.sizePolicy(); result.setVerticalPolicy(CSizePolicyType.Fixed);
        expect(widget.sizePolicy().horizontalStretch()).toBe(3);
        expect(widget.sizePolicy().verticalPolicy()).toBe(CSizePolicyType.Preferred);
    });
    test("policy copy preserves both axes and stretch factors", () => {
        const policy = new CSizePolicy(CSizePolicyType.Maximum, CSizePolicyType.Minimum);
        policy.setHorizontalStretch(2); policy.setVerticalStretch(7); const copy = new CSizePolicy(policy);
        expect(copy.isEqual(policy)).toBe(true); copy.setVerticalStretch(1); expect(copy.isEqual(policy)).toBe(false);
    });
    test("stretch is normalized to integer values from zero through 255", () => {
        const policy = new CSizePolicy(); policy.setHorizontalStretch(-3); policy.setVerticalStretch(999);
        expect(policy.horizontalStretch()).toBe(0); expect(policy.verticalStretch()).toBe(255);
        policy.setHorizontalStretch(4.9); policy.setHorizontalStretch(Number.NaN);
        expect(policy.horizontalStretch()).toBe(4);
    });
    test("policies define the expected grow and shrink capabilities", () => {
        expect(CSizePolicy.canGrow(CSizePolicyType.Fixed)).toBe(false);
        expect(CSizePolicy.canShrink(CSizePolicyType.Fixed)).toBe(false);
        expect(CSizePolicy.canGrow(CSizePolicyType.Minimum)).toBe(true);
        expect(CSizePolicy.canShrink(CSizePolicyType.Minimum)).toBe(false);
        expect(CSizePolicy.canGrow(CSizePolicyType.Maximum)).toBe(false);
        expect(CSizePolicy.canShrink(CSizePolicyType.Maximum)).toBe(true);
        expect(CSizePolicy.isExpanding(CSizePolicyType.Expanding)).toBe(true);
        expect(CSizePolicy.ignoresHint(CSizePolicyType.Ignored)).toBe(true);
    });
});
