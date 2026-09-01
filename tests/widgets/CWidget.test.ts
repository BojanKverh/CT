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
import { CPalette } from "../../src/gui/CPalette";

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
		parent1.setFont("18px serif");

		const parent2 = new CWidget();
		parent2.setFont("12px monospace");

		const child = new CWidget(parent1);

		expect(child.font()).toBe("18px serif");

		child.setParent(parent2);

		expect(child.font()).toBe("18px serif");
	});

	test("sets font only on widget by default", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);

		child.setFont("12px Arial");
		parent.setFont("20px Arial");

		expect(parent.font()).toBe("20px Arial");
		expect(child.font()).toBe("12px Arial");
	});

	test("propagates font to descendants", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);
		const grandchild = new CWidget(child);

		parent.setFont("20px Arial", true);

		expect(parent.font()).toBe("20px Arial");
		expect(child.font()).toBe("20px Arial");
		expect(grandchild.font()).toBe("20px Arial");
	});

	test("propagates font even when widget already has same font", () => {
		const parent = new CWidget();
		const child = new CWidget(parent);

		parent.setFont("20px Arial");
		child.setFont("12px Arial");

		parent.setFont("20px Arial", true);

		expect(parent.font()).toBe("20px Arial");
		expect(child.font()).toBe("20px Arial");
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
});