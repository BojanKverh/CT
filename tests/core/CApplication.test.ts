import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication";
import { CWidget } from "../../src/widgets/CWidget";
import { CPainter } from "../../src/painting/CPainter";
import { CMouseEvent } from "../../src/events/CMouseEvent";
import { CFocusEvent } from "../../src/events/CFocusEvent";
import { CKeyEvent } from "../../src/events/CKeyEvent";
import { createTestCanvas } from "../helpers/createTestCanvas";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { CHBoxLayout } from "../../src/layouts/CHBoxLayout.js";
import { CPopupWidget } from "../../src/widgets/CPopupWidget.js";
import { CDialog } from "../../src/dialogs/CDialog.js";

class RenderTrackingWidget extends CWidget {
    renderCalls = 0;

    override render(painter: CPainter): void {
        ++this.renderCalls;

        super.render(painter);
    }
}

let animationFrameCallbacks = new Map<number, FrameRequestCallback>();
let nextAnimationFrameId = 1;

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

	Object.defineProperty(globalThis, "window", {
		value: createTestWindow(),
		writable: true,
		configurable: true
	});
});

afterEach(() => {
    if (CApplication.exists())
        CApplication.instance().destroy();
});

describe("CApplication", () => {
	const spacing: number = 6;
	const margin: number = 6;

    test("creates a singleton application", () => {
        const canvas = createTestCanvas();
        const app = new CApplication(canvas);

        expect(CApplication.exists()).toBe(true);
        expect(CApplication.instance()).toBe(app);
    });

    test("stores the canvas", () => {
        const canvas = createTestCanvas();
        const app = new CApplication(canvas);

        expect(app.canvas()).toBe(canvas);
    });

    test("does not allow more than one application instance", () => {
        const canvas1 = createTestCanvas();
        const canvas2 = createTestCanvas();

        const app = new CApplication(canvas1);

        expect(() => {
            new CApplication(canvas2);
        }).toThrow("Only one CApplication instance can exist.");

        expect(CApplication.instance()).toBe(app);
    });

    test("throws when accessing the application instance before creation", () => {
        expect(CApplication.exists()).toBe(false);

        expect(() => {
            CApplication.instance();
        }).toThrow("CApplication has not been created.");
    });

    test("destroy removes the application instance", () => {
        const app = new CApplication(createTestCanvas());

        app.destroy();

        expect(CApplication.exists()).toBe(false);

        expect(() => {
            CApplication.instance();
        }).toThrow();
    });

    test("allows creating a new application after destroy", () => {
        const app1 = new CApplication(createTestCanvas());

        app1.destroy();

        const app2 = new CApplication(createTestCanvas());

        expect(CApplication.instance()).toBe(app2);
        expect(app2).not.toBe(app1);
    });

    test("does not allow creating a widget without an application", () => {
        expect(CApplication.exists()).toBe(false);

        expect(() => {
            new CWidget();
        }).toThrow("CApplication has not been created.");
    });

    test("registers widgets without a parent as top-level widgets", () => {
        const app = new CApplication(createTestCanvas());

        const widget1 = new CWidget();
        const widget2 = new CWidget();

        expect(app.topLevelWidgets()).toEqual([
            widget1,
            widget2
        ]);
    });

    test("does not register child widgets as top-level widgets", () => {
        const app = new CApplication(createTestCanvas());

        const parent = new CWidget();
        const child = new CWidget(parent);

        expect(app.topLevelWidgets()).toEqual([
            parent
        ]);

        expect(app.topLevelWidgets()).not.toContain(child);
    });

    test("removes a top-level widget when it gets a parent", () => {
        const app = new CApplication(createTestCanvas());

        const parent = new CWidget();
        const widget = new CWidget();

        expect(app.topLevelWidgets()).toEqual([
            parent,
            widget
        ]);

        widget.setParent(parent);

        expect(app.topLevelWidgets()).toEqual([
            parent
        ]);
    });

    test("registers a widget as top-level when its parent is removed", () => {
        const app = new CApplication(createTestCanvas());

        const parent = new CWidget();
        const child = new CWidget(parent);

        child.setParent(null);

        expect(app.topLevelWidgets()).toEqual([
            parent,
            child
        ]);
    });

    test("does not duplicate a top-level widget registration", () => {
        const app = new CApplication(createTestCanvas());

        const widget = new CWidget();

        app.registerTopLevelWidget(widget);
        app.registerTopLevelWidget(widget);

        expect(app.topLevelWidgets()).toEqual([
            widget
        ]);
    });

    test("preserves top-level widget registration order", () => {
        const app = new CApplication(createTestCanvas());

        const widget1 = new CWidget();
        const widget2 = new CWidget();
        const widget3 = new CWidget();

        expect(app.topLevelWidgets()).toEqual([
            widget1,
            widget2,
            widget3
        ]);
    });

    test("re-registers a widget at the end after becoming top-level again", () => {
        const app = new CApplication(createTestCanvas());

        const widget1 = new CWidget();
        const widget2 = new CWidget();

        widget1.setParent(widget2);
        widget1.setParent(null);

        expect(app.topLevelWidgets()).toEqual([
            widget2,
            widget1
        ]);
    });

    test("returns a copy of the top-level widget list", () => {
        const app = new CApplication(createTestCanvas());

        const widget1 = new CWidget();
        const widget2 = new CWidget();

        const widgets = app.topLevelWidgets();

        expect(widgets).toEqual([
            widget1,
            widget2
        ]);

        const mutableWidgets = widgets as CWidget[];
        mutableWidgets.length = 0;

        expect(app.topLevelWidgets()).toEqual([
            widget1,
            widget2
        ]);
    });

    test("clears top-level widget registry when destroyed", () => {
        const app = new CApplication(createTestCanvas());

        new CWidget();
        new CWidget();

        expect(app.topLevelWidgets()).toHaveLength(2);

        app.destroy();

        expect(app.topLevelWidgets()).toHaveLength(0);
    });

    test("updates are disabled by default", () => {
        const app = new CApplication(createTestCanvas());

        expect(app.updatesEnabled()).toBe(false);
    });

    test("startUpdates enables updates", () => {
        const app = new CApplication(createTestCanvas());

        app.startUpdates();

        expect(app.updatesEnabled()).toBe(true);
    });

    test("startUpdates schedules the initial repaint", () => {
        const app = new CApplication(createTestCanvas());

        app.startUpdates();

        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("calling startUpdates repeatedly does not schedule additional frames", () => {
        const app = new CApplication(createTestCanvas());

        app.startUpdates();
        app.startUpdates();
        app.startUpdates();

        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("requestRepaint does nothing while updates are disabled", () => {
        const app = new CApplication(createTestCanvas());

        app.requestRepaint();

        expect(pendingAnimationFrameCount()).toBe(0);
    });

    test("coalesces multiple repaint requests into one animation frame", () => {
        const app = new CApplication(createTestCanvas());

        app.startUpdates();

        app.requestRepaint();
        app.requestRepaint();
        app.requestRepaint();

        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("allows another repaint after the current frame completes", () => {
        const app = new CApplication(createTestCanvas());

        app.startUpdates();

        expect(pendingAnimationFrameCount()).toBe(1);

        runNextAnimationFrame();

        expect(pendingAnimationFrameCount()).toBe(0);

        app.requestRepaint();

        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("stopUpdates disables updates", () => {
        const app = new CApplication(createTestCanvas());

        app.startUpdates();
        app.stopUpdates();

        expect(app.updatesEnabled()).toBe(false);
    });

    test("stopUpdates cancels a pending repaint", () => {
        const app = new CApplication(createTestCanvas());

        app.startUpdates();

        expect(pendingAnimationFrameCount()).toBe(1);

        app.stopUpdates();

        expect(pendingAnimationFrameCount()).toBe(0);
    });

    test("requestRepaint is ignored after stopUpdates", () => {
        const app = new CApplication(createTestCanvas());

        app.startUpdates();
        app.stopUpdates();

        app.requestRepaint();

        expect(pendingAnimationFrameCount()).toBe(0);
    });

    test("updates can be started again after being stopped", () => {
        const app = new CApplication(createTestCanvas());

        app.startUpdates();
        app.stopUpdates();

        app.startUpdates();

        expect(app.updatesEnabled()).toBe(true);
        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("destroy stops updates and cancels pending repaint", () => {
        const app = new CApplication(createTestCanvas());

        app.startUpdates();

        expect(app.updatesEnabled()).toBe(true);
        expect(pendingAnimationFrameCount()).toBe(1);

        app.destroy();

        expect(app.updatesEnabled()).toBe(false);
        expect(pendingAnimationFrameCount()).toBe(0);
        expect(CApplication.exists()).toBe(false);
    });

    test("repaint clears the entire paint device", () => {
        const clearRect = vi.fn();
        const context = { save: vi.fn(), restore: vi.fn(),
            translate: vi.fn(), fillRect: vi.fn(),
            strokeRect: vi.fn(), clearRect,
            fillStyle: "",cstrokeStyle: "",
            lineWidth: 1
        } as unknown as CanvasRenderingContext2D;

        const canvas = {width: 800, height: 600,
            getContext: (type: string) => {
                if (type === "2d")
                    return context;

                return null;
            },

            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        } as unknown as HTMLCanvasElement;

        const app = new CApplication(canvas);
        app.startUpdates();
        runNextAnimationFrame();

        expect(clearRect).toHaveBeenCalledOnce();
        expect(clearRect).toHaveBeenCalledWith(0, 0, 800, 600 );
    });

    test("bubbles ignored mouse press event to parent", () => {
        const canvas = createTestCanvas();
        new CApplication(canvas);
        const calls: string[] = [];

        class ParentWidget extends CWidget {
            protected override mousePressEvent(event: CMouseEvent): void {
                calls.push(`parent:${event.x()},${event.y()}`);
                event.accept();
            }
        }

        class ChildWidget extends CWidget {
            protected override mousePressEvent(event: CMouseEvent): void {
                calls.push(`child:${event.x()},${event.y()}`);
                event.ignore();
            }
        }

        const parent = new ParentWidget();
        parent.setGeometry(100, 100, 300, 200);
        const child = new ChildWidget(parent);
        child.setGeometry(50, 40, 100, 80);

        canvas.dispatchEvent({type: "pointerdown", clientX: 180,
            clientY: 160, button: 0} as PointerEvent);

        expect(calls).toEqual(["child:30,20", "parent:80,60"]);
    });

    test("stops mouse event bubbling when child accepts event", () => {
        const canvas = createTestCanvas();
        new CApplication(canvas);

        let parentCalls = 0;
        let childCalls = 0;

        class ParentWidget extends CWidget {
            protected override mousePressEvent(event: CMouseEvent): void {
                ++parentCalls;
                event.accept();
            }
        }

        class ChildWidget extends CWidget {
            protected override mousePressEvent(event: CMouseEvent): void {
                ++childCalls;
                event.accept();
            }
        }

        const parent = new ParentWidget();
        parent.setGeometry(100, 100, 300, 200);

        const child = new ChildWidget(parent);
        child.setGeometry(50, 40, 100, 80);

        canvas.dispatchEvent({type: "pointerdown", clientX: 180,
            clientY: 160, button: 0} as PointerEvent);

        expect(childCalls).toBe(1);
        expect(parentCalls).toBe(0);
    });

	test("accepted mouse press grabs the mouse", () => {
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);

		class PressWidget extends CWidget {
			protected override mousePressEvent(
				event: CMouseEvent
			): void {
				event.accept();
			}
		}

		const widget = new PressWidget();
		widget.setGeometry(100, 100, 200, 100);

		canvas.dispatchEvent({
			type: "pointerdown",
			clientX: 150,
			clientY: 130,
			button: 0
		} as PointerEvent);

		expect(app.mouseGrabber()).toBe(widget);
	});

	test("mouse release is sent to the grabber outside its geometry", () => {
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);

		let releaseCalls = 0;

		class GrabWidget extends CWidget {
			protected override mousePressEvent(
				event: CMouseEvent
			): void {
				event.accept();
			}

			protected override mouseReleaseEvent(
				event: CMouseEvent
			): void {
				++releaseCalls;
				event.accept();
			}
		}

		const widget = new GrabWidget();
		widget.setGeometry(100, 100, 200, 100);

		canvas.dispatchEvent({
			type: "pointerdown",
			clientX: 150,
			clientY: 130,
			button: 0
		} as PointerEvent);

		canvas.dispatchEvent({
			type: "pointerup",
			clientX: 700,
			clientY: 500,
			button: 0
		} as PointerEvent);

		expect(releaseCalls).toBe(1);
	});

	test("mouse release releases the mouse grab", () => {
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);

		class GrabWidget extends CWidget {
			protected override mousePressEvent(
				event: CMouseEvent
			): void {
				event.accept();
			}

			protected override mouseReleaseEvent(
				event: CMouseEvent
			): void {
				event.accept();
			}
		}

		const widget = new GrabWidget();
		widget.setGeometry(100, 100, 200, 100);

		canvas.dispatchEvent({
			type: "pointerdown",
			clientX: 150,
			clientY: 130,
			button: 0
		} as PointerEvent);

		expect(app.mouseGrabber()).toBe(widget);

		canvas.dispatchEvent({
			type: "pointerup",
			clientX: 700,
			clientY: 500,
			button: 0
		} as PointerEvent);

		expect(app.mouseGrabber()).toBeNull();
	});

	test("mouse grab goes to the widget that accepts the press", () => {
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);

		class ParentWidget extends CWidget {
			protected override mousePressEvent(
				event: CMouseEvent
			): void {
				event.accept();
			}
		}

		class ChildWidget extends CWidget {
			protected override mousePressEvent(
				event: CMouseEvent
			): void {
				event.ignore();
			}
		}

		const parent = new ParentWidget();
		parent.setGeometry(100, 100, 300, 200);

		const child = new ChildWidget(parent);
		child.setGeometry(20, 20, 100, 80);

		canvas.dispatchEvent({
			type: "pointerdown",
			clientX: 140,
			clientY: 140,
			button: 0
		} as PointerEvent);

		expect(app.mouseGrabber()).toBe(parent);
	});

	test("updates hover widget when pointer moves between widgets", () => {
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);

		const widget1 = new CWidget();
		widget1.setGeometry(50, 50, 100, 100);

		const widget2 = new CWidget();
		widget2.setGeometry(200, 50, 100, 100);

		canvas.dispatchEvent({
			type: "pointermove",
			clientX: 75,
			clientY: 75,
			button: -1
		} as PointerEvent);

		expect(app.hoverWidget()).toBe(widget1);

		canvas.dispatchEvent({
			type: "pointermove",
			clientX: 225,
			clientY: 75,
			button: -1
		} as PointerEvent);

		expect(app.hoverWidget()).toBe(widget2);

		canvas.dispatchEvent({
			type: "pointermove",
			clientX: 500,
			clientY: 500,
			button: -1
		} as PointerEvent);

		expect(app.hoverWidget()).toBeNull();
	});

	test("sends mouse enter and leave when hover target changes", () => {
		const canvas = createTestCanvas();
		new CApplication(canvas);

		const events: string[] = [];

		class HoverWidget extends CWidget {
			constructor(private readonly name: string) {
				super();
			}

			protected override mouseEnterEvent(
				event: CMouseEvent
			): void {
				events.push(`${this.name}:enter`);
				event.accept();
			}

			protected override mouseLeaveEvent(
				event: CMouseEvent
			): void {
				events.push(`${this.name}:leave`);
				event.accept();
			}
		}

		const widget1 = new HoverWidget("A");
		widget1.setGeometry(50, 50, 100, 100);

		const widget2 = new HoverWidget("B");
		widget2.setGeometry(200, 50, 100, 100);

		canvas.dispatchEvent({
			type: "pointermove",
			clientX: 75,
			clientY: 75,
			button: -1
		} as PointerEvent);

		canvas.dispatchEvent({
			type: "pointermove",
			clientX: 225,
			clientY: 75,
			button: -1
		} as PointerEvent);

		expect(events).toEqual([
			"A:enter",
			"A:leave",
			"B:enter"
		]);
	});

	test("has no focus widget by default", () => {
		const app = new CApplication(createTestCanvas());

		expect(app.focusWidget()).toBeNull();
	});

	test("sets focus widget", () => {
		const app = new CApplication(createTestCanvas());
		const widget = new CWidget();

		app.setFocusWidget(widget);

		expect(app.focusWidget()).toBe(widget);
		expect(widget.hasFocus()).toBe(true);
	});

	test("clears focus widget", () => {
		const app = new CApplication(createTestCanvas());
		const widget = new CWidget();

		app.setFocusWidget(widget);
		app.setFocusWidget(null);

		expect(app.focusWidget()).toBeNull();
		expect(widget.hasFocus()).toBe(false);
	});

	test("sends focus out and focus in when focus changes", () => {
		const app = new CApplication(createTestCanvas());
		const events: string[] = [];

		class FocusWidget extends CWidget {
			constructor(private readonly name: string) {
				super();
			}

			protected override focusInEvent(
				event: CFocusEvent
			): void {
				events.push(`${this.name}:in`);
				event.accept();
			}

			protected override focusOutEvent(
				event: CFocusEvent
			): void {
				events.push(`${this.name}:out`);
				event.accept();
			}
		}

		const widget1 = new FocusWidget("A");
		const widget2 = new FocusWidget("B");

		app.setFocusWidget(widget1);
		app.setFocusWidget(widget2);

		expect(events).toEqual([
			"A:in",
			"A:out",
			"B:in"
		]);
	});

	test("disabled widget cannot take focus", () => {
		const app = new CApplication(createTestCanvas());
		const widget = new CWidget();

		widget.setEnabled(false);
		widget.setFocus();

		expect(app.focusWidget()).toBeNull();
		expect(widget.hasFocus()).toBe(false);
	});

	test("accepted mouse press gives focus to widget", () => {
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);

		class FocusableWidget extends CWidget {
			protected override mousePressEvent(
				event: CMouseEvent
			): void {
				event.accept();
			}
		}

		const widget = new FocusableWidget();
		widget.setGeometry(100, 100, 120, 50);

		canvas.dispatchEvent({
			type: "pointerdown",
			clientX: 120,
			clientY: 120,
			button: 0
		} as PointerEvent);

		expect(app.focusWidget()).toBe(widget);
		expect(widget.hasFocus()).toBe(true);
	});

   	test("does not dispatch key event without focus widget", () => {
		const app = new CApplication(createTestCanvas());

		expect(app.focusWidget()).toBeNull();

		expect(() => {
			window.dispatchEvent({ type: "keydown", key: "Enter",
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: false
			} as unknown as KeyboardEvent);
		}).not.toThrow();
	});

	test("dispatches key press to focus widget", () => {
		const app = new CApplication(createTestCanvas());

		let receivedKey: string | null = null;

		class KeyWidget extends CWidget {
			protected override keyPressEvent(
				event: CKeyEvent
			): void {
				receivedKey = event.key();
				event.accept();
			}
		}

		const widget = new KeyWidget();
		app.setFocusWidget(widget);

		window.dispatchEvent({type: "keydown", key: "Enter", ctrlKey: false,
			shiftKey: false, altKey: false, metaKey: false
		} as unknown as KeyboardEvent);

		expect(receivedKey).toBe("Enter");
	});

	test("dispatches key release to focus widget", () => {
		const app = new CApplication(createTestCanvas());

		let receivedKey: string | null = null;

		class KeyWidget extends CWidget {
			protected override keyReleaseEvent(
				event: CKeyEvent
			): void {
				receivedKey = event.key();
				event.accept();
			}
		}

		const widget = new KeyWidget();
		app.setFocusWidget(widget);

		window.dispatchEvent({ type: "keyup", key: "Enter",
			ctrlKey: false, shiftKey: false,
			altKey: false, metaKey: false
		} as unknown as KeyboardEvent);

		expect(receivedKey).toBe("Enter");
	});

	test("passes keyboard modifiers to focus widget", () => {
		const app = new CApplication(createTestCanvas());

		let ctrl = false;
		let shift = false;
		let alt = false;
		let meta = false;

		class KeyWidget extends CWidget {
			protected override keyPressEvent(
				event: CKeyEvent
			): void {
				ctrl = event.ctrl();
				shift = event.shift();
				alt = event.alt();
				meta = event.meta();
				event.accept();
			}
		}

		const widget = new KeyWidget();
		app.setFocusWidget(widget);

		window.dispatchEvent({
			type: "keydown", key: "A", ctrlKey: true,
			shiftKey: true, altKey: true, metaKey: true
		} as unknown as KeyboardEvent);

		expect(ctrl).toBe(true);
		expect(shift).toBe(true);
		expect(alt).toBe(true);
		expect(meta).toBe(true);
	});

	test("updates layout when canvas size changes", () => {
		const canvas = createTestCanvas(300, 100);
		const app = new CApplication(canvas);

		const parent = new CWidget();
		parent.setGeometry(0, 0, 300, 100);

		const layout = new CHBoxLayout();
		parent.setLayout(layout);

		const widget1 = new CWidget();
		const widget2 = new CWidget();

		layout.addWidget(widget1);
		layout.addWidget(widget2);

		const w = (300 - 2 * margin - spacing) / 2;
		expect(widget1.width()).toBe(w);
		expect(widget2.x()).toBe(margin + w + spacing);
		expect(widget2.width()).toBe(w);

		canvas.width = 600;
		const w2 = (canvas.width - 2 * margin - spacing) / 2;

		parent.resize(canvas.width, canvas.height);

		expect(widget1.width()).toBe(w2);
		expect(widget2.x()).toBe(margin + w2 + spacing);
		expect(widget2.width()).toBe(w2);

		expect(app.canvas().width).toBe(600);
	});

	test("registers popup widgets", () => {
		const app = new CApplication(createTestCanvas());
		const popup = new CPopupWidget();

		app.registerPopupWidget(popup);

		expect(app.popupWidgets()).toEqual([popup]);
	});

	test("does not duplicate registered popup widget", () => {
		const app = new CApplication(createTestCanvas());
		const popup = new CPopupWidget();

		app.registerPopupWidget(popup);
		app.registerPopupWidget(popup);

		expect(app.popupWidgets()).toEqual([popup]);
	});

	test("registering popup again moves it to top", () => {
		const app = new CApplication(createTestCanvas());
		const popup1 = new CPopupWidget();
		const popup2 = new CPopupWidget();

		app.registerPopupWidget(popup1);
		app.registerPopupWidget(popup2);
		app.registerPopupWidget(popup1);

		expect(app.popupWidgets()).toEqual([
			popup2,
			popup1
		]);
	});

	test("unregisters popup widget", () => {
		const app = new CApplication(createTestCanvas());
		const popup1 = new CPopupWidget();
		const popup2 = new CPopupWidget();

		app.registerPopupWidget(popup1);
		app.registerPopupWidget(popup2);

		app.unregisterPopupWidget(popup1);

		expect(app.popupWidgets()).toEqual([popup2]);
	});

	test("unregistering unknown popup does nothing", () => {
		const app = new CApplication(createTestCanvas());
		const popup = new CPopupWidget();

		expect(() => app.unregisterPopupWidget(popup)).not.toThrow();
		expect(app.popupWidgets()).toEqual([]);
	});

	test("returns a copy of popup widget list", () => {
		const app = new CApplication(createTestCanvas());
		const popup = new CPopupWidget();

		app.registerPopupWidget(popup);

		const widgets = app.popupWidgets();
		const mutableWidgets = widgets as CPopupWidget[];

		mutableWidgets.length = 0;

		expect(app.popupWidgets()).toEqual([popup]);
	});

	test("popup receives mouse press before underlying widget", () => {
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);

		const calls: string[] = [];

		class TestWidget extends CWidget {
			constructor(private readonly name: string) {
				super();
			}

			protected override mousePressEvent(event: CMouseEvent): void {
				calls.push(this.name);
				event.accept();
			}
		}

		const widget = new TestWidget("widget");
		widget.setGeometry(100, 100, 200, 100);

		const popup = new CPopupWidget();
		popup.setGeometry(120, 120, 100, 60);
		popup.open();

		class PopupContent extends CWidget {
			protected override mousePressEvent(event: CMouseEvent): void {
				calls.push("popup");
				event.accept();
			}
		}

		const popupContent = new PopupContent(popup);
		popupContent.setGeometry(0, 0, 100, 60);

		canvas.dispatchEvent({
			type: "pointerdown",
			clientX: 150,
			clientY: 140,
			button: 0
		} as PointerEvent);

		expect(calls).toEqual(["popup"]);
		expect(app.popupWidgets()).toEqual([popup]);
	});

	test("click outside top popup closes it", () => {
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);

		const popup = new CPopupWidget();
		popup.setGeometry(100, 100, 120, 80);
		popup.open();

		canvas.dispatchEvent({
			type: "pointerdown",
			clientX: 300,
			clientY: 300,
			button: 0
		} as PointerEvent);

		expect(popup.isOpen()).toBe(false);
		expect(app.popupWidgets()).toEqual([]);
	});

	test("click inside popup does not close it", () => {
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);

		const popup = new CPopupWidget();
		popup.setGeometry(100, 100, 120, 80);
		popup.open();

		canvas.dispatchEvent({
			type: "pointerdown",
			clientX: 130,
			clientY: 120,
			button: 0
		} as PointerEvent);

		expect(popup.isOpen()).toBe(true);
		expect(app.popupWidgets()).toEqual([popup]);
	});

	test("escape closes topmost popup", () => {
		const app = new CApplication(createTestCanvas());
		const popup1 = new CPopupWidget();
		const popup2 = new CPopupWidget();

		popup1.open();
		popup2.open();

		window.dispatchEvent({
			type: "keydown",
			key: "Escape",
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			metaKey: false,
			preventDefault: () => {}
		} as unknown as KeyboardEvent);

		expect(popup1.isOpen()).toBe(true);
		expect(popup2.isOpen()).toBe(false);
		expect(app.popupWidgets()).toEqual([popup1]);
	});

	test("escape closes popups one at a time", () => {
		const app = new CApplication(createTestCanvas());
		const popup1 = new CPopupWidget();
		const popup2 = new CPopupWidget();
		const popup3 = new CPopupWidget();

		popup1.open();
		popup2.open();
		popup3.open();

		const pressEscape = (): void => {
			window.dispatchEvent({
				type: "keydown",
				key: "Escape",
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				preventDefault: () => {}
			} as unknown as KeyboardEvent);
		};

		pressEscape();

		expect(app.popupWidgets()).toEqual([popup1, popup2]);
		expect(popup3.isOpen()).toBe(false);

		pressEscape();

		expect(app.popupWidgets()).toEqual([popup1]);
		expect(popup2.isOpen()).toBe(false);

		pressEscape();

		expect(app.popupWidgets()).toEqual([]);
		expect(popup1.isOpen()).toBe(false);
	});

	test("click outside popup chain closes all popups", () => {
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);

		const popup1 = new CPopupWidget();
		const popup2 = new CPopupWidget();
		const popup3 = new CPopupWidget();

		popup1.setGeometry(10, 10, 100, 100);
		popup2.setGeometry(110, 10, 100, 100);
		popup3.setGeometry(210, 10, 100, 100);

		popup1.open();
		popup2.open();
		popup3.open();

		canvas.dispatchEvent({
			type: "pointerdown",
			clientX: 500,
			clientY: 500,
			button: 0
		} as PointerEvent);

		expect(app.popupWidgets()).toEqual([]);
		expect(popup1.isOpen()).toBe(false);
		expect(popup2.isOpen()).toBe(false);
		expect(popup3.isOpen()).toBe(false);
	});

	test("click in parent popup closes popups above it", () => {
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);

		const popup1 = new CPopupWidget();
		const popup2 = new CPopupWidget();

		popup1.setGeometry(10, 10, 100, 100);
		popup2.setGeometry(110, 10, 100, 100);

		popup1.open();
		popup2.open();

		canvas.dispatchEvent({
			type: "pointerdown",
			clientX: 50,
			clientY: 50,
			button: 0
		} as PointerEvent);

		expect(popup1.isOpen()).toBe(true);
		expect(popup2.isOpen()).toBe(false);
		expect(app.popupWidgets()).toEqual([popup1]);
	});

	test("registers modal widget", () =>
	{
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);
		const dialog = new CDialog();

		app.registerModalWidget(dialog);

		expect(app.modalWidgets()).toEqual([dialog]);
		expect(app.topModalWidget()).toBe(dialog);
	});

	test("does not duplicate registered modal widget", () =>
	{
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);
		const dialog = new CDialog();

		app.registerModalWidget(dialog);
		app.registerModalWidget(dialog);

		expect(app.modalWidgets()).toEqual([dialog]);
	});

	test("registering modal widget again moves it to top", () =>
	{
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);
		const dialog1 = new CDialog();
		const dialog2 = new CDialog();

		app.registerModalWidget(dialog1);
		app.registerModalWidget(dialog2);
		app.registerModalWidget(dialog1);

		expect(app.modalWidgets()).toEqual([
			dialog2,
			dialog1
		]);

		expect(app.topModalWidget()).toBe(dialog1);
	});

	test("unregisters modal widget", () =>
	{
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);
		const dialog = new CDialog();

		app.registerModalWidget(dialog);
		app.unregisterModalWidget(dialog);

		expect(app.modalWidgets()).toEqual([]);
		expect(app.topModalWidget()).toBeNull();
	});

	test("registering modal widget closes open popups", () =>
	{
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);
		const popup1 = new CPopupWidget();
		const popup2 = new CPopupWidget();
		const dialog = new CDialog();

		popup1.open();
		popup2.open();

		expect(app.popupWidgets()).toEqual([
			popup1,
			popup2
		]);

		app.registerModalWidget(dialog);

		expect(popup1.isOpen()).toBe(false);
		expect(popup2.isOpen()).toBe(false);
		expect(app.popupWidgets()).toEqual([]);
		expect(app.topModalWidget()).toBe(dialog);
	});

	test("topModalWidget returns topmost modal widget", () =>
	{
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);
		const dialog1 = new CDialog();
		const dialog2 = new CDialog();

		app.registerModalWidget(dialog1);
		app.registerModalWidget(dialog2);

		expect(app.topModalWidget()).toBe(dialog2);
	});

	test("unregistering top modal reveals previous modal", () =>
	{
		const canvas = createTestCanvas();
		const app = new CApplication(canvas);
		const dialog1 = new CDialog();
		const dialog2 = new CDialog();

		app.registerModalWidget(dialog1);
		app.registerModalWidget(dialog2);

		app.unregisterModalWidget(dialog2);

		expect(app.topModalWidget()).toBe(dialog1);
	});

	test("shows tooltip after tooltip delay", () =>
	{
		vi.useFakeTimers();

		const canvas = createTestCanvas();
		new CApplication(canvas);

		const widget = new CWidget();
		widget.setGeometry(10, 10, 100, 50);
		widget.setToolTip("Hello");

		canvas.dispatchEvent({ type: "pointermove", clientX: 20,
			clientY: 20, button: 0, pointerId: 1
		} as PointerEvent);

		vi.advanceTimersByTime(699);

		expect(CApplication.instance().toolTipVisible()).toBe(false);

		vi.advanceTimersByTime(1);

		expect(CApplication.instance().toolTipVisible()).toBe(true);

		vi.useRealTimers();
	});

	test("dispatches mouse events to child of modal dialog with parent", () => {
		const canvas = createTestCanvas();
		new CApplication(canvas);

		const parent = new CWidget();
		parent.setGeometry(50, 40, 700, 500);

		const dialog = new CDialog(parent);
		dialog.setGeometry(100, 100, 300, 200);

		class ClickWidget extends CWidget {
			clicked = false;

			protected override mousePressEvent(
				event: CMouseEvent
			): void {
				this.clicked = true;
				event.accept();
			}
		}

		const child = new ClickWidget(dialog);
		child.setGeometry(20, 30, 100, 40);
		dialog.exec();
		canvas.dispatchEvent({type: "pointerdown", clientX: 50 + 100 + 20 + 10,
			clientY: 40 + 100 + CDialog.TitleBarHeight + 30 + 10,
			button: 0, pointerId: 1
		} as PointerEvent);

		expect(child.clicked).toBe(true);
	});
});