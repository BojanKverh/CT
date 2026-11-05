import { vi } from "vitest";
import { CDefaultStyle } from "../../src/gui/CDefaultStyle.js";
import { CStyleOptionToolBoxButton } from "../../src/gui/CStyleOptionToolBoxButton.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import { CRect } from "../../src/geometry/CRect.js";
import type { CPainter } from "../../src/painting/CPainter.js";
import { CToolBoxButton } from "../../src/widgets/CToolBoxButton.js";
import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CSize } from "../../src/geometry/CSize.js";
import { CToolBox } from "../../src/widgets/CToolBox.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";


class TestWidget extends CWidget {
	#m_sizeHint: CSize;

	constructor(width: number, height: number) {
		super();

		this.#m_sizeHint = new CSize(width, height);
	}

	override sizeHint(): CSize {
		return this.#m_sizeHint;
	}
}


describe("CToolBox", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("starts empty", () => {
		const toolBox = new CToolBox();

		expect(toolBox.count()).toBe(0);
		expect(toolBox.currentIndex()).toBe(-1);
		expect(toolBox.currentWidget()).toBeNull();
	});

	test("adds item", () => {
		const toolBox = new CToolBox();
		const widget = new CWidget();

		const index = toolBox.addItem(widget, "General");

		expect(index).toBe(0);
		expect(toolBox.count()).toBe(1);
		expect(toolBox.widget(0)).toBe(widget);
		expect(toolBox.itemText(0)).toBe("General");
	});

	test("first added item becomes current", () => {
		const toolBox = new CToolBox();
		const widget = new CWidget();

		toolBox.addItem(widget, "General");

		expect(toolBox.currentIndex()).toBe(0);
		expect(toolBox.currentWidget()).toBe(widget);
		expect(widget.isVisible()).toBe(true);
	});

	test("first added item emits currentChanged", () => {
		const toolBox = new CToolBox();
		const values: number[] = [];

		toolBox.currentChanged.connect(index => values.push(index));
		toolBox.addItem(new CWidget(), "General");

		expect(values).toEqual([0]);
	});

	test("additional item does not change current item", () => {
		const toolBox = new CToolBox();
		const first = new CWidget();
		const second = new CWidget();

		toolBox.addItem(first, "First");
		toolBox.addItem(second, "Second");

		expect(toolBox.currentIndex()).toBe(0);
		expect(toolBox.currentWidget()).toBe(first);
		expect(first.isVisible()).toBe(true);
		expect(second.isVisible()).toBe(false);
	});

	test("insertItem inserts item at requested index", () => {
		const toolBox = new CToolBox();
		const first = new CWidget();
		const second = new CWidget();
		const inserted = new CWidget();

		toolBox.addItem(first, "First");
		toolBox.addItem(second, "Second");

		const index = toolBox.insertItem(1, inserted, "Inserted");

		expect(index).toBe(1);
		expect(toolBox.count()).toBe(3);
		expect(toolBox.widget(0)).toBe(first);
		expect(toolBox.widget(1)).toBe(inserted);
		expect(toolBox.widget(2)).toBe(second);
	});

	test("insertItem clamps negative index", () => {
		const toolBox = new CToolBox();
		const first = new CWidget();
		const second = new CWidget();

		toolBox.addItem(first, "First");

		expect(toolBox.insertItem(-10, second, "Second")).toBe(0);
		expect(toolBox.widget(0)).toBe(second);
		expect(toolBox.widget(1)).toBe(first);
	});

	test("insertItem clamps index above count", () => {
		const toolBox = new CToolBox();
		const first = new CWidget();
		const second = new CWidget();

		toolBox.addItem(first, "First");

		expect(toolBox.insertItem(100, second, "Second")).toBe(1);
		expect(toolBox.widget(1)).toBe(second);
	});

	test("does not insert same widget twice", () => {
		const toolBox = new CToolBox();
		const widget = new CWidget();

		expect(toolBox.addItem(widget, "First")).toBe(0);
		expect(toolBox.addItem(widget, "Second")).toBe(0);

		expect(toolBox.count()).toBe(1);
		expect(toolBox.itemText(0)).toBe("First");
	});

	test("inserting before current item preserves current widget", () => {
		const toolBox = new CToolBox();
		const first = new CWidget();
		const second = new CWidget();

		toolBox.addItem(first, "First");
		toolBox.insertItem(0, second, "Second");

		expect(toolBox.currentIndex()).toBe(1);
		expect(toolBox.currentWidget()).toBe(first);
	});

	test("setCurrentIndex changes current item", () => {
		const toolBox = new CToolBox();
		const first = new CWidget();
		const second = new CWidget();

		toolBox.addItem(first, "First");
		toolBox.addItem(second, "Second");

		toolBox.setCurrentIndex(1);

		expect(toolBox.currentIndex()).toBe(1);
		expect(toolBox.currentWidget()).toBe(second);
		expect(first.isVisible()).toBe(false);
		expect(second.isVisible()).toBe(true);
	});

	test("setCurrentIndex emits currentChanged", () => {
		const toolBox = new CToolBox();
		const values: number[] = [];

		toolBox.addItem(new CWidget(), "First");
		toolBox.addItem(new CWidget(), "Second");

		toolBox.currentChanged.connect(index => values.push(index));
		toolBox.setCurrentIndex(1);

		expect(values).toEqual([1]);
	});

	test("setCurrentIndex does nothing for current index", () => {
		const toolBox = new CToolBox();
		const values: number[] = [];

		toolBox.addItem(new CWidget(), "First");
		toolBox.currentChanged.connect(index => values.push(index));

		toolBox.setCurrentIndex(0);

		expect(values).toEqual([]);
	});

	test("setCurrentIndex ignores invalid index", () => {
		const toolBox = new CToolBox();

		toolBox.addItem(new CWidget(), "First");

		toolBox.setCurrentIndex(-1);
		expect(toolBox.currentIndex()).toBe(0);

		toolBox.setCurrentIndex(5);
		expect(toolBox.currentIndex()).toBe(0);
	});

	test("setCurrentWidget changes current item", () => {
		const toolBox = new CToolBox();
		const first = new CWidget();
		const second = new CWidget();

		toolBox.addItem(first, "First");
		toolBox.addItem(second, "Second");

		toolBox.setCurrentWidget(second);

		expect(toolBox.currentIndex()).toBe(1);
		expect(toolBox.currentWidget()).toBe(second);
	});

	test("setCurrentWidget ignores widget not in toolbox", () => {
		const toolBox = new CToolBox();
		const first = new CWidget();
		const other = new CWidget();

		toolBox.addItem(first, "First");
		toolBox.setCurrentWidget(other);

		expect(toolBox.currentIndex()).toBe(0);
		expect(toolBox.currentWidget()).toBe(first);
	});

	test("widget returns null for invalid index", () => {
		const toolBox = new CToolBox();

		expect(toolBox.widget(-1)).toBeNull();
		expect(toolBox.widget(0)).toBeNull();

		toolBox.addItem(new CWidget(), "First");

		expect(toolBox.widget(1)).toBeNull();
	});

	test("indexOf returns widget index", () => {
		const toolBox = new CToolBox();
		const first = new CWidget();
		const second = new CWidget();
		const other = new CWidget();

		toolBox.addItem(first, "First");
		toolBox.addItem(second, "Second");

		expect(toolBox.indexOf(first)).toBe(0);
		expect(toolBox.indexOf(second)).toBe(1);
		expect(toolBox.indexOf(other)).toBe(-1);
	});

	test("setItemText changes item text", () => {
		const toolBox = new CToolBox();

		toolBox.addItem(new CWidget(), "Old");
		toolBox.setItemText(0, "New");

		expect(toolBox.itemText(0)).toBe("New");
	});

	test("itemText returns empty string for invalid index", () => {
		const toolBox = new CToolBox();

		expect(toolBox.itemText(-1)).toBe("");
		expect(toolBox.itemText(0)).toBe("");
	});

	test("items are enabled by default", () => {
		const toolBox = new CToolBox();

		toolBox.addItem(new CWidget(), "First");

		expect(toolBox.isItemEnabled(0)).toBe(true);
	});

	test("setItemEnabled changes enabled state", () => {
		const toolBox = new CToolBox();

		toolBox.addItem(new CWidget(), "First");
		toolBox.setItemEnabled(0, false);

		expect(toolBox.isItemEnabled(0)).toBe(false);
	});

	test("setCurrentIndex ignores disabled item", () => {
		const toolBox = new CToolBox();

		toolBox.addItem(new CWidget(), "First");
		toolBox.addItem(new CWidget(), "Second");
		toolBox.setItemEnabled(1, false);

		toolBox.setCurrentIndex(1);

		expect(toolBox.currentIndex()).toBe(0);
	});

	test("disabling current item selects next enabled item", () => {
		const toolBox = new CToolBox();

		toolBox.addItem(new CWidget(), "First");
		toolBox.addItem(new CWidget(), "Second");
		toolBox.addItem(new CWidget(), "Third");

		toolBox.setItemEnabled(0, false);

		expect(toolBox.currentIndex()).toBe(1);
	});

	test("disabling current item selects previous item when needed", () => {
		const toolBox = new CToolBox();

		toolBox.addItem(new CWidget(), "First");
		toolBox.addItem(new CWidget(), "Second");
		toolBox.setCurrentIndex(1);

		toolBox.setItemEnabled(1, false);

		expect(toolBox.currentIndex()).toBe(0);
	});

	test("disabling only enabled item keeps it current", () => {
		const toolBox = new CToolBox();

		toolBox.addItem(new CWidget(), "First");
		toolBox.setItemEnabled(0, false);

		expect(toolBox.currentIndex()).toBe(0);
		expect(toolBox.isItemEnabled(0)).toBe(false);
	});

	test("removeItem removes item", () => {
		const toolBox = new CToolBox();
		const first = new CWidget();
		const second = new CWidget();

		toolBox.addItem(first, "First");
		toolBox.addItem(second, "Second");

		toolBox.removeItem(1);

		expect(toolBox.count()).toBe(1);
		expect(toolBox.widget(0)).toBe(first);
		expect(toolBox.indexOf(second)).toBe(-1);
		expect(second.parent()).toBeNull();
	});

	test("removing current item selects next item", () => {
		const toolBox = new CToolBox();
		const first = new CWidget();
		const second = new CWidget();

		toolBox.addItem(first, "First");
		toolBox.addItem(second, "Second");

		toolBox.removeItem(0);

		expect(toolBox.currentIndex()).toBe(0);
		expect(toolBox.currentWidget()).toBe(second);
		expect(second.isVisible()).toBe(true);
	});

	test("removing last current item emits minus one", () => {
		const toolBox = new CToolBox();
		const values: number[] = [];

		toolBox.addItem(new CWidget(), "First");
		toolBox.currentChanged.connect(index => values.push(index));

		toolBox.removeItem(0);

		expect(toolBox.count()).toBe(0);
		expect(toolBox.currentIndex()).toBe(-1);
		expect(toolBox.currentWidget()).toBeNull();
		expect(values).toEqual([-1]);
	});

	test("removing item before current preserves current widget", () => {
		const toolBox = new CToolBox();
		const first = new CWidget();
		const second = new CWidget();
		const third = new CWidget();

		toolBox.addItem(first, "First");
		toolBox.addItem(second, "Second");
		toolBox.addItem(third, "Third");
		toolBox.setCurrentIndex(2);

		toolBox.removeItem(0);

		expect(toolBox.currentIndex()).toBe(1);
		expect(toolBox.currentWidget()).toBe(third);
	});

	test("current page fills space between toolbox buttons", () => {
		const toolBox = new CToolBox();
		const first = new CWidget();
		const second = new CWidget();
		const third = new CWidget();

		toolBox.resize(300, 300);
		toolBox.addItem(first, "First");
		toolBox.addItem(second, "Second");
		toolBox.addItem(third, "Third");

		expect(first.x()).toBe(0);
		expect(first.y()).toBe(28);
		expect(first.width()).toBe(300);
		expect(first.height()).toBe(216);
	});

	test("current page position changes with current index", () => {
		const toolBox = new CToolBox();
		const first = new CWidget();
		const second = new CWidget();
		const third = new CWidget();

		toolBox.resize(300, 300);
		toolBox.addItem(first, "First");
		toolBox.addItem(second, "Second");
		toolBox.addItem(third, "Third");

		toolBox.setCurrentIndex(1);

		expect(second.x()).toBe(0);
		expect(second.y()).toBe(56);
		expect(second.width()).toBe(300);
		expect(second.height()).toBe(216);

		toolBox.setCurrentIndex(2);

		expect(third.x()).toBe(0);
		expect(third.y()).toBe(84);
		expect(third.width()).toBe(300);
		expect(third.height()).toBe(216);
	});

	test("resizing toolbox updates current page geometry", () => {
		const toolBox = new CToolBox();
		const widget = new CWidget();

		toolBox.addItem(widget, "First");
		toolBox.resize(400, 250);

		expect(widget.x()).toBe(0);
		expect(widget.y()).toBe(28);
		expect(widget.width()).toBe(400);
		expect(widget.height()).toBe(222);
	});

	test("sizeHint includes all buttons and current page", () => {
		const toolBox = new CToolBox();
		const first = new TestWidget(200, 100);
		const second = new TestWidget(150, 80);

		toolBox.addItem(first, "First");
		toolBox.addItem(second, "Second");

		expect(toolBox.sizeHint().width()).toBeGreaterThanOrEqual(200);
		expect(toolBox.sizeHint().height()).toBe(156);
	});

	test("sizeHint uses current page sizeHint", () => {
		const toolBox = new CToolBox();
		const first = new TestWidget(100, 50);
		const second = new TestWidget(100, 120);

		toolBox.addItem(first, "First");
		toolBox.addItem(second, "Second");

		expect(toolBox.sizeHint().height()).toBe(106);

		toolBox.setCurrentIndex(1);

		expect(toolBox.sizeHint().height()).toBe(176);
	});
});

describe("CToolBox section chevrons", () => {
    beforeEach(() => { new CApplication(createTestCanvas()); });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });

    function paint(current: boolean, enabled = true, x = 0, y = 0) {
        const option = new CStyleOptionToolBoxButton();
        option.rect = new CRect(x, y, 200, 28);
        option.text = "General"; option.current = current;
        option.state = enabled ? CStyleState.Enabled : 0;
        const painter = {
            setFillStyle: vi.fn(), fillRect: vi.fn(), setStrokeStyle: vi.fn(),
            drawLine: vi.fn(), setPen: vi.fn(), setFont: vi.fn(),
            setTextAlign: vi.fn(), setTextBaseline: vi.fn(), drawText: vi.fn(),
            save: vi.fn(), restore: vi.fn(), clipRect: vi.fn(), setLineWidth: vi.fn()
        };
        new CDefaultStyle().drawToolBoxButton(painter as unknown as CPainter, option);
        // First line is the existing bottom separator; remaining two form the chevron.
        return { option, painter, lines: painter.drawLine.mock.calls.slice(1) };
    }

    test("closed section draws a right-facing chevron", () => {
        const { lines } = paint(false);
		expect(lines).toEqual([[10, 10, 14, 14], [14, 14, 10, 18]]);
    });
    test("open section draws a downward-facing chevron", () => {
        const { lines } = paint(true);
		expect(lines).toEqual([[8, 12, 12, 16], [12, 16, 16, 12]]);
    });
    test("normal chevron uses the text color", () => {
        const { option, painter } = paint(false);
        expect(painter.setStrokeStyle).toHaveBeenCalledWith(option.palette.color(CPaletteColorRole.Text).toCss());
    });
    test("open chevron uses highlighted text color", () => {
        const { option, painter } = paint(true);
        expect(painter.setStrokeStyle).toHaveBeenCalledWith(option.palette.color(CPaletteColorRole.HighlightedText).toCss());
    });
    for (const current of [false, true]) {
        test(`disabled ${current ? "open" : "closed"} chevron uses DisabledText`, () => {
            const { option, painter } = paint(current, false);
            expect(painter.setStrokeStyle).toHaveBeenCalledWith(option.palette.color(CPaletteColorRole.DisabledText).toCss());
        });
    }
    test("caption reserves space for the chevron", () => {
        const { painter } = paint(false);
        expect(painter.drawText).toHaveBeenCalledWith("General", 24, 14);
        expect(painter.clipRect).toHaveBeenCalledOnce();
        expect(painter.save).toHaveBeenCalledOnce(); expect(painter.restore).toHaveBeenCalledOnce();
    });
    test("chevron and caption follow an offset style rectangle", () => {
        const { lines, painter } = paint(true, true, 20, 30);
        expect(lines).toEqual([[28, 42, 32, 46], [32, 46, 36, 42]]);
		expect(painter.drawText).toHaveBeenCalledWith("General", 44, 44);
    });
    test("button size hint includes the chevron and spacing", () => {
        const button = new CToolBoxButton(); button.setText("General");
        expect(button.sizeHint().width()).toBe(button.fontMetrics().textWidth("General") + 32);
        expect(button.sizeHint().height()).toBe(28);
    });
    test("style option follows the button when its current state changes", () => {
        const button = new CToolBoxButton(); button.setText("General");
        const option = new CStyleOptionToolBoxButton(); option.initFromToolBoxButton(button);
        expect(option.current).toBe(false);
        button.setCurrent(true); option.initFromToolBoxButton(button); expect(option.current).toBe(true);
        button.setCurrent(false); option.initFromToolBoxButton(button); expect(option.current).toBe(false);
    });
});
