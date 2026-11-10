import { CPalette } from "../../src/gui/CPalette.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import { CColor } from "../../src/gui/CColor.js";
import { CTableView } from "../../src/widgets/CTableView.js";
import type { CItemTextEdit, CItemTextEditError } from "../../src/models/CAbstractItemModel.js";
import { CSortFilterProxyModel } from "../../src/models/CSortFilterProxyModel.js";
import { CAbstractTableModel } from "../../src/models/CAbstractTableModel.js";
import { CModelIndex } from "../../src/models/CModelIndex.js";
import { CMouseButton } from "../../src/events/CMouseEvent.js";
import { CPushButton } from "../../src/widgets/CPushButton.js";
import { CNumberEdit } from "../../src/widgets/CNumberEdit.js";
import { CLabel } from "../../src/widgets/CLabel.js";
import { CAction } from "../../src/core/CAction.js";
import { CShortcut } from "../../src/core/CShortcut.js";
import { CKeySequenceEdit } from "../../src/widgets/CKeySequenceEdit.js";
import { CLineEdit, CEchoMode } from "../../src/widgets/CLineEdit.js";
import { CTextEdit } from "../../src/widgets/CTextEdit.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication";
import { CWidget } from "../../src/widgets/CWidget";
import { CPainter } from "../../src/painting/CPainter";
import { CMouseEvent } from "../../src/events/CMouseEvent";
import { CFocusEvent } from "../../src/events/CFocusEvent";
import { CKeyEvent } from "../../src/events/CKeyEvent";
import { CEventType } from "../../src/events/CEvent.js";
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

    test.each(["line", "multiline"])("%s editor moves across and deletes whole emoji", kind => {
        const app = new CApplication(createTestCanvas());
        const edit = kind === "line" ? new CLineEdit() : new CTextEdit();
        const text = () => edit instanceof CLineEdit ? edit.text() : edit.toPlainText();
        const press = (key: string) => edit.event(new CKeyEvent(CEventType.KeyPress, key));
        edit.insert("A👍🏽👩‍💻B");

        press("ArrowLeft");
        expect(edit.cursorPosition()).toBe("A👍🏽👩‍💻".length);
        press("ArrowLeft");
        expect(edit.cursorPosition()).toBe("A👍🏽".length);
        press("ArrowLeft");
        expect(edit.cursorPosition()).toBe(1);
        press("ArrowRight");
        expect(edit.cursorPosition()).toBe("A👍🏽".length);

        press("Backspace");
        expect(text()).toBe("A👩‍💻B");
        press("Delete");
        expect(text()).toBe("AB");
        app.destroy();
    });

    test("routes native text replacements to the focused editor", () => {
        class TestEditContext extends EventTarget {
            text = "";
            selectionStart = 0;
            selectionEnd = 0;

            updateText(start: number, end: number, text: string): void {
                this.text = this.text.slice(0, start) + text + this.text.slice(end);
            }

            updateSelection(start: number, end: number): void {
                this.selectionStart = start;
                this.selectionEnd = end;
            }

            replaceSelection(text: string): void {
                const updateRangeStart = this.selectionStart;
                const updateRangeEnd = this.selectionEnd;
                this.updateText(updateRangeStart, updateRangeEnd, text);
                this.updateSelection(updateRangeStart + text.length, updateRangeStart + text.length);
                this.dispatchEvent(Object.assign(new Event("textupdate"), { text, updateRangeStart, updateRangeEnd }));
            }
        }

        vi.stubGlobal("EditContext", TestEditContext);
        try {
            const body = {};
            const ownerDocument = { body, activeElement: body };
            const canvas = Object.assign(createTestCanvas(), {
                editContext: null as TestEditContext | null,
                ownerDocument,
                focus: () => { ownerDocument.activeElement = canvas; }
            });
            const app = new CApplication(canvas);
            const edit = new CLineEdit();
            edit.setText("hello");
            edit.selectAll();
            edit.setFocus();

            expect(ownerDocument.activeElement).toBe(canvas);
            const context = canvas.editContext!;
            expect([context.selectionStart, context.selectionEnd]).toEqual([0, 5]);
            context.replaceSelection("🙂");
            expect(edit.text()).toBe("🙂");
            expect(edit.cursorPosition()).toBe(2);
            window.dispatchEvent({ type: "keydown", key: "Backspace", preventDefault: () => {} } as KeyboardEvent);
            expect(edit.text()).toBe("");
            edit.undo();
            expect(edit.text()).toBe("🙂");
            edit.undo();
            expect(edit.text()).toBe("hello");
            expect(context.text).toBe("hello");

            edit.setValidator(text => text === "hello");
            context.replaceSelection("🙂");
            expect(edit.text()).toBe("hello");
            expect(context.text).toBe("hello");

            edit.setEchoMode(CEchoMode.Password);
            expect(canvas.editContext).toBeNull();
            expect(context.text).toBe("");

            const richEdit = new CTextEdit();
            richEdit.setPlainText("Hello\nworld");
            richEdit.setSelection(6, 11);
            richEdit.setFontItalic(true);
            richEdit.setFocus();
            expect(canvas.editContext).toBe(context);
            expect([context.selectionStart, context.selectionEnd]).toEqual([6, 11]);

            context.replaceSelection("🙂");
            expect(richEdit.toPlainText()).toBe("Hello\n🙂");
            expect(richEdit.toHtml()).toContain("<i>🙂</i>");
            expect(richEdit.cursorPosition()).toBe(8);

            window.dispatchEvent({ type: "keydown", key: "Backspace", preventDefault: () => {} } as KeyboardEvent);
            expect(richEdit.toPlainText()).toBe("Hello\n");
            richEdit.undo();
            expect(richEdit.toHtml()).toContain("<i>🙂</i>");
            richEdit.undo();
            expect(richEdit.toPlainText()).toBe("Hello\nworld");
            expect(richEdit.toHtml()).toContain("<i>world</i>");
            expect(context.text).toBe("Hello\nworld");

            richEdit.setReadOnly(true);
            expect(canvas.editContext).toBeNull();
        } finally {
            vi.unstubAllGlobals();
        }
    });

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

    test("run enables updates", () => {
        const app = new CApplication(createTestCanvas());

        app.run();

        expect(app.updatesEnabled()).toBe(true);
    });

    test("run schedules the initial repaint", () => {
        const app = new CApplication(createTestCanvas());

        app.run();

        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("calling run repeatedly does not schedule additional frames", () => {
        const app = new CApplication(createTestCanvas());

        app.run();
        app.run();
        app.run();

        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("requestRepaint does nothing while updates are disabled", () => {
        const app = new CApplication(createTestCanvas());

        app.requestRepaint();

        expect(pendingAnimationFrameCount()).toBe(0);
    });

    test("coalesces multiple repaint requests into one animation frame", () => {
        const app = new CApplication(createTestCanvas());

        app.run();

        app.requestRepaint();
        app.requestRepaint();
        app.requestRepaint();

        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("allows another repaint after the current frame completes", () => {
        const app = new CApplication(createTestCanvas());

        app.run();

        expect(pendingAnimationFrameCount()).toBe(1);

        runNextAnimationFrame();

        expect(pendingAnimationFrameCount()).toBe(0);

        app.requestRepaint();

        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("stopUpdates disables updates", () => {
        const app = new CApplication(createTestCanvas());

        app.run();
        app.stopUpdates();

        expect(app.updatesEnabled()).toBe(false);
    });

    test("stopUpdates cancels a pending repaint", () => {
        const app = new CApplication(createTestCanvas());

        app.run();

        expect(pendingAnimationFrameCount()).toBe(1);

        app.stopUpdates();

        expect(pendingAnimationFrameCount()).toBe(0);
    });

    test("requestRepaint is ignored after stopUpdates", () => {
        const app = new CApplication(createTestCanvas());

        app.run();
        app.stopUpdates();

        app.requestRepaint();

        expect(pendingAnimationFrameCount()).toBe(0);
    });

    test("updates can be started again after being stopped", () => {
        const app = new CApplication(createTestCanvas());

        app.run();
        app.stopUpdates();

        app.run();

        expect(app.updatesEnabled()).toBe(true);
        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("destroy stops updates and cancels pending repaint", () => {
        const app = new CApplication(createTestCanvas());

        app.run();

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
        app.run();
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
        dialog.setCenterOnOpen(false);

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

    test("dispatches mouse events to a child after centering an owned modal dialog", () => {
        const canvas = createTestCanvas();
        const app = new CApplication(canvas);
        vi.spyOn(app.paintDevice(), "width").mockReturnValue(1200);
        vi.spyOn(app.paintDevice(), "height").mockReturnValue(800);
        const owner = new CWidget();
        owner.setGeometry(50, 40, 700, 500);
        const dialog = new CDialog(owner);
        dialog.setGeometry(100, 100, 300, 200);
        class ClickWidget extends CWidget {
            clicked = false;
            protected override mousePressEvent(event: CMouseEvent): void {
                this.clicked = true;
                event.accept();
            }
        }
        const child = new ClickWidget(dialog);
        child.setGeometry(20, 30, 100, 40);
        dialog.exec();
        const origin = child.mapToCanvas(0, 0);
        const bounds = canvas.getBoundingClientRect();
        const logicalWidth = app.paintDevice().width();
        const logicalHeight = app.paintDevice().height();
        canvas.dispatchEvent({
            type: "pointerdown",
            clientX: bounds.left + (canvas.clientLeft || 0) +
                (origin.x() + 10) * (canvas.clientWidth || bounds.width) / logicalWidth,
            clientY: bounds.top + (canvas.clientTop || 0) +
                (origin.y() + 10) * (canvas.clientHeight || bounds.height) / logicalHeight,
            button: 0, pointerId: 1
        } as PointerEvent);
        expect(child.clicked).toBe(true);
        const dialogOrigin = dialog.mapToCanvas(0, 0);
        expect(dialogOrigin.x()).toBe(450);
        expect(dialogOrigin.y()).toBe(290);
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


describe("modal Tab focus boundaries", () => {
    let app: CApplication;
    let oldWindow: PropertyDescriptor | undefined;
    beforeEach(() => {
        oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
        Object.defineProperty(globalThis, "window", {
            value: createTestWindow(), configurable: true, writable: true
        });
        app = new CApplication(createTestCanvas());
    });
    afterEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
        else Reflect.deleteProperty(globalThis, "window");
    });
    function field(parent: CWidget | null = null): CWidget {
        const widget = new CWidget(parent);
        widget.setFocusPolicy(CFocusPolicy.StrongFocus);
        return widget;
    }
    function pressTab(backward = false) {
        const preventDefault = vi.fn();
        window.dispatchEvent({
            type: "keydown", key: "Tab", code: "Tab", shiftKey: backward,
            ctrlKey: false, altKey: false, metaKey: false, preventDefault
        } as unknown as KeyboardEvent);
        return preventDefault;
    }
    function setup(parentless = false) {
        const background = field();
        const dialog = new CDialog(parentless ? null : background);
        dialog.setGeometry(20, 20, 240, 160);
        dialog.setFocusPolicy(CFocusPolicy.NoFocus);
        const first = field(dialog);
        const second = field(dialog);
        const last = field(dialog);
        dialog.exec();
        return { background, dialog, first, second, last };
    }
    test("Tab wraps from the last modal field to the first", () => {
        const { first, last, background } = setup();
        last.setFocus();
        expect(pressTab()).toHaveBeenCalledOnce();
        expect(app.focusWidget()).toBe(first);
        expect(background.hasFocus()).toBe(false);
    });
    test("Shift+Tab wraps from the first modal field to the last", () => {
        const { first, last } = setup();
        first.setFocus();
        pressTab(true);
        expect(app.focusWidget()).toBe(last);
    });
    test("repeated traversal stays in the dialog in both directions", () => {
        const { first, second, last } = setup();
        first.setFocus();
        for (const expected of [second, last, first, second, last, first]) {
            pressTab(); expect(app.focusWidget()).toBe(expected);
        }
        for (const expected of [last, second, first, last, second, first]) {
            pressTab(true); expect(app.focusWidget()).toBe(expected);
        }
    });
    test("parentless modal dialogs participate in focus traversal", () => {
        const { first, last } = setup(true);
        last.setFocus();
        pressTab();
        expect(app.focusWidget()).toBe(first);
    });
    test("Tab enters the first field when the dialog itself has focus", () => {
        const { first } = setup();
        pressTab();
        expect(app.focusWidget()).toBe(first);
    });
    test("Shift+Tab enters the last field when current focus is outside the chain", () => {
        const { last } = setup();
        pressTab(true);
        expect(app.focusWidget()).toBe(last);
    });
    test("public traversal uses the modal boundary too", () => {
        const { first, last } = setup();
        last.setFocus();
        expect(app.focusNextWidget()).toBe(true);
        expect(app.focusWidget()).toBe(first);
        expect(app.focusNextWidget(false)).toBe(true);
        expect(app.focusWidget()).toBe(last);
    });
    test("stale focus in an accepting background widget cannot swallow modal Tab", () => {
        class AcceptsKeys extends CWidget {
            presses = 0;
            protected override keyPressEvent(event: CKeyEvent): void {
                ++this.presses; event.accept();
            }
        }
        const { first } = setup();
        const background = new AcceptsKeys();
        background.setFocusPolicy(CFocusPolicy.StrongFocus);
        background.setFocus();
        pressTab();
        expect(background.presses).toBe(0);
        expect(app.focusWidget()).toBe(first);
    });
    test("unhandled dialog keys do not bubble to its background owner", () => {
        class Owner extends CWidget {
            presses = 0;
            protected override keyPressEvent(event: CKeyEvent): void {
                ++this.presses; event.accept();
            }
        }
        const owner = new Owner();
        const dialog = new CDialog(owner);
        dialog.setGeometry(20, 20, 240, 160);
        const inside = field(dialog);
        dialog.exec(); inside.setFocus();
        pressTab();
        expect(owner.presses).toBe(0);
        expect(app.focusWidget()).toBe(inside);
    });
    test("only the topmost nested modal dialog receives Tab", () => {
        const { dialog, first } = setup();
        const nested = new CDialog(dialog);
        nested.setGeometry(30, 30, 160, 100);
        nested.setFocusPolicy(CFocusPolicy.NoFocus);
        const a = field(nested);
        const b = field(nested);
        nested.exec(); b.setFocus();
        pressTab();
        expect(app.focusWidget()).toBe(a);
        nested.close(); first.setFocus();
        pressTab();
        expect(app.focusWidget()!.parent()).toBe(dialog);
    });
    test("the top popup has its own Tab cycle above a modal dialog", () => {
        const { first } = setup();
        const popup = new CPopupWidget();
        popup.setGeometry(30, 30, 120, 80);
        popup.setFocusPolicy(CFocusPolicy.NoFocus);
        const a = field(popup);
        const b = field(popup);
        popup.show(); app.registerPopupWidget(popup); b.setFocus();
        pressTab();
        expect(app.focusWidget()).toBe(a);
        pressTab(true);
        expect(app.focusWidget()).toBe(b);
        app.unregisterPopupWidget(popup); popup.hide(); first.setFocus();
        pressTab(true);
        expect(app.focusWidget()!.parent()).toBe(first.parent());
        popup.destroy();
    });
    test("hidden and disabled containers exclude all their children", () => {
        const { dialog, first, second, last } = setup();
        second.hide(); last.setEnabled(false);
        const hidden = new CWidget(dialog);
        field(hidden); hidden.hide();
        const disabled = new CWidget(dialog);
        field(disabled); disabled.setEnabled(false);
        first.setFocus();
        pressTab();
        expect(app.focusWidget()).toBe(first);
        pressTab(true);
        expect(app.focusWidget()).toBe(first);
    });
    test("a container without TabFocus still allows traversal to its visible children", () => {
        const { dialog, first, second, last } = setup();
        second.hide(); last.hide();
        const group = new CWidget(dialog);
        group.setFocusPolicy(CFocusPolicy.NoFocus);
        const child = field(group);
        first.setFocus(); pressTab();
        expect(app.focusWidget()).toBe(child);
        pressTab(); expect(app.focusWidget()).toBe(first);
    });
    test("a modal dialog with no focusable fields still prevents browser Tab", () => {
        const { dialog, first, second, last } = setup();
        for (const widget of [first, second, last]) widget.setFocusPolicy(CFocusPolicy.NoFocus);
        dialog.setFocus();
        expect(app.focusWidget()).toBeNull();
        expect(pressTab()).toHaveBeenCalledOnce();
        expect(pressTab(true)).toHaveBeenCalledOnce();
        expect(app.focusWidget()).toBeNull();
        expect(app.focusNextWidget()).toBe(false);
    });
    test("an accepted Tab inside a modal field still overrides traversal", () => {
        class HandlesTab extends CWidget {
            protected override keyPressEvent(event: CKeyEvent): void {
                if (event.key() === "Tab") event.accept(); else event.ignore();
            }
        }
        const { dialog } = setup();
        const field = new HandlesTab(dialog);
        field.setFocusPolicy(CFocusPolicy.StrongFocus); field.setFocus();
        pressTab();
        expect(app.focusWidget()).toBe(field);
    });
    test("closing the modal makes background widgets reachable again", () => {
        const { dialog, background } = setup();
        const outside = field();
        dialog.close(); background.setFocus();
        pressTab(); expect(app.focusWidget()).toBe(outside);
    });
    test("parentless non-modal windows are included without duplicating owned windows", () => {
        const owner = new CWidget();
        owner.setFocusPolicy(CFocusPolicy.NoFocus);
        const a = field(owner);
        const owned = new CDialog(owner);
        owned.setGeometry(20, 20, 200, 100);
        owned.setFocusPolicy(CFocusPolicy.NoFocus);
        const b = field(owned); owned.open();
        const separate = new CDialog();
        separate.setGeometry(20, 20, 200, 100);
        separate.setFocusPolicy(CFocusPolicy.NoFocus);
        const c = field(separate); separate.open();
        a.setFocus();
        for (const expected of [b, c, a]) {
            pressTab(); expect(app.focusWidget()).toBe(expected);
        }
    });
});

describe("custom Tab order dispatch", () => {
    let app: CApplication;
    let oldWindow: PropertyDescriptor | undefined;
    beforeEach(() => {
        oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
        Object.defineProperty(globalThis, "window", {
            value: createTestWindow(), configurable: true, writable: true
        });
        app = new CApplication(createTestCanvas());
    });
    afterEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
        else Reflect.deleteProperty(globalThis, "window");
    });
    function field(parent: CWidget): CWidget {
        const widget = new CWidget(parent);
        widget.setFocusPolicy(CFocusPolicy.StrongFocus);
        return widget;
    }
    function pressTab(shiftKey = false) {
        const preventDefault = vi.fn();
        window.dispatchEvent({ type: "keydown", key: "Tab", shiftKey,
            ctrlKey: false, altKey: false, metaKey: false, preventDefault
        } as unknown as KeyboardEvent);
        return preventDefault;
    }
    function setup(parent: CWidget | null = null) {
        const dialog = new CDialog(parent);
        const a = field(dialog), b = field(dialog), c = field(dialog);
        CWidget.setTabOrder(a, c);
        CWidget.setTabOrder(c, b);
        dialog.exec();
        return { dialog, a, b, c };
    }
    test("Tab and Shift+Tab follow custom order and wrap inside a modal dialog", () => {
        const root = new CWidget();
        const outside = field(root);
        const { a, b, c } = setup(root);
        a.setFocus();
        for (const expected of [c, b, a]) {
            expect(pressTab()).toHaveBeenCalledOnce();
            expect(app.focusWidget()).toBe(expected);
        }
        for (const expected of [b, c, a]) {
            expect(pressTab(true)).toHaveBeenCalledOnce();
            expect(app.focusWidget()).toBe(expected);
        }
        expect(outside.hasFocus()).toBe(false);
    });
    test("order configured before opening a parentless dialog is retained", () => {
        const { a, b, c } = setup();
        a.setFocus(); pressTab(); expect(app.focusWidget()).toBe(c);
        pressTab(); expect(app.focusWidget()).toBe(b);
        pressTab(); expect(app.focusWidget()).toBe(a);
    });
    test("initial Tab chooses the first custom field and initial Shift+Tab the last", () => {
        const { dialog, a, b, c } = setup();
        CWidget.setTabOrder(c, a);
        CWidget.setTabOrder(a, b);
        app.setFocusWidget(null);
        pressTab(); expect(app.focusWidget()).toBe(c);
        app.setFocusWidget(null);
        pressTab(true); expect(app.focusWidget()).toBe(b);
        dialog.close();
    });
    test("hidden and disabled fields are skipped during actual key dispatch", () => {
        const { a, b, c } = setup();
        c.hide(); a.setFocus(); pressTab(); expect(app.focusWidget()).toBe(b);
        c.show(); b.setEnabled(false);
        a.setFocus(); pressTab(); expect(app.focusWidget()).toBe(c);
        pressTab(); expect(app.focusWidget()).toBe(a);
        b.setEnabled(true);
        pressTab(); pressTab(); expect(app.focusWidget()).toBe(b);
    });
    test("nested modal dialogs retain independent custom navigation", () => {
        const outer = setup();
        const inner = setup(outer.dialog);
        inner.a.setFocus(); pressTab(); expect(app.focusWidget()).toBe(inner.c);
        pressTab(); expect(app.focusWidget()).toBe(inner.b);
        pressTab(); expect(app.focusWidget()).toBe(inner.a);
        inner.dialog.close();
        outer.a.setFocus(); pressTab(); expect(app.focusWidget()).toBe(outer.c);
    });
    test("an open popup traps custom navigation until it closes", () => {
        const outer = setup();
        const popup = new CPopupWidget();
        const a = field(popup), b = field(popup), c = field(popup);
        CWidget.setTabOrder(a, c);
        popup.open();
        a.setFocus(); pressTab(); expect(app.focusWidget()).toBe(c);
        pressTab(); expect(app.focusWidget()).toBe(b);
        pressTab(); expect(app.focusWidget()).toBe(a);
        popup.close();
        outer.a.setFocus(); pressTab(); expect(app.focusWidget()).toBe(outer.c);
    });
    test("closing and reopening a dialog preserves its custom order", () => {
        const { dialog, a, c } = setup();
        dialog.close(); dialog.exec();
        a.setFocus(); pressTab(); expect(app.focusWidget()).toBe(c);
    });
    test("widgets that accept Tab retain control of the key", () => {
        class HandlesTab extends CWidget {
            protected override keyPressEvent(event: CKeyEvent): void {
                if (event.key() === "Tab") event.accept(); else event.ignore();
            }
        }
        const { dialog, a, c } = setup();
        const handler = new HandlesTab(dialog);
        handler.setFocusPolicy(CFocusPolicy.StrongFocus);
        CWidget.setTabOrder(handler, c);
        handler.setFocus();
        expect(pressTab()).toHaveBeenCalledOnce();
        expect(app.focusWidget()).toBe(handler);
        a.setFocus();
    });
});

describe("label buddy mnemonic dispatch", () => {
    let app: CApplication;
    let oldWindow: PropertyDescriptor | undefined;
    beforeEach(() => {
        oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
        Object.defineProperty(globalThis, "window", {
            value: createTestWindow(), configurable: true, writable: true
        });
        app = new CApplication(createTestCanvas());
    });
    afterEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
        else Reflect.deleteProperty(globalThis, "window");
    });
    function field(parent: CWidget): CWidget {
        const field = new CWidget(parent); field.setFocusPolicy(CFocusPolicy.StrongFocus); return field;
    }
    function pair(parent: CWidget, text = "&Name") {
        const label = new CLabel(parent); const buddy = field(parent);
        label.setText(text); label.setBuddy(buddy); return { label, buddy };
    }
    function press(key = "n", options: Partial<KeyboardEvent> = {}) {
        const preventDefault = vi.fn();
        window.dispatchEvent({ type: "keydown", key, altKey: true, ctrlKey: false,
            shiftKey: false, metaKey: false, preventDefault, ...options } as unknown as KeyboardEvent);
        return preventDefault;
    }
    test("Alt focuses a sibling buddy and prevents the browser action", () => {
        const root = new CWidget(); const first = field(root); const { buddy } = pair(root);
        first.setFocus(); expect(press()).toHaveBeenCalledOnce(); expect(app.focusWidget()).toBe(buddy);
    });
    test("Alt+C and Alt+O focus the internal inputs of composite buddies", () => {
        const root = new CWidget();
        for (const [text, key] of [["&Country", "c"], ["&Occupation", "o"]]) {
            const { buddy } = pair(root, text!); buddy.setFocusPolicy(CFocusPolicy.NoFocus);
            const input = new CWidget(buddy); input.setFocusPolicy(CFocusPolicy.StrongFocus);
            expect(press(key!)).toHaveBeenCalledOnce(); expect(input.hasFocus()).toBe(true);
        }
    });
    test("duplicate mnemonics cycle through composite inputs", () => {
        const root = new CWidget(); const inputs: CWidget[] = [];
        for (let i = 0; i < 2; ++i) {
            const { buddy } = pair(root, "&Country"); buddy.setFocusPolicy(CFocusPolicy.NoFocus);
            const input = new CWidget(buddy); input.setFocusPolicy(CFocusPolicy.StrongFocus); inputs.push(input);
        }
        press("c"); expect(app.focusWidget()).toBe(inputs[0]);
        press("c"); expect(app.focusWidget()).toBe(inputs[1]);
        press("c"); expect(app.focusWidget()).toBe(inputs[0]);
    });
    test("mnemonics work when the current focus is null", () => {
        const root = new CWidget(); const { buddy } = pair(root);
        expect(press()).toHaveBeenCalledOnce(); expect(app.focusWidget()).toBe(buddy);
    });
    test("Unicode letters and uppercase event keys match", () => {
        const root = new CWidget(); const { buddy } = pair(root, "&Čas");
        expect(press("Č")).toHaveBeenCalledOnce(); expect(app.focusWidget()).toBe(buddy);
    });
    test("plain keys, Ctrl+Alt, Shift+Alt, Meta+Alt and AltGraph do not activate a buddy", () => {
        const root = new CWidget(); const { buddy } = pair(root);
        const variants: Partial<KeyboardEvent>[] = [
            { altKey: false }, { ctrlKey: true }, { shiftKey: true }, { metaKey: true },
            { getModifierState: (key: string) => key === "AltGraph" }
        ];
        for (const options of variants) {
            expect(press("n", options)).not.toHaveBeenCalled(); expect(buddy.hasFocus()).toBe(false);
        }
    });
    test("unmatched keys and key releases are not consumed", () => {
        const root = new CWidget(); const { buddy } = pair(root);
        expect(press("x")).not.toHaveBeenCalled();
        expect(press("n", { type: "keyup" })).not.toHaveBeenCalled();
        expect(buddy.hasFocus()).toBe(false);
    });
    test("changing text, clearing and replacing the buddy updates dispatch immediately", () => {
        const root = new CWidget(); const { label, buddy } = pair(root);
        label.setText("&Age"); expect(press()).not.toHaveBeenCalled();
        expect(press("a")).toHaveBeenCalledOnce();
        app.setFocusWidget(null); label.setBuddy(null);
        expect(press("a")).not.toHaveBeenCalled();
        const replacement = field(root); label.setBuddy(replacement);
        expect(press("a")).toHaveBeenCalledOnce(); expect(replacement.hasFocus()).toBe(true);
        expect(buddy.hasFocus()).toBe(false);
    });
    test("hidden and disabled labels, buddies and parent containers are ignored", () => {
        const root = new CWidget(); const group = new CWidget(root); const { label, buddy } = pair(group);
        field(root).setFocus();
        for (const widget of [label, buddy, group]) {
            widget.hide(); expect(press()).not.toHaveBeenCalled(); widget.show();
            widget.setEnabled(false); expect(press()).not.toHaveBeenCalled(); widget.setEnabled(true);
        }
        expect(press()).toHaveBeenCalledOnce(); expect(buddy.hasFocus()).toBe(true);
    });
    test("a modal dialog blocks mnemonics belonging to its background owner", () => {
        const root = new CWidget(); const outside = pair(root); const dialog = new CDialog(root);
        const inside = pair(dialog); dialog.exec();
        outside.buddy.setFocus(); // Deliberately stale background focus.
        expect(press()).toHaveBeenCalledOnce(); expect(inside.buddy.hasFocus()).toBe(true);
        inside.label.setBuddy(null);
        expect(press()).not.toHaveBeenCalled(); expect(outside.buddy.hasFocus()).toBe(false);
    });
    test("only the top nested modal dialog can activate a mnemonic", () => {
        const root = new CWidget(); const outer = new CDialog(root); const a = pair(outer); outer.exec();
        const inner = new CDialog(outer); const b = pair(inner); inner.exec();
        press(); expect(b.buddy.hasFocus()).toBe(true); expect(a.buddy.hasFocus()).toBe(false);
        inner.close(); a.buddy.setFocus(); press(); expect(a.buddy.hasFocus()).toBe(true);
    });
    test("an open popup isolates mnemonics from the dialog below it", () => {
        const dialog = new CDialog(); const outside = pair(dialog); dialog.exec();
        const popup = new CPopupWidget(); const inside = pair(popup); popup.open();
        press(); expect(inside.buddy.hasFocus()).toBe(true); expect(outside.buddy.hasFocus()).toBe(false);
        popup.close(); press(); expect(outside.buddy.hasFocus()).toBe(true);
    });
    test("mnemonics stay in the focused non-modal window", () => {
        const root = new CWidget(); const a = pair(root); const dialog = new CDialog(root);
        const b = pair(dialog); dialog.open(); b.buddy.setFocus();
        press(); expect(b.buddy.hasFocus()).toBe(true); expect(a.buddy.hasFocus()).toBe(false);
        a.buddy.setFocus(); press(); expect(a.buddy.hasFocus()).toBe(true);
    });
    test("duplicate mnemonics cycle through eligible buddies", () => {
        const root = new CWidget(); const a = pair(root); const b = pair(root, "&Number");
        press(); expect(a.buddy.hasFocus()).toBe(true);
        press(); expect(b.buddy.hasFocus()).toBe(true);
        press(); expect(a.buddy.hasFocus()).toBe(true);
        b.buddy.setEnabled(false); press(); expect(a.buddy.hasFocus()).toBe(true);
    });
    test("explicit shortcuts take precedence over label mnemonics", () => {
        const root = new CWidget(); const first = field(root); const { buddy } = pair(root);
        const shortcut = new CShortcut("Alt+N", root); const activated = vi.fn();
        shortcut.activated.connect(activated); first.setFocus();
        expect(press()).toHaveBeenCalledOnce(); expect(activated).toHaveBeenCalledOnce();
        expect(buddy.hasFocus()).toBe(false);
    });
    test("shortcut recording suppresses label mnemonics", () => {
        class Recorder extends CWidget { capturesShortcuts(): boolean { return true; } }
        const root = new CWidget(); const { buddy } = pair(root); const recorder = new Recorder(root);
        recorder.setFocusPolicy(CFocusPolicy.StrongFocus); recorder.setFocus(); press();
        expect(recorder.hasFocus()).toBe(true); expect(buddy.hasFocus()).toBe(false);
    });
    test("destroyed labels and buddies cannot be activated", () => {
        const root = new CWidget(); const a = pair(root); a.buddy.destroy();
        expect(press()).not.toHaveBeenCalled();
        const b = pair(root); b.label.destroy(); expect(press()).not.toHaveBeenCalled();
    });
    test("mnemonics do not take keys from native DOM editors", () => {
        const root = new CWidget(); const { buddy } = pair(root);
        expect(press("n", { target: { tagName: "INPUT", isContentEditable: false } as unknown as EventTarget }))
            .not.toHaveBeenCalled();
        expect(buddy.hasFocus()).toBe(false);
    });
});

describe("dialog default button key dispatch", () => {
    let app: CApplication;
    let oldWindow: PropertyDescriptor | undefined;
    beforeEach(() => {
        oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
        Object.defineProperty(globalThis, "window", {
            value: createTestWindow(), configurable: true, writable: true
        });
        app = new CApplication(createTestCanvas());
    });
    afterEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
        else Reflect.deleteProperty(globalThis, "window");
    });
    function field(parent: CWidget): CWidget {
        const widget = new CWidget(parent); widget.setFocusPolicy(CFocusPolicy.StrongFocus); return widget;
    }
    function setup(parent: CWidget | null = null, modal = true) {
        const dialog = new CDialog(parent); dialog.setGeometry(20, 20, 400, 250);
        const input = field(dialog); const button = new CPushButton(dialog); const clicked = vi.fn();
        button.clicked.connect(clicked); button.setDefault(true);
        if (modal) dialog.exec(); else dialog.open();
        input.setFocus(); return { dialog, input, button, clicked };
    }
    function press(key = "Enter", options: Partial<KeyboardEvent> = {}) {
        const preventDefault = vi.fn();
        window.dispatchEvent({ type: "keydown", key, altKey: false, ctrlKey: false,
            shiftKey: false, metaKey: false, preventDefault, ...options } as unknown as KeyboardEvent);
        return preventDefault;
    }
    test("unhandled Enter activates the default once and leaves focus in its field", () => {
        const { input, clicked } = setup(); expect(press()).toHaveBeenCalledOnce();
        expect(clicked).toHaveBeenCalledOnce(); expect(app.focusWidget()).toBe(input);
        press("Enter", { type: "keyup" }); expect(clicked).toHaveBeenCalledOnce();
    });
    test("Return uses the same fallback as Enter", () => {
        const { clicked } = setup(); expect(press("Return")).toHaveBeenCalledOnce(); expect(clicked).toHaveBeenCalledOnce();
    });
    test("a focused secondary button handles Enter itself", () => {
        const { dialog, clicked } = setup(); const other = new CPushButton(dialog); const otherClicked = vi.fn();
        other.clicked.connect(otherClicked); other.setFocus();
        press(); expect(otherClicked).toHaveBeenCalledOnce(); expect(clicked).not.toHaveBeenCalled();
    });
    test("a default button with focus is not activated twice", () => {
        const { button, clicked } = setup(); button.setFocus(); press(); expect(clicked).toHaveBeenCalledOnce();
    });
    test("an editor that consumes Enter prevents default activation", () => {
        class Consumer extends CWidget {
            protected override keyPressEvent(event: CKeyEvent): void {
                if (event.key() === "Enter") event.accept(); else event.ignore();
            }
        }
        const { dialog, clicked } = setup(); const editor = new Consumer(dialog);
        editor.setFocusPolicy(CFocusPolicy.StrongFocus); editor.setFocus(); press();
        expect(clicked).not.toHaveBeenCalled(); expect(editor.hasFocus()).toBe(true);
    });
    test("CTextEdit keeps Enter for inserting a newline", () => {
        const { dialog, clicked } = setup(); const editor = new CTextEdit(dialog);
        editor.setGeometry(0, 0, 200, 100); editor.setPlainText(""); editor.setFocus(); press();
        expect(editor.toPlainText()).toBe("\n"); expect(clicked).not.toHaveBeenCalled();
    });
    test("CNumberEdit confirms its expression without submitting the dialog", () => {
        const { dialog, clicked } = setup(); const editor = new CNumberEdit(dialog);
        editor.setExpression("41+3"); const finished = vi.fn(); editor.editingFinished.connect(finished);
        editor.setFocus(); press();
        expect(editor.value()).toBe(44); expect(finished).toHaveBeenCalledOnce(); expect(clicked).not.toHaveBeenCalled();
    });
    test("a popup blocks the dialog default even when it ignores Enter", () => {
        const { clicked } = setup(); const popup = new CPopupWidget(); const input = field(popup);
        popup.open(); input.setFocus(); press(); expect(clicked).not.toHaveBeenCalled();
        popup.close(); press(); expect(clicked).toHaveBeenCalledOnce();
    });
    test("nested modal dialogs activate only the inner default", () => {
        const outer = setup(); const inner = setup(outer.dialog); press();
        expect(inner.clicked).toHaveBeenCalledOnce(); expect(outer.clicked).not.toHaveBeenCalled();
        inner.dialog.close(); outer.input.setFocus(); press(); expect(outer.clicked).toHaveBeenCalledOnce();
    });
    test("a nested non-modal window without a default cannot trigger its owner", () => {
        const outer = setup(null, false); const child = new CDialog(outer.dialog);
        child.setGeometry(30, 30, 200, 100); const input = field(child); child.open(); input.setFocus();
        press(); expect(outer.clicked).not.toHaveBeenCalled();
    });
    test("a background default cannot activate while a modal dialog is open", () => {
        const outer = setup(null, false); const inner = setup(outer.dialog);
        outer.input.setFocus(); press(); expect(inner.clicked).toHaveBeenCalledOnce();
        expect(outer.clicked).not.toHaveBeenCalled();
    });
    test("explicit shortcuts take precedence over default activation", () => {
        const { dialog, clicked } = setup(); const shortcut = new CShortcut("Enter", dialog); const activated = vi.fn();
        shortcut.activated.connect(activated); press(); expect(activated).toHaveBeenCalledOnce();
        expect(clicked).not.toHaveBeenCalled();
    });
    test("native DOM editors do not submit a CT dialog", () => {
        const { clicked } = setup();
        expect(press("Enter", { target: { tagName: "INPUT" } as unknown as EventTarget })).not.toHaveBeenCalled();
        expect(clicked).not.toHaveBeenCalled();
    });
});

describe("focus proxy navigation", () => {
    let app: CApplication;
    let oldWindow: PropertyDescriptor | undefined;
    beforeEach(() => {
        oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
        Object.defineProperty(globalThis, "window", { value: createTestWindow(), configurable: true, writable: true });
        app = new CApplication(createTestCanvas());
    });
    afterEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
        else Reflect.deleteProperty(globalThis, "window");
    });
    function field(parent: CWidget): CWidget {
        const widget = new CWidget(parent); widget.setFocusPolicy(CFocusPolicy.StrongFocus); return widget;
    }
    function setup() {
        const dialog = new CDialog(); dialog.setGeometry(20, 20, 400, 250);
        const first = field(dialog); const composite = field(dialog); const editor = field(composite);
        composite.setFocusProxy(editor); const last = field(dialog); dialog.exec();
        return { dialog, first, composite, editor, last };
    }
    function tab(shiftKey = false) {
        const preventDefault = vi.fn();
        window.dispatchEvent({ type: "keydown", key: "Tab", altKey: false, ctrlKey: false,
            shiftKey, metaKey: false, preventDefault } as unknown as KeyboardEvent);
        return preventDefault;
    }
    test("application-level focus assignment resolves the proxy", () => {
        const { composite, editor } = setup(); app.setFocusWidget(composite); expect(app.focusWidget()).toBe(editor);
    });
    test("Tab and Shift+Tab visit a composite only once", () => {
        const { first, editor, last } = setup(); first.setFocus();
        for (const expected of [editor, last, first]) { expect(tab()).toHaveBeenCalledOnce(); expect(app.focusWidget()).toBe(expected); }
        for (const expected of [last, editor, first]) { tab(true); expect(app.focusWidget()).toBe(expected); }
    });
    test("custom order moves the logical composite rather than leaving its input behind", () => {
        const { first, composite, editor, last } = setup();
        CWidget.setTabOrder(first, last); CWidget.setTabOrder(last, composite);
        first.setFocus(); tab(); expect(app.focusWidget()).toBe(last);
        tab(); expect(app.focusWidget()).toBe(editor); tab(); expect(app.focusWidget()).toBe(first);
        tab(true); expect(app.focusWidget()).toBe(editor); tab(true); expect(app.focusWidget()).toBe(last);
    });
    test("proxy chains still create one Tab stop", () => {
        const { first, composite, editor, last } = setup(); const middle = field(composite);
        middle.setFocusProxy(editor); composite.setFocusProxy(middle); first.setFocus();
        tab(); expect(app.focusWidget()).toBe(editor); tab(); expect(app.focusWidget()).toBe(last);
    });
    test("unavailable targets are skipped without consuming an extra Tab", () => {
        const { first, editor, last } = setup(); editor.hide(); first.setFocus(); tab(); expect(app.focusWidget()).toBe(last);
        editor.show(); editor.setEnabled(false); first.setFocus(); tab(); expect(app.focusWidget()).toBe(last);
    });
    test("buddy activation follows the explicit proxy instead of the first child", () => {
        const { dialog, composite, editor } = setup(); const other = field(composite);
        composite.setFocusProxy(other); const label = new CLabel(dialog); label.setText("&Input"); label.setBuddy(composite);
        expect(label.activateBuddy()).toBe(true); expect(app.focusWidget()).toBe(other); expect(editor.hasFocus()).toBe(false);
    });
    test("the proxy cannot take Tab or buddy focus outside the active dialog", () => {
        const root = new CWidget(); const outside = field(root); const dialog = new CDialog(root);
        const composite = field(dialog); composite.setFocusProxy(outside); const inside = field(dialog);
        const label = new CLabel(dialog); label.setText("&Input"); label.setBuddy(composite); dialog.exec();
        expect(label.activateBuddy()).toBe(false); inside.setFocus(); tab(); expect(app.focusWidget()).toBe(inside);
    });
    test("an open popup keeps proxy traversal inside the popup", () => {
        const { first } = setup(); const popup = new CPopupWidget(); const owner = field(popup);
        const editor = field(owner); owner.setFocusProxy(editor); popup.open(); editor.setFocus();
        tab(); expect(app.focusWidget()).toBe(editor); tab(true); expect(app.focusWidget()).toBe(editor);
        popup.close(); first.setFocus(); expect(first.hasFocus()).toBe(true);
    });
    test("shared proxy targets are deduplicated", () => {
        const { first, composite, editor, last, dialog } = setup(); const alias = field(dialog); alias.setFocusProxy(editor);
        first.setFocus(); tab(); expect(app.focusWidget()).toBe(editor); tab(); expect(app.focusWidget()).toBe(last);
        tab(); expect(app.focusWidget()).toBe(first); expect(composite.hasFocus()).toBe(false);
    });
});

describe("native clipboard copy policy", () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, "window", {
            value: createTestWindow(), writable: true, configurable: true
        });
        new CApplication(createTestCanvas());
    });
    afterEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
    });
    function clipboard(type: "copy" | "cut" | "paste", value = "pasted") {
        const setData = vi.fn(), preventDefault = vi.fn();
        window.dispatchEvent({ type, defaultPrevented: false, target: null, preventDefault,
            clipboardData: { types: ["text/plain"], setData, getData: () => value }
        } as unknown as ClipboardEvent);
        return { setData, preventDefault };
    }
    function focused(mode: CEchoMode) {
        const edit = new CLineEdit(); edit.setText("secret");
        edit.setEchoMode(mode); edit.selectAll(); edit.setFocus(); return edit;
    }
    test("Password blocks native Copy and Cut before writing clipboard data", () => {
        const edit = focused(CEchoMode.Password);
        for (const kind of ["copy", "cut"] as const) {
            const result = clipboard(kind);
            expect(result.setData).not.toHaveBeenCalled();
            expect(result.preventDefault).toHaveBeenCalledOnce();
        }
        expect(edit.text()).toBe("secret"); expect(edit.canUndo()).toBe(false);
    });
    test("NoEcho blocks native Copy and Cut before writing clipboard data", () => {
        const edit = focused(CEchoMode.NoEcho);
        for (const kind of ["copy", "cut"] as const) {
            const result = clipboard(kind);
            expect(result.setData).not.toHaveBeenCalled();
            expect(result.preventDefault).toHaveBeenCalledOnce();
        }
        expect(edit.text()).toBe("secret");
    });
    test("Normal still copies selected text to the native clipboard", () => {
        const edit = focused(CEchoMode.Normal); const result = clipboard("copy");
        expect(result.setData).toHaveBeenCalledWith("text/plain", "secret");
        expect(result.preventDefault).toHaveBeenCalledOnce(); expect(edit.text()).toBe("secret");
    });
    test("native copy serializes a sparse table selection without handling cut or paste", () => {
        class Model extends CAbstractTableModel {
            override rowCount(): number { return 2; }
            override columnCount(): number { return 2; }
            override data(index: CModelIndex): string {
                return index.row() === 0 ? "A\tB" : 'C"D';
            }
        }

        const table = new CTableView();
        table.resize(500, 200);
        const model = new Model();
        table.setModel(model);
        table.contentMousePressEvent(new CMouseEvent(CEventType.MousePress, 5, 5, CMouseButton.LeftButton));
        table.selectionModel()!.select(model.index(1, 1));

        const result = clipboard("copy");
        const expected = '"A\tB"\t\r\n\t"C""D"';
        expect(result.setData).toHaveBeenCalledWith("text/plain", expected);
        expect(result.preventDefault).toHaveBeenCalledOnce();
        expect(CClipboard.instance().text()).toBe(expected);

        for (const kind of ["cut", "paste"] as const) {
            const ignored = clipboard(kind);
            expect(ignored.setData).not.toHaveBeenCalled();
            expect(ignored.preventDefault).not.toHaveBeenCalled();
        }
    });

    test("native table paste validates the entire block and writes through sorted coordinates", () => {
        class Model extends CAbstractTableModel {
            readonly values = [["B", "1"], ["A", "2"]];
            override rowCount(): number { return this.values.length; }
            override columnCount(): number { return 2; }
            override isEditable(): boolean { return true; }
            override data(index: CModelIndex): string | undefined {
                return this.values[index.row()]?.[index.column()];
            }
            override applyTextEdits(edits: readonly CItemTextEdit[]): CItemTextEditError | null {
                const editIndex = edits.findIndex(edit =>
                    edit.index.column() === 1 && !/^\d+$/.test(edit.text));
                if (editIndex >= 0) return { editIndex, message: "Expected digits." };
                for (const { index, text } of edits) this.values[index.row()]![index.column()] = text;
                this.emitDataChanged(this.index(0, 0), this.index(1, 1));
                return null;
            }
        }

        const table = new CTableView();
        table.resize(500, 200);
        const model = new Model();
        const proxy = new CSortFilterProxyModel();
        proxy.setSourceModel(model);
        proxy.sort(0);
        table.setModel(proxy);
        table.contentMousePressEvent(new CMouseEvent(CEventType.MousePress, 5, 5, CMouseButton.LeftButton));

        const reject = vi.fn();
        table.pasteRejected.connect(reject);
        clipboard("paste", "Z\t10\r\nY\tabc");
        expect(reject).toHaveBeenCalledWith(1, 1, "Expected digits.");
        expect(model.values).toEqual([["B", "1"], ["A", "2"]]);

        const result = clipboard("paste", '"Z\t""hi"""\t10\r\n"Y\nQ"\t20\r\n');
        expect(result.preventDefault).toHaveBeenCalledOnce();
        expect(model.values).toEqual([["Y\nQ", "20"], ['Z\t"hi"', "10"]]);
    });

    test("Normal native Cut deletes the selection and is undoable", () => {
        const edit = focused(CEchoMode.Normal); const result = clipboard("cut");
        expect(result.setData).toHaveBeenCalledWith("text/plain", "secret");
        expect(edit.text()).toBe(""); edit.undo(); expect(edit.text()).toBe("secret");
    });
    test("copy restrictions do not block native Paste into hidden inputs", () => {
        for (const mode of [CEchoMode.Password, CEchoMode.NoEcho]) {
            const edit = focused(mode); const result = clipboard("paste", "new secret");
            expect(result.preventDefault).toHaveBeenCalledOnce(); expect(edit.text()).toBe("new secret");
        }
    });
    test("switching back to Normal restores native Copy", () => {
        const edit = focused(CEchoMode.Password); clipboard("copy");
        edit.setEchoMode(CEchoMode.Normal); const result = clipboard("copy");
        expect(result.setData).toHaveBeenCalledWith("text/plain", "secret");
    });
});


describe("CApplication live themes", () => {

    const role = CPaletteColorRole.Base;
    function theme(hex: string): CPalette {
        const palette = new CPalette(); const color = new CColor(); color.setColor(hex);
        palette.setColor(role, color); return palette;
    }
    function base(widget: CWidget): string { return widget.palette().color(role).toHex(); }
    beforeEach(() => { new CApplication(createTestCanvas()); });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });

    test("theme replacement reaches existing, hidden and newly created widgets", () => {
        const app = CApplication.instance(), root = new CWidget(), child = new CWidget(root);
        child.hide(); app.setPalette(theme("#123456"));
        expect(base(root)).toBe("#123456"); expect(base(child)).toBe("#123456");
        expect(base(new CWidget(root))).toBe("#123456");
    });
    test("theme replacement preserves explicit widget palettes", () => {
        const app = CApplication.instance(), root = new CWidget(), local = new CWidget(root);
        local.setPalette(theme("#abcdef")); app.setPalette(theme("#123456"));
        expect(base(root)).toBe("#123456"); expect(base(local)).toBe("#abcdef");
    });
    test("reapplying a mutated palette instance schedules a repaint", () => {
        const app = CApplication.instance(), widget = new CWidget(), palette = theme("#123456");
        app.setPalette(palette); const repaint = vi.spyOn(app, "requestRepaint");
        palette.setColor(role, new CColor(171, 205, 239)); app.setPalette(palette);
        expect(base(widget)).toBe("#abcdef"); expect(repaint).toHaveBeenCalledOnce();
    });
    test("open and closed owned dialogs inherit the current theme", () => {
        const owner = new CWidget(), dialog = new CDialog(owner), field = new CWidget(dialog);
        dialog.exec(); CApplication.instance().setPalette(theme("#123456")); expect(base(field)).toBe("#123456");
        dialog.close(); CApplication.instance().setPalette(theme("#abcdef")); dialog.open(); expect(base(field)).toBe("#abcdef");
    });
    test("parentless dialog inherits despite not being in the top-level widget stack", () => {
        const dialog = new CDialog(); CApplication.instance().setPalette(theme("#123456"));
        expect(base(dialog)).toBe("#123456"); dialog.exec(); expect(base(dialog)).toBe("#123456");
    });
    test("local dialog palette and its fields survive theme replacement", () => {
        const dialog = new CDialog(), field = new CWidget(dialog); dialog.setPalette(theme("#abcdef"));
        dialog.exec(); CApplication.instance().setPalette(theme("#123456")); expect(base(field)).toBe("#abcdef");
        dialog.resetPalette(); expect(base(field)).toBe("#123456");
    });
    test("repeated light and dark switches update existing fields", () => {
        const widget = new CWidget(), app = CApplication.instance();
        for (const hex of ["#ffffff", "#191c21", "#ffffff", "#191c21"]) {
            app.setPalette(theme(hex)); expect(base(widget)).toBe(hex);
        }
    });
});
