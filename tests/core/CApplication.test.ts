import { afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication";
import { CWidget } from "../../src/widgets/CWidget";

function createCanvas(): HTMLCanvasElement {
    return {} as HTMLCanvasElement;
}

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

        // The returned array must not expose the application's internal Set.
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

    test("does not allow creating a widget without an application", () => {
        expect(CApplication.exists()).toBe(false);
        expect(() => {
            new CWidget();
        }).toThrow("CApplication has not been created.");
    });
    
});