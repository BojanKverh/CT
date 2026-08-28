import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CAction } from "../../src/core/CAction.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CSize } from "../../src/geometry/CSize.js";
import { COrientation } from "../../src/gui/COrientation.js";
import { CPixmap } from "../../src/painting/CPixmap.js";
import { CToolBar } from "../../src/widgets/CToolBar.js";
import {
	CToolButton,
	CToolButtonStyle
} from "../../src/widgets/CToolButton.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CToolBar", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("is horizontal and empty by default", () => {
		const toolBar = new CToolBar();

		expect(toolBar.orientation()).toBe(COrientation.Horizontal);
		expect(toolBar.count()).toBe(0);
	});

	test("changes orientation", () => {
		const toolBar = new CToolBar();

		toolBar.setOrientation(COrientation.Vertical);

		expect(toolBar.orientation()).toBe(COrientation.Vertical);
	});

	test("adds action and creates tool button", () => {
		const toolBar = new CToolBar();
		const action = new CAction("Save");

		const button = toolBar.addAction(action);

		expect(button).toBeInstanceOf(CToolButton);
		expect(button.parent()).toBe(toolBar);
		expect(button.defaultAction()).toBe(action);
		expect(button.autoRaise()).toBe(true);
		expect(toolBar.count()).toBe(1);
	});

	test("action button gets style from action", () => {
		const toolBar = new CToolBar();
		const action = new CAction("Save");
		const image = {} as CanvasImageSource;
		const icon = new CPixmap(image, 128, 128);

		action.setIcon(icon);

		const button = toolBar.addAction(action);

		expect(button.icon()).toBe(icon);
		expect(button.toolButtonStyle()).toBe(
			CToolButtonStyle.TextUnderIcon
		);
	});

	test("returns actions by index", () => {
		const toolBar = new CToolBar();
		const first = new CAction("New");
		const second = new CAction("Open");

		toolBar.addAction(first);
		toolBar.addSeparator();
		toolBar.addAction(second);

		expect(toolBar.actionAt(0)).toBe(first);
		expect(toolBar.actionAt(1)).toBeNull();
		expect(toolBar.actionAt(2)).toBe(second);
		expect(toolBar.actionAt(-1)).toBeNull();
		expect(toolBar.actionAt(3)).toBeNull();
	});

	test("returns widget for action", () => {
		const toolBar = new CToolBar();
		const action = new CAction("Save");

		const button = toolBar.addAction(action);

		expect(toolBar.widgetForAction(action)).toBe(button);
		expect(
			toolBar.widgetForAction(new CAction("Other"))
		).toBeNull();
	});

	test("adds separator", () => {
		const toolBar = new CToolBar();

		const separator = toolBar.addSeparator();

		expect(separator.parent()).toBe(toolBar);
		expect(toolBar.count()).toBe(1);
		expect(toolBar.actionAt(0)).toBeNull();
	});

	test("adds custom widget and reparents it", () => {
		const toolBar = new CToolBar();
		const widget = new CWidget();

		const returned = toolBar.addWidget(widget);

		expect(returned).toBe(widget);
		expect(widget.parent()).toBe(toolBar);
		expect(toolBar.count()).toBe(1);
	});

	test("clear removes all items and detaches widgets", () => {
		const toolBar = new CToolBar();
		const action = new CAction("Save");
		const button = toolBar.addAction(action);
		const separator = toolBar.addSeparator();
		const widget = new CWidget();

		toolBar.addWidget(widget);
		toolBar.clear();

		expect(toolBar.count()).toBe(0);
		expect(button.parent()).toBeNull();
		expect(separator.parent()).toBeNull();
		expect(widget.parent()).toBeNull();
		expect(toolBar.actionAt(0)).toBeNull();
		expect(toolBar.widgetForAction(action)).toBeNull();
	});

	test("lays out action horizontally", () => {
		const toolBar = new CToolBar();
		const action = new CAction("Save");

		toolBar.setGeometry(10, 20, 200, 36);
		const button = toolBar.addAction(action);

		expect(button.x()).toBe(CToolBar.Margin);
		expect(button.y()).toBe(CToolBar.Margin);
		expect(button.height()).toBe(
			36 - 2 * CToolBar.Margin
		);
		expect(button.width()).toBe(button.sizeHint().width());
	});

	test("lays out horizontal items with spacing", () => {
		class TestWidget extends CWidget {
			override sizeHint(): CSize {
				return new CSize(30, 20);
			}
		}

		const toolBar = new CToolBar();
		const first = new TestWidget();
		const second = new TestWidget();

		toolBar.setGeometry(0, 0, 200, 36);
		toolBar.addWidget(first);
		toolBar.addWidget(second);

		expect(first.x()).toBe(CToolBar.Margin);
		expect(first.width()).toBe(30);
		expect(second.x()).toBe(
			CToolBar.Margin + 30 + CToolBar.Spacing
		);
		expect(second.width()).toBe(30);
	});

	test("lays out horizontal separator", () => {
		const toolBar = new CToolBar();

		toolBar.setGeometry(0, 0, 200, 36);
		const separator = toolBar.addSeparator();

		expect(separator.x()).toBe(CToolBar.Margin);
		expect(separator.y()).toBe(CToolBar.Margin);
		expect(separator.width()).toBe(
			CToolBar.SeparatorExtent
		);
		expect(separator.height()).toBe(
			36 - 2 * CToolBar.Margin
		);
	});

	test("lays out custom widget vertically", () => {
		class TestWidget extends CWidget {
			override sizeHint(): CSize {
				return new CSize(30, 22);
			}
		}

		const toolBar = new CToolBar();
		const widget = new TestWidget();

		toolBar.setOrientation(COrientation.Vertical);
		toolBar.setGeometry(0, 0, 48, 200);
		toolBar.addWidget(widget);

		expect(widget.x()).toBe(CToolBar.Margin);
		expect(widget.y()).toBe(CToolBar.Margin);
		expect(widget.width()).toBe(
			48 - 2 * CToolBar.Margin
		);
		expect(widget.height()).toBe(22);
	});

	test("lays out vertical separator", () => {
		const toolBar = new CToolBar();

		toolBar.setOrientation(COrientation.Vertical);
		toolBar.setGeometry(0, 0, 48, 200);
		const separator = toolBar.addSeparator();

		expect(separator.x()).toBe(CToolBar.Margin);
		expect(separator.y()).toBe(CToolBar.Margin);
		expect(separator.width()).toBe(
			48 - 2 * CToolBar.Margin
		);
		expect(separator.height()).toBe(
			CToolBar.SeparatorExtent
		);
	});

	test("changing orientation updates existing item geometry", () => {
		class TestWidget extends CWidget {
			override sizeHint(): CSize {
				return new CSize(30, 22);
			}
		}

		const toolBar = new CToolBar();
		const widget = new TestWidget();

		toolBar.setGeometry(0, 0, 48, 200);
		toolBar.addWidget(widget);

		expect(widget.width()).toBe(30);
		expect(widget.height()).toBe(192);

		toolBar.setOrientation(COrientation.Vertical);

		expect(widget.x()).toBe(CToolBar.Margin);
		expect(widget.y()).toBe(CToolBar.Margin);
		expect(widget.width()).toBe(40);
		expect(widget.height()).toBe(22);
	});

	test("resizing toolbar updates item geometry", () => {
		const toolBar = new CToolBar();
		const action = new CAction("Save");

		toolBar.setGeometry(0, 0, 200, 36);
		const button = toolBar.addAction(action);

		expect(button.height()).toBe(28);

		toolBar.resize(200, 50);

		expect(button.height()).toBe(42);
	});

	test("small toolbar does not create negative item sizes", () => {
		const toolBar = new CToolBar();
		const separator = toolBar.addSeparator();

		toolBar.resize(4, 4);

		expect(separator.width()).toBe(
			CToolBar.SeparatorExtent
		);
		expect(separator.height()).toBe(0);

		toolBar.setOrientation(COrientation.Vertical);

		expect(separator.width()).toBe(0);
		expect(separator.height()).toBe(
			CToolBar.SeparatorExtent
		);
	});
});
