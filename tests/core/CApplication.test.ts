import { CAction } from "../../src/core/CAction.js";
import { CShortcut } from "../../src/core/CShortcut.js";
import { CKeySequenceEdit } from "../../src/widgets/CKeySequenceEdit.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { CTextEdit } from "../../src/widgets/CTextEdit.js";
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
import { CFocusPolicy } from "../../src/gui/CFocusPolicy";
import { CContextMenuEvent, CContextMenuReason } from "../../src/events/CContextMenuEvent.js";
import { CMenu } from "../../src/widgets/CMenu.js";
import { CDragEnterEvent } from "../../src//events/CDragEnterEvent.js";
import { CDragMoveEvent } from "../../src//events/CDragMoveEvent.js";
import { CDragLeaveEvent } from "../../src//events/CDragLeaveEvent.js";
import { CDropEvent } from "../../src/events/CDropEvent.js";
import { CDropAction } from "../../src/events/CDropAction";
import { CDrag } from "../../src/core/CDrag";
import { CMimeData } from "../../src/core/CMimeData";
import { CClipboard } from "../../src/core/CClipboard";
import { CFont } from "../../src/gui/CFont";

class KeyboardContextTrackingWidget extends CWidget {
    readonly requests: CContextMenuEvent[] = [];
    acceptContext = true;
    keyPresses = 0;
    protected override contextMenuEvent(event: CContextMenuEvent): void {
        this.requests.push(event);
        if (this.acceptContext) event.accept(); else event.ignore();
    }
    protected override keyPressEvent(event: CKeyEvent): void {
        ++this.keyPresses;
        event.ignore();
    }
}


class RenderTrackingWidget extends CWidget {
    renderCalls = 0;

    override render(painter: CPainter): void {
        ++this.renderCalls;

        super.render(painter);
    }
}

class DropWidget extends CWidget {
	dragEnterCount = 0;
	dragMoveCount = 0;
	dragLeaveCount = 0;
	dropCount = 0;

	protected override dragEnterEvent(event: CDragEnterEvent): void {
		++this.dragEnterCount;
		event.acceptProposedAction();
	}

	protected override dragMoveEvent(event: CDragMoveEvent): void {
		++this.dragMoveCount;
		event.acceptProposedAction();
	}

	protected override dragLeaveEvent(event: CDragLeaveEvent): void {
		++this.dragLeaveCount;
		event.accept();
	}

	protected override dropEvent(event: CDropEvent): void {
		++this.dropCount;
		event.acceptProposedAction();
	}
}

function createDrag(source: CWidget): CDrag {
	const drag = new CDrag(source);
	const mimeData = new CMimeData();

	mimeData.setText("dragged text");
	drag.setMimeData(mimeData);
	drag.exec(CDropAction.CopyAction);

	return drag;
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
			constructor() {
				super();
				this.setFocusPolicy(CFocusPolicy.StrongFocus);
			}
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

	test("shows tooltip after tooltip delay", async () =>
	{
		vi.useFakeTimers();
		const canvas = createTestCanvas();
		new CApplication(canvas);
		const widget = new CWidget();
		widget.setGeometry(10, 10, 100, 50);
		widget.setToolTip("Hello");

		canvas.dispatchEvent({type: "pointermove", clientX: 20, clientY: 20, button: 0,
			pointerId: 1 } as PointerEvent);

		vi.advanceTimersByTime(699);
		expect(CApplication.instance().toolTipVisible()).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		await vi.dynamicImportSettled();
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

	test("mouse press does not focus NoFocus widget", () => {
		const canvas = createTestCanvas();
		new CApplication(canvas);

		const widget = new CWidget();

		widget.setGeometry(100, 100, 200, 100);
		widget.setFocusPolicy(CFocusPolicy.NoFocus);

		class MouseWidget extends CWidget {
			protected override mousePressEvent(
				event: CMouseEvent
			): void {
				event.accept();
			}
		}

		const child = new MouseWidget(widget);
		child.setGeometry(0, 0, 200, 100);
		child.setFocusPolicy(CFocusPolicy.NoFocus);

		canvas.dispatchEvent({
			type: "pointerdown",
			clientX: 150,
			clientY: 130,
			button: 0,
			pointerId: 1
		} as PointerEvent);

		expect(child.hasFocus()).toBe(false);
	});

	test("Tab moves focus to next widget", () => {
		const app = new CApplication(createTestCanvas());
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		widget1.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget2.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget1.setFocus();

		window.dispatchEvent({
			type: "keydown",
			key: "Tab",
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			metaKey: false,
			preventDefault: vi.fn()
		} as unknown as KeyboardEvent);

		expect(app.focusWidget()).toBe(widget2);
	});

	test("Shift+Tab moves focus to previous widget", () => {
		const app = new CApplication(createTestCanvas());
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		widget1.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget2.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget2.setFocus();

		window.dispatchEvent({
			type: "keydown",
			key: "Tab",
			ctrlKey: false,
			shiftKey: true,
			altKey: false,
			metaKey: false,
			preventDefault: vi.fn()
		} as unknown as KeyboardEvent);

		expect(app.focusWidget()).toBe(widget1);
	});

	test("Tab wraps focus from last widget to first widget", () => {
		const app = new CApplication(createTestCanvas());
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		widget1.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget2.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget2.setFocus();

		window.dispatchEvent({
			type: "keydown",
			key: "Tab",
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			metaKey: false,
			preventDefault: vi.fn()
		} as unknown as KeyboardEvent);

		expect(app.focusWidget()).toBe(widget1);
	});

	test("Shift+Tab wraps focus from first widget to last widget", () => {
		const app = new CApplication(createTestCanvas());
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		widget1.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget2.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget1.setFocus();

		window.dispatchEvent({
			type: "keydown",
			key: "Tab",
			ctrlKey: false,
			shiftKey: true,
			altKey: false,
			metaKey: false,
			preventDefault: vi.fn()
		} as unknown as KeyboardEvent);

		expect(app.focusWidget()).toBe(widget2);
	});

	test("Tab skips widgets without TabFocus", () => {
		const app = new CApplication(createTestCanvas());
		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();
		const widget4 = new CWidget();

		widget1.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget2.setFocusPolicy(CFocusPolicy.ClickFocus);
		widget3.setFocusPolicy(CFocusPolicy.NoFocus);
		widget4.setFocusPolicy(CFocusPolicy.StrongFocus);
		
		widget1.setFocus();

		window.dispatchEvent({
			type: "keydown",
			key: "Tab",
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			metaKey: false,
			preventDefault: vi.fn()
		} as unknown as KeyboardEvent);

		expect(app.focusWidget()).toBe(widget4);
	});

	test("Tab skips hidden and disabled widgets", () => {
		const app = new CApplication(createTestCanvas());
		const widget1 = new CWidget();
		const widget2 = new CWidget();
		const widget3 = new CWidget();
		const widget4 = new CWidget();

		widget1.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget2.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget3.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget4.setFocusPolicy(CFocusPolicy.StrongFocus);
		
		widget2.hide();
		widget3.setEnabled(false);
		widget1.setFocus();

		window.dispatchEvent({
			type: "keydown",
			key: "Tab",
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			metaKey: false,
			preventDefault: vi.fn()
		} as unknown as KeyboardEvent);

		expect(app.focusWidget()).toBe(widget4);
	});

	test("accepted Tab key does not move focus", () => {
		const app = new CApplication(createTestCanvas());
		const preventDefault = vi.fn();

		class TabWidget extends CWidget {
			constructor() {
				super();
				this.setFocusPolicy(CFocusPolicy.StrongFocus);
			}
			protected override keyPressEvent(
				event: CKeyEvent
			): void {
				if (event.key() === "Tab")
					event.accept();
				else
					event.ignore();
			}
		}

		const widget1 = new TabWidget();
		new CWidget();

		widget1.setFocus();

		window.dispatchEvent({
			type: "keydown",
			key: "Tab",
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			metaKey: false,
			preventDefault
		} as unknown as KeyboardEvent);

		expect(app.focusWidget()).toBe(widget1);
		expect(preventDefault).toHaveBeenCalledOnce();
	});

	test("Tab focus follows widget tree order", () => {
		const app = new CApplication(createTestCanvas());
		const parent = new CWidget();
		const child1 = new CWidget(parent);
		const child2 = new CWidget(parent);
		const other = new CWidget();

		parent.setFocusPolicy(CFocusPolicy.NoFocus);
		child1.setFocusPolicy(CFocusPolicy.StrongFocus);
		child2.setFocusPolicy(CFocusPolicy.StrongFocus);
		other.setFocusPolicy(CFocusPolicy.StrongFocus);
		child1.setFocus();

		window.dispatchEvent({
			type: "keydown",
			key: "Tab",
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			metaKey: false,
			preventDefault: vi.fn()
		} as unknown as KeyboardEvent);

		expect(app.focusWidget()).toBe(child2);

		window.dispatchEvent({
			type: "keydown",
			key: "Tab",
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			metaKey: false,
			preventDefault: vi.fn()
		} as unknown as KeyboardEvent);

		expect(app.focusWidget()).toBe(other);
	});

	test("Tab prevents default browser focus navigation", () => {
		const app = new CApplication(createTestCanvas());
		const preventDefault = vi.fn();
		const widget1 = new CWidget();
		const widget2 = new CWidget();

		widget1.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget2.setFocusPolicy(CFocusPolicy.StrongFocus);
		widget1.setFocus();

		window.dispatchEvent({
			type: "keydown",
			key: "Tab",
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			metaKey: false,
			preventDefault
		} as unknown as KeyboardEvent);

		expect(app.focusWidget()).toBe(widget2);
		expect(preventDefault).toHaveBeenCalledOnce();
	});

	test("dispatches context menu event to widget", () => {
		const app = new CApplication(createTestCanvas());
		
		let called = false;
		let reason: CContextMenuReason | null = null;
		const preventDefault = vi.fn();

		class ContextMenuWidget extends CWidget {
			protected override contextMenuEvent(
				event: CContextMenuEvent): void {
				called = true;
				reason = event.reason();
				event.accept();
			}
		}

		const widget = new ContextMenuWidget();
		widget.setGeometry(100, 100, 200, 100);

		app.canvas().dispatchEvent({
			type: "contextmenu",
			clientX: 150,
			clientY: 130,
			preventDefault
		} as unknown as PointerEvent);

		expect(called).toBe(true);
		expect(reason).toBe(CContextMenuReason.Mouse);
	});

	test("context menu event has local and canvas positions", () => {
		const app = new CApplication(createTestCanvas());
		
		let localX = -1;
		let localY = -1;
		let globalX = -1;
		let globalY = -1;
		const preventDefault = vi.fn();

		class ContextMenuWidget extends CWidget {
			protected override contextMenuEvent(
				event: CContextMenuEvent): void {
				localX = event.pos().x();
				localY = event.pos().y();
				globalX = event.globalPos().x();
				globalY = event.globalPos().y();
				event.accept();
			}
		}

		const widget = new ContextMenuWidget();
		widget.setGeometry(100, 80, 200, 100);

		app.canvas().dispatchEvent({
			type: "contextmenu", 
			clientX: 150, 
			clientY: 120,
			preventDefault
		 } as unknown as PointerEvent);

		expect(localX).toBe(50);
		expect(localY).toBe(40);
		expect(globalX).toBe(150);
		expect(globalY).toBe(120);
	});

	test("bubbles ignored context menu event to parent", () => {
		const app = new CApplication(createTestCanvas());
		const preventDefault = vi.fn();

		const calls: string[] = [];

		class ParentWidget extends CWidget {
			protected override contextMenuEvent(
				event: CContextMenuEvent): void {
				calls.push(
					`parent:${event.pos().x()},${event.pos().y()}`
				);
				event.accept();
			}
		}

		class ChildWidget extends CWidget {
			protected override contextMenuEvent(
				event: CContextMenuEvent): void {
				calls.push(
					`child:${event.pos().x()},${event.pos().y()}`
				);
				event.ignore();
			}
		}

		const parent = new ParentWidget();
		parent.setGeometry(100, 100, 300, 200);

		const child = new ChildWidget(parent);
		child.setGeometry(50, 40, 100, 80);

		app.canvas().dispatchEvent({
			type: "contextmenu", 
			clientX: 180, 
			clientY: 160,
			preventDefault 
		} as unknown as PointerEvent);

		expect(calls).toEqual([
			"child:30,20",
			"parent:80,60"
		]);
	});

	test("stops context menu bubbling when child accepts event", () => {
		const app = new CApplication(createTestCanvas());
		const preventDefault = vi.fn();

		let parentCalls = 0;
		let childCalls = 0;

		class ParentWidget extends CWidget {
			protected override contextMenuEvent(
				event: CContextMenuEvent): void {
				++parentCalls;
				event.accept();
			}
		}

		class ChildWidget extends CWidget {
			protected override contextMenuEvent(
				event: CContextMenuEvent): void {
				++childCalls;
				event.accept();
			}
		}

		const parent = new ParentWidget();
		parent.setGeometry(100, 100, 300, 200);

		const child = new ChildWidget(parent);
		child.setGeometry(50, 40, 100, 80);

		app.canvas().dispatchEvent({
			type: "contextmenu", 
			clientX: 180, 
			clientY: 160,
			preventDefault
		} as unknown as PointerEvent);

		expect(childCalls).toBe(1);
		expect(parentCalls).toBe(0);
	});

	test("opens context menu at context menu event position", () => {
		const app = new CApplication(createTestCanvas());
		const menu = new CMenu();

		class ContextMenuWidget extends CWidget {
			protected override contextMenuEvent(
				event: CContextMenuEvent): void {
				menu.exec(event.globalPos());
				event.accept();
			}
		}

		const widget = new ContextMenuWidget();
		widget.setGeometry(100, 100, 200, 100);

		const preventDefault = vi.fn();

		app.canvas().dispatchEvent({
			type: "contextmenu",
			clientX: 150,
			clientY: 130,
			preventDefault
		} as unknown as PointerEvent);

		expect(menu.isOpen()).toBe(true);
		expect(menu.x()).toBe(150);
		expect(menu.y()).toBe(130);
		expect(app.focusWidget()).toBe(menu);
		expect(preventDefault).toHaveBeenCalledOnce();
	});

	test("starts active drag", () => {
		const app = new CApplication(createTestCanvas());
		const source = new CWidget();
		const drag = new CDrag(source);
		const mimeData = new CMimeData();

		drag.setMimeData(mimeData);
		drag.exec(CDropAction.CopyAction);
		app.startDrag(drag);

		expect(app.activeDrag()).toBe(drag);
		expect(app.dragTarget()).toBeNull();

		app.destroy();
	});

	test("cancels active drag", () => {
		const app = new CApplication(createTestCanvas());
		const source = new CWidget();
		const drag = new CDrag(source);

		drag.setMimeData(new CMimeData());
		drag.exec(CDropAction.CopyAction);
		app.startDrag(drag);
		app.cancelDrag();

		expect(app.activeDrag()).toBeNull();
		expect(drag.isActive()).toBe(false);
		expect(drag.dropAction()).toBe(CDropAction.IgnoreAction);

		app.destroy();
	});

	test("sends drag enter when pointer enters a drop target", () => {
		const app = new CApplication(createTestCanvas());
		const source = new CWidget();
		const target = new DropWidget();

		source.setGeometry(0, 0, 100, 100);
		target.setGeometry(100, 0, 100, 100);
		target.setAcceptDrops(true);

		const drag = createDrag(source);
		app.startDrag(drag);

		app.canvas().dispatchEvent({
			type: "pointermove",
			clientX: 150,
			clientY: 50
		} as PointerEvent);

		expect(target.dragEnterCount).toBe(1);
		expect(target.dragMoveCount).toBe(0);
		expect(app.dragTarget()).toBe(target);

		app.destroy();
	});

	test("sends drag move while pointer remains over target", () => {
		const app = new CApplication(createTestCanvas());
		const source = new CWidget();
		const target = new DropWidget();

		source.setGeometry(0, 0, 100, 100);
		target.setGeometry(100, 0, 100, 100);
		target.setAcceptDrops(true);

		const drag = createDrag(source);
		app.startDrag(drag);

		app.canvas().dispatchEvent({
			type: "pointermove",
			clientX: 150,
			clientY: 50
		} as PointerEvent);

		app.canvas().dispatchEvent({
			type: "pointermove",
			clientX: 160,
			clientY: 60
		} as PointerEvent);

		expect(target.dragEnterCount).toBe(1);
		expect(target.dragMoveCount).toBe(1);
		expect(target.dragLeaveCount).toBe(0);

		app.destroy();
	});

	test("sends drag leave when pointer leaves target", () => {
		const app = new CApplication(createTestCanvas());
		const source = new CWidget();
		const target = new DropWidget();

		source.setGeometry(0, 0, 100, 100);
		target.setGeometry(100, 0, 100, 100);
		target.setAcceptDrops(true);

		const drag = createDrag(source);
		app.startDrag(drag);

		app.canvas().dispatchEvent({
			type: "pointermove",
			clientX: 150,
			clientY: 50
		} as PointerEvent);

		app.canvas().dispatchEvent({
			type: "pointermove",
			clientX: 250,
			clientY: 50
		} as PointerEvent);

		expect(target.dragEnterCount).toBe(1);
		expect(target.dragLeaveCount).toBe(1);
		expect(app.dragTarget()).toBeNull();

		app.destroy();
	});

	test("switches drag target when pointer moves between targets", () => {
		const app = new CApplication(createTestCanvas());
		const source = new CWidget();
		const target1 = new DropWidget();
		const target2 = new DropWidget();

		source.setGeometry(0, 0, 100, 100);
		target1.setGeometry(100, 0, 100, 100);
		target2.setGeometry(200, 0, 100, 100);

		target1.setAcceptDrops(true);
		target2.setAcceptDrops(true);

		const drag = createDrag(source);
		app.startDrag(drag);

		app.canvas().dispatchEvent({
			type: "pointermove",
			clientX: 150,
			clientY: 50
		} as PointerEvent);

		app.canvas().dispatchEvent({
			type: "pointermove",
			clientX: 250,
			clientY: 50
		} as PointerEvent);

		expect(target1.dragEnterCount).toBe(1);
		expect(target1.dragLeaveCount).toBe(1);

		expect(target2.dragEnterCount).toBe(1);
		expect(target2.dragLeaveCount).toBe(0);

		expect(app.dragTarget()).toBe(target2);

		app.destroy();
	});

	test("drops on current drag target", () => {
		const app = new CApplication(createTestCanvas());
		const source = new CWidget();
		const target = new DropWidget();

		source.setGeometry(0, 0, 100, 100);
		target.setGeometry(100, 0, 100, 100);
		target.setAcceptDrops(true);

		const drag = createDrag(source);
		app.startDrag(drag);

		app.canvas().dispatchEvent({
			type: "pointermove",
			clientX: 150,
			clientY: 50
		} as PointerEvent);

		app.canvas().dispatchEvent({
			type: "pointerup",
			clientX: 150,
			clientY: 50,
			pointerId: 1
		} as PointerEvent);

		expect(target.dropCount).toBe(1);

		expect(drag.isActive()).toBe(false);
		expect(drag.dropAction()).toBe(CDropAction.CopyAction);

		expect(app.activeDrag()).toBeNull();
		expect(app.dragTarget()).toBeNull();

		app.destroy();
	});

	test("finishes drag with ignore action when dropped outside target", () => {
		const app = new CApplication(createTestCanvas());
		const source = new CWidget();
		const target = new DropWidget();

		source.setGeometry(0, 0, 100, 100);
		target.setGeometry(100, 0, 100, 100);
		target.setAcceptDrops(true);

		const drag = createDrag(source);
		app.startDrag(drag);

		app.canvas().dispatchEvent({
			type: "pointermove",
			clientX: 150,
			clientY: 50
		} as PointerEvent);

		app.canvas().dispatchEvent({
			type: "pointermove",
			clientX: 250,
			clientY: 50
		} as PointerEvent);

		app.canvas().dispatchEvent({
			type: "pointerup",
			clientX: 250,
			clientY: 50,
			pointerId: 1
		} as PointerEvent);

		expect(target.dragLeaveCount).toBe(1);
		expect(target.dropCount).toBe(0);

		expect(drag.isActive()).toBe(false);
		expect(drag.dropAction()).toBe(CDropAction.IgnoreAction);

		expect(app.activeDrag()).toBeNull();
		expect(app.dragTarget()).toBeNull();

		app.destroy();
	});

	test("uses accepting parent as drop target", () => {
		const app = new CApplication(createTestCanvas());
		const source = new CWidget();
		const parent = new DropWidget();
		const child = new CWidget(parent);

		source.setGeometry(0, 0, 100, 100);
		parent.setGeometry(100, 0, 200, 100);
		child.setGeometry(20, 20, 100, 60);

		parent.setAcceptDrops(true);
		child.setAcceptDrops(false);

		const drag = createDrag(source);
		app.startDrag(drag);

		app.canvas().dispatchEvent({
			type: "pointermove",
			clientX: 150,
			clientY: 50
		} as PointerEvent);

		expect(parent.dragEnterCount).toBe(1);
		expect(app.dragTarget()).toBe(parent);

		app.canvas().dispatchEvent({
			type: "pointerup",
			clientX: 150,
			clientY: 50,
			pointerId: 1
		} as PointerEvent);

		expect(parent.dropCount).toBe(1);
		expect(drag.dropAction()).toBe(CDropAction.CopyAction);

		app.destroy();
	});

	test("provides application clipboard", () => {
		const app = new CApplication(createTestCanvas());

		expect(app.clipboard()).toBeDefined();
		expect(app.clipboard()).toBe(app.clipboard());

		app.clipboard().setText("Hello");
		expect(app.clipboard().text()).toBe("Hello");

		app.destroy();
	});

	test("has a default font", () => {
		const app = new CApplication(createTestCanvas());

		expect(app.font().toCss()).toBe("14px sans-serif");

		app.destroy();
	});

	test("stores an independent application font", () => {
		const app = new CApplication(createTestCanvas());
		const font = new CFont("Arial", 18);
		app.setFont(font);

		font.setPixelSize(30);
		const returned = app.font();
		returned.setFamily("serif");

		expect(app.font().toCss()).toBe("18px Arial");

		app.destroy();
	});
describe("keyboard context menus", () => {
    beforeEach(() => {
        new CApplication(createTestCanvas());
    });

    function key(key: string, options: {
        shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean; type?: string
    } = {}) {
        const preventDefault = vi.fn();
        window.dispatchEvent({
            type: "keydown", key, shiftKey: false, ctrlKey: false,
            altKey: false, metaKey: false, ...options, preventDefault
        } as unknown as KeyboardEvent);
        return preventDefault;
    }

    test("Shift+F10 dispatches a keyboard context request instead of a key press", () => {
        const widget = new KeyboardContextTrackingWidget();
        widget.setGeometry(30, 40, 100, 60);
        CApplication.instance().setFocusWidget(widget);
        const prevented = key("F10", { shiftKey: true });
        expect(widget.requests).toHaveLength(1);
        expect(widget.requests[0]!.reason()).toBe(CContextMenuReason.Keyboard);
        expect(widget.requests[0]!.pos().x()).toBe(50);
        expect(widget.requests[0]!.pos().y()).toBe(30);
        expect(widget.requests[0]!.globalPos().x()).toBe(80);
        expect(widget.requests[0]!.globalPos().y()).toBe(70);
        expect(widget.keyPresses).toBe(0);
        expect(prevented).toHaveBeenCalledOnce();
    });
    test("ContextMenu key opens a context menu", () => {
        const widget = new KeyboardContextTrackingWidget();
        CApplication.instance().setFocusWidget(widget);
        expect(key("ContextMenu")).toHaveBeenCalledOnce();
        expect(widget.requests).toHaveLength(1);
    });
    test("ignored requests bubble to the parent with remapped coordinates", () => {
        const parent = new KeyboardContextTrackingWidget();
        parent.setGeometry(20, 30, 300, 200);
        const child = new KeyboardContextTrackingWidget(parent);
        child.setGeometry(10, 15, 80, 40);
        child.acceptContext = false;
        CApplication.instance().setFocusWidget(child);
        const prevented = key("ContextMenu");
        expect(child.requests).toHaveLength(1);
        expect(parent.requests).toHaveLength(1);
        expect(parent.requests[0]!.pos().x()).toBe(50);
        expect(parent.requests[0]!.pos().y()).toBe(35);
        expect(parent.requests[0]!.globalPos().x()).toBe(70);
        expect(parent.requests[0]!.globalPos().y()).toBe(65);
        expect(prevented).toHaveBeenCalledOnce();
    });
    test("unhandled requests preserve normal key dispatch and browser default", () => {
        const widget = new KeyboardContextTrackingWidget();
        widget.acceptContext = false;
        CApplication.instance().setFocusWidget(widget);
        expect(key("ContextMenu")).not.toHaveBeenCalled();
        expect(widget.requests).toHaveLength(1);
        expect(widget.keyPresses).toBe(1);
    });
    test("plain F10 and additional modifiers do not request a menu", () => {
        const widget = new KeyboardContextTrackingWidget();
        CApplication.instance().setFocusWidget(widget);
        key("F10");
        key("F10", { shiftKey: true, ctrlKey: true });
        key("F10", { shiftKey: true, altKey: true });
        key("ContextMenu", { metaKey: true });
        expect(widget.requests).toHaveLength(0);
        expect(widget.keyPresses).toBe(4);
    });
    test("key release does not dispatch another context request", () => {
        const widget = new KeyboardContextTrackingWidget();
        CApplication.instance().setFocusWidget(widget);
        key("ContextMenu", { type: "keyup" });
        expect(widget.requests).toHaveLength(0);
    });
    test("a shortcut without focus does nothing", () => {
        expect(key("ContextMenu")).not.toHaveBeenCalled();
    });
    test("disabled or hidden focus widgets do not receive context requests", () => {
        const widget = new KeyboardContextTrackingWidget();
        CApplication.instance().setFocusWidget(widget);
        widget.setEnabled(false);
        key("ContextMenu");
        widget.setEnabled(true); widget.hide();
        key("ContextMenu");
        expect(widget.requests).toHaveLength(0);
    });
    test("Shift+F10 opens the line editor standard menu and Escape restores focus", () => {
        const edit = new CLineEdit();
        edit.setGeometry(20, 20, 160, 28);
        edit.setText("Hello"); edit.selectAll(); edit.setFocus();
        key("F10", { shiftKey: true });
        expect(CApplication.instance().popupWidgets()).toHaveLength(1);
        expect(edit.selectedText()).toBe("Hello");
        key("Escape");
        expect(CApplication.instance().popupWidgets()).toHaveLength(0);
        expect(edit.hasFocus()).toBe(true);
    });
    test("ContextMenu opens the text editor standard menu", () => {
        const edit = new CTextEdit();
        edit.setGeometry(20, 20, 300, 180);
        edit.setPlainText("Hello"); edit.selectAll(); edit.setFocus();
        key("ContextMenu");
        expect(CApplication.instance().popupWidgets()).toHaveLength(1);
        expect(edit.selectedText()).toBe("Hello");
        key("Escape");
        expect(edit.hasFocus()).toBe(true);
    });
});


    describe("multi-click event dispatch", () => {
        let canvas: ReturnType<typeof createTestCanvas>;
        class ClickWidget extends CWidget {
            presses: number[] = [];
            releases: number[] = [];
            doubles: number[] = [];
            protected override mousePressEvent(event: CMouseEvent): void {
                this.presses.push(event.clickCount()); event.accept();
            }
            protected override mouseReleaseEvent(event: CMouseEvent): void {
                this.releases.push(event.clickCount()); event.accept();
            }
            protected override mouseDoubleClickEvent(event: CMouseEvent): void {
                this.doubles.push(event.clickCount()); event.accept();
            }
        }
        beforeEach(() => {
            canvas = createTestCanvas();
            new CApplication(canvas);
        });
        afterEach(() => vi.restoreAllMocks());
        function pointer(type: string, x = 40, y = 40, detail = 0, button = 0): void {
            canvas.dispatchEvent({type, clientX:x, clientY:y, pointerId:1,
                shiftKey:false, button, detail, preventDefault:vi.fn()
            } as unknown as PointerEvent);
        }
        function click(x = 40, y = 40, detail = 0, button = 0): void {
            pointer("pointerdown", x, y, detail, button);
            pointer("pointerup", x, y, detail, button);
        }
        function widget(): ClickWidget {
            const result = new ClickWidget();
            result.setGeometry(10, 10, 200, 100);
            return result;
        }
        test("counts pointer clicks with detail zero and preserves count on release", () => {
            const target = widget();
            vi.spyOn(Date, "now").mockReturnValue(1000);
            click(); click(); click();
            expect(target.presses).toEqual([1, 2, 3]);
            expect(target.releases).toEqual([1, 2, 3]);
        });
        test("uses an explicit DOM click count", () => {
            const target = widget();
            click(40, 40, 3);
            expect(target.presses).toEqual([3]);
        });
        test("a pause resets the click sequence", () => {
            const target = widget();
            const now = vi.spyOn(Date, "now").mockReturnValue(1000);
            click(); now.mockReturnValue(1600); click();
            expect(target.presses).toEqual([1, 1]);
        });
        test("moving away resets the click sequence", () => {
            const target = widget();
            click();
            pointer("pointermove", 70, 70);
            click();
            expect(target.presses).toEqual([1, 1]);
        });
        test("changing buttons resets the sequence", () => {
            const target = widget();
            click(); click(40, 40, 0, 2);
            expect(target.presses).toEqual([1, 1]);
        });
        test("changing widgets resets the sequence", () => {
            const first = widget(), second = widget();
            second.setGeometry(220, 10, 200, 100);
            click(); click(250, 40);
            expect(first.presses).toEqual([1]);
            expect(second.presses).toEqual([1]);
        });
        test("native double-click dispatch carries count two", () => {
            const target = widget();
            pointer("dblclick");
            expect(target.doubles).toEqual([2]);
        });
        test("a click following a native double-click carries count three", () => {
            const target = widget();
            pointer("dblclick");
            click();
            expect(target.presses).toEqual([3]);
        });
    });

});

describe("shortcut dispatch", () => {
    function press(key = "s", options: Partial<KeyboardEvent> = {}) {
        const preventDefault = vi.fn();
        window.dispatchEvent({ type: "keydown", key, ctrlKey: true,
            shiftKey: false, altKey: false, metaKey: false, preventDefault,
            ...options } as unknown as KeyboardEvent);
        return preventDefault;
    }
    function setup() {
        const app = new CApplication(createTestCanvas());
        const root = new CWidget();
        const child = new CLineEdit(root);
        child.setGeometry(0, 0, 100, 28);
        child.setFocus();
        const shortcut = new CShortcut("Ctrl+S", root);
        const activated = vi.fn(); shortcut.activated.connect(activated);
        return { app, root, child, shortcut, activated };
    }
    test("activates an ancestor's shortcut and prevents the browser default", () => {
        const { activated } = setup();
        expect(press()).toHaveBeenCalledOnce();
        expect(activated).toHaveBeenCalledOnce();
    });
    test("also activates with focus on the owner itself", () => {
        const { root, activated } = setup();
        root.setFocusPolicy(CFocusPolicy.StrongFocus); root.setFocus();
        press(); expect(activated).toHaveBeenCalledOnce();
    });
    test("does not activate a shortcut in a different subtree", () => {
        const { activated } = setup();
        const other = new CLineEdit(); other.setFocus();
        press(); expect(activated).not.toHaveBeenCalled();
    });
    test("disabled shortcuts fall through without activation", () => {
        const { shortcut, activated } = setup();
        shortcut.setEnabled(false); press();
        expect(activated).not.toHaveBeenCalled();
    });
    test("modal shortcuts work after an editor clears focus on Enter", () => {
        const { app, root, activated } = setup();
        app.registerModalWidget(root);
        app.setFocusWidget(null);
        expect(app.focusWidget()).toBeNull();
        const preventDefault = press();
        expect(activated).toHaveBeenCalledOnce();
        expect(preventDefault).toHaveBeenCalledOnce();
    });
    test("destroyed shortcuts no longer activate", () => {
        const { shortcut, activated } = setup();
        shortcut.destroy(); press(); expect(activated).not.toHaveBeenCalled();
    });
    test("the nearest owner's shortcut takes precedence", () => {
        const { child, activated } = setup();
        const local = new CShortcut("Ctrl+S", child);
        const localActivated = vi.fn(); local.activated.connect(localActivated);
        press(); expect(localActivated).toHaveBeenCalledOnce();
        expect(activated).not.toHaveBeenCalled();
    });
    test("duplicate shortcuts report ambiguity instead of triggering", () => {
        const { root, shortcut, activated } = setup();
        const duplicate = new CShortcut("Ctrl+S", root);
        const ambiguous = vi.fn(); const duplicateActivated = vi.fn();
        shortcut.activatedAmbiguously.connect(ambiguous);
        duplicate.activated.connect(duplicateActivated);
        const preventDefault = press();
        expect(ambiguous).toHaveBeenCalledOnce();
        expect(activated).not.toHaveBeenCalled();
        expect(duplicateActivated).not.toHaveBeenCalled();
        expect(preventDefault).toHaveBeenCalledOnce();
    });
    test("a modal dialog blocks main-window shortcuts", () => {
        const { app, root, activated } = setup();
        const dialog = new CWidget(root);
        const child = new CLineEdit(dialog);
        app.registerModalWidget(dialog); child.setFocus();
        press(); expect(activated).not.toHaveBeenCalled();
        const local = new CShortcut("Ctrl+S", dialog);
        const localActivated = vi.fn(); local.activated.connect(localActivated);
        press(); expect(localActivated).toHaveBeenCalledOnce();
    });
    test("modal shortcuts cannot be bypassed by stale background focus", () => {
        const { app, child, activated } = setup();
        const dialog = new CWidget(); app.registerModalWidget(dialog);
        child.setFocus(); press(); expect(activated).not.toHaveBeenCalled();
    });
    test("popups block shortcuts owned outside the popup", () => {
        const { app, activated } = setup();
        const popup = new CPopupWidget();
        app.registerPopupWidget(popup);
        const child = new CLineEdit(popup); child.setFocus();
        press(); expect(activated).not.toHaveBeenCalled();
    });
    test("AltGraph input never activates a Ctrl+Alt shortcut", () => {
        const { root } = setup();
        const shortcut = new CShortcut("Ctrl+Alt+Q", root);
        const activated = vi.fn(); shortcut.activated.connect(activated);
        press("q", { altKey: true, code: "KeyQ", getModifierState: () => true });
        expect(activated).not.toHaveBeenCalled();
    });
    test("key sequence recording does not activate registered shortcuts", () => {
        const { root, activated } = setup();
        const recorder = new CKeySequenceEdit(root); recorder.setFocus();
        press("s", { code: "KeyS" });
        expect(recorder.keySequence()).toBe("Ctrl+S");
        expect(activated).not.toHaveBeenCalled();
    });
    test("keyup never activates a shortcut", () => {
        const { activated } = setup();
        window.dispatchEvent({ type: "keyup", key: "s", ctrlKey: true,
            shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn()
        } as unknown as KeyboardEvent);
        expect(activated).not.toHaveBeenCalled();
    });
});


describe("action shortcut dispatch", () => {
    function setup() {
        const app = new CApplication(createTestCanvas());
        const root = new CWidget();
        const editor = new CLineEdit(root);
        editor.setGeometry(0, 0, 100, 28);
        editor.setFocus();
        const action = new CAction("Save", root);
        action.setShortcut("Ctrl+S");
        const triggered = vi.fn();
        action.triggered.connect(triggered);
        return { app, root, action, triggered };
    }
    function press(key = "s") {
        const preventDefault = vi.fn();
        window.dispatchEvent({ type: "keydown", key, ctrlKey: true,
            shiftKey: false, altKey: false, metaKey: false, preventDefault
        } as unknown as KeyboardEvent);
        return preventDefault;
    }
    test("triggers an action and prevents the browser save dialog", () => {
        const { action, triggered } = setup();
        action.setCheckable(true);
        expect(press()).toHaveBeenCalledOnce();
        expect(triggered).toHaveBeenCalledOnce();
        expect(action.isChecked()).toBe(true);
    });
    test("disabled actions do not consume or activate their shortcuts", () => {
        const { action, triggered } = setup();
        action.setEnabled(false);
        expect(press()).not.toHaveBeenCalled();
        expect(triggered).not.toHaveBeenCalled();
        action.setEnabled(true);
        expect(press()).toHaveBeenCalledOnce();
        expect(triggered).toHaveBeenCalledOnce();
    });
    test("changing and clearing an action shortcut updates dispatch", () => {
        const { action, triggered } = setup();
        action.setShortcut("Ctrl+K");
        expect(press()).not.toHaveBeenCalled();
        expect(press("k")).toHaveBeenCalledOnce();
        action.setShortcut("");
        expect(press("k")).not.toHaveBeenCalled();
        expect(triggered).toHaveBeenCalledOnce();
    });
    test("destroying an action releases its shortcut", () => {
        const { action, triggered } = setup();
        action.destroy();
        expect(press()).not.toHaveBeenCalled();
        expect(triggered).not.toHaveBeenCalled();
    });
});
