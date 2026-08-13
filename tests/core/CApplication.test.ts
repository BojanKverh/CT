import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication";
import { CWidget } from "../../src/widgets/CWidget";
import { CPainter } from "../../src/painting/CPainter";

class RenderTrackingWidget extends CWidget {
    renderCalls = 0;

    override render(painter: CPainter): void {
        ++this.renderCalls;

        super.render(painter);
    }
}

function createCanvas(): HTMLCanvasElement {
    const context = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),

        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        clearRect: vi.fn(),

        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1
    } as unknown as CanvasRenderingContext2D;

    return {
        width: 800,
        height: 600,

        getContext: (type: string) => {
            if (type === "2d")
                return context;

            return null;
        }
    } as HTMLCanvasElement;
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
});

afterEach(() => {
    if (CApplication.exists())
        CApplication.instance().destroy();
});

describe("CApplication", () => {
    test("creates a singleton application", () => {
        const canvas = createCanvas();
        const app = new CApplication(canvas);

        expect(CApplication.exists()).toBe(true);
        expect(CApplication.instance()).toBe(app);
    });

    test("stores the canvas", () => {
        const canvas = createCanvas();
        const app = new CApplication(canvas);

        expect(app.canvas()).toBe(canvas);
    });

    test("does not allow more than one application instance", () => {
        const canvas1 = createCanvas();
        const canvas2 = createCanvas();

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
        const app = new CApplication(createCanvas());

        app.destroy();

        expect(CApplication.exists()).toBe(false);

        expect(() => {
            CApplication.instance();
        }).toThrow();
    });

    test("allows creating a new application after destroy", () => {
        const app1 = new CApplication(createCanvas());

        app1.destroy();

        const app2 = new CApplication(createCanvas());

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
        const app = new CApplication(createCanvas());

        const widget1 = new CWidget();
        const widget2 = new CWidget();

        expect(app.topLevelWidgets()).toEqual([
            widget1,
            widget2
        ]);
    });

    test("does not register child widgets as top-level widgets", () => {
        const app = new CApplication(createCanvas());

        const parent = new CWidget();
        const child = new CWidget(parent);

        expect(app.topLevelWidgets()).toEqual([
            parent
        ]);

        expect(app.topLevelWidgets()).not.toContain(child);
    });

    test("removes a top-level widget when it gets a parent", () => {
        const app = new CApplication(createCanvas());

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
        const app = new CApplication(createCanvas());

        const parent = new CWidget();
        const child = new CWidget(parent);

        child.setParent(null);

        expect(app.topLevelWidgets()).toEqual([
            parent,
            child
        ]);
    });

    test("does not duplicate a top-level widget registration", () => {
        const app = new CApplication(createCanvas());

        const widget = new CWidget();

        app.registerTopLevelWidget(widget);
        app.registerTopLevelWidget(widget);

        expect(app.topLevelWidgets()).toEqual([
            widget
        ]);
    });

    test("preserves top-level widget registration order", () => {
        const app = new CApplication(createCanvas());

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
        const app = new CApplication(createCanvas());

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
        const app = new CApplication(createCanvas());

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
        const app = new CApplication(createCanvas());

        new CWidget();
        new CWidget();

        expect(app.topLevelWidgets()).toHaveLength(2);

        app.destroy();

        expect(app.topLevelWidgets()).toHaveLength(0);
    });

    test("updates are disabled by default", () => {
        const app = new CApplication(createCanvas());

        expect(app.updatesEnabled()).toBe(false);
    });

    test("startUpdates enables updates", () => {
        const app = new CApplication(createCanvas());

        app.startUpdates();

        expect(app.updatesEnabled()).toBe(true);
    });

    test("startUpdates schedules the initial repaint", () => {
        const app = new CApplication(createCanvas());

        app.startUpdates();

        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("calling startUpdates repeatedly does not schedule additional frames", () => {
        const app = new CApplication(createCanvas());

        app.startUpdates();
        app.startUpdates();
        app.startUpdates();

        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("requestRepaint does nothing while updates are disabled", () => {
        const app = new CApplication(createCanvas());

        app.requestRepaint();

        expect(pendingAnimationFrameCount()).toBe(0);
    });

    test("coalesces multiple repaint requests into one animation frame", () => {
        const app = new CApplication(createCanvas());

        app.startUpdates();

        app.requestRepaint();
        app.requestRepaint();
        app.requestRepaint();

        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("allows another repaint after the current frame completes", () => {
        const app = new CApplication(createCanvas());

        app.startUpdates();

        expect(pendingAnimationFrameCount()).toBe(1);

        runNextAnimationFrame();

        expect(pendingAnimationFrameCount()).toBe(0);

        app.requestRepaint();

        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("stopUpdates disables updates", () => {
        const app = new CApplication(createCanvas());

        app.startUpdates();
        app.stopUpdates();

        expect(app.updatesEnabled()).toBe(false);
    });

    test("stopUpdates cancels a pending repaint", () => {
        const app = new CApplication(createCanvas());

        app.startUpdates();

        expect(pendingAnimationFrameCount()).toBe(1);

        app.stopUpdates();

        expect(pendingAnimationFrameCount()).toBe(0);
    });

    test("requestRepaint is ignored after stopUpdates", () => {
        const app = new CApplication(createCanvas());

        app.startUpdates();
        app.stopUpdates();

        app.requestRepaint();

        expect(pendingAnimationFrameCount()).toBe(0);
    });

    test("updates can be started again after being stopped", () => {
        const app = new CApplication(createCanvas());

        app.startUpdates();
        app.stopUpdates();

        app.startUpdates();

        expect(app.updatesEnabled()).toBe(true);
        expect(pendingAnimationFrameCount()).toBe(1);
    });

    test("destroy stops updates and cancels pending repaint", () => {
        const app = new CApplication(createCanvas());

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
            fillStyle: "", strokeStyle: "", lineWidth: 1
        } as unknown as CanvasRenderingContext2D;

        const canvas = {
            width: 800, height: 600,
            getContext: (type: string) => {
                if (type === "2d")
                    return context;

                return null;
            }
        } as HTMLCanvasElement;

        const app = new CApplication(canvas);

        app.startUpdates();
        runNextAnimationFrame();

        expect(clearRect).toHaveBeenCalledOnce();
        expect(clearRect).toHaveBeenCalledWith(
            0, 0, 800, 600 );
    });
});