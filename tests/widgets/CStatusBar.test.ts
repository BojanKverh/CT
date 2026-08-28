import {
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi
} from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CSize } from "../../src/geometry/CSize.js";
import { CStatusBar } from "../../src/widgets/CStatusBar.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStatusBar", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		vi.useRealTimers();

		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has expected default size hint", () => {
		const statusBar = new CStatusBar();

		const hint = statusBar.sizeHint();

		expect(hint.width()).toBe(0);
		expect(hint.height()).toBe(
			CStatusBar.DefaultHeight
		);
	});

	test("has no current message by default", () => {
		const statusBar = new CStatusBar();

		expect(statusBar.currentMessage()).toBe("");
	});

	test("adds normal widget", () => {
		const statusBar = new CStatusBar();
		const widget = new CWidget();

		const returned = statusBar.addWidget(widget);

		expect(returned).toBe(widget);
		expect(widget.parent()).toBe(statusBar);
	});

	test("adds permanent widget", () => {
		const statusBar = new CStatusBar();
		const widget = new CWidget();

		const returned =
			statusBar.addPermanentWidget(widget);

		expect(returned).toBe(widget);
		expect(widget.parent()).toBe(statusBar);
	});

	test("lays out normal widgets from left", () => {
		class TestWidget extends CWidget {
			override sizeHint(): CSize {
				return new CSize(30, 16);
			}
		}

		const statusBar = new CStatusBar();
		const first = new TestWidget();
		const second = new TestWidget();

		statusBar.setGeometry(0, 0, 200, 24);

		statusBar.addWidget(first);
		statusBar.addWidget(second);

		expect(first.x()).toBe(CStatusBar.Margin);
		expect(first.y()).toBe(CStatusBar.Margin);
		expect(first.width()).toBe(30);
		expect(first.height()).toBe(
			24 - 2 * CStatusBar.Margin
		);

		expect(second.x()).toBe(
			CStatusBar.Margin +
			30 +
			CStatusBar.Spacing
		);

		expect(second.width()).toBe(30);
	});

	test("lays out permanent widgets from right", () => {
		class TestWidget extends CWidget {
			override sizeHint(): CSize {
				return new CSize(30, 16);
			}
		}

		const statusBar = new CStatusBar();
		const first = new TestWidget();
		const second = new TestWidget();

		statusBar.setGeometry(0, 0, 200, 24);

		statusBar.addPermanentWidget(first);
		statusBar.addPermanentWidget(second);

		expect(second.x()).toBe(
			200 - CStatusBar.Margin - 30
		);

		expect(first.x()).toBe(
			200 -
			CStatusBar.Margin -
			30 -
			CStatusBar.Spacing -
			30
		);

		expect(first.y()).toBe(CStatusBar.Margin);
		expect(second.y()).toBe(CStatusBar.Margin);
	});

	test("showMessage stores message", () => {
		const statusBar = new CStatusBar();

		statusBar.showMessage("File saved");

		expect(statusBar.currentMessage()).toBe(
			"File saved"
		);
	});

	test("showMessage hides normal widgets", () => {
		const statusBar = new CStatusBar();
		const widget = new CWidget();

		statusBar.addWidget(widget);

		expect(widget.isVisible()).toBe(true);

		statusBar.showMessage("File saved");

		expect(widget.isVisible()).toBe(false);
	});

	test("showMessage keeps permanent widgets visible", () => {
		const statusBar = new CStatusBar();
		const widget = new CWidget();

		statusBar.addPermanentWidget(widget);

		statusBar.showMessage("File saved");

		expect(widget.isVisible()).toBe(true);
	});

	test("clearMessage restores normal widgets", () => {
		const statusBar = new CStatusBar();
		const widget = new CWidget();

		statusBar.addWidget(widget);

		statusBar.showMessage("File saved");
		statusBar.clearMessage();

		expect(statusBar.currentMessage()).toBe("");
		expect(widget.isVisible()).toBe(true);
	});

	test("clearMessage does not show widget that was hidden before message", () => {
		const statusBar = new CStatusBar();
		const widget = new CWidget();

		statusBar.addWidget(widget);
		widget.hide();

		statusBar.showMessage("File saved");
		statusBar.clearMessage();

		expect(widget.isVisible()).toBe(false);
	});

	test("message is cleared after timeout", () => {
		vi.useFakeTimers();

		const statusBar = new CStatusBar();

		statusBar.showMessage("File saved", 3000);

		expect(statusBar.currentMessage()).toBe(
			"File saved"
		);

		vi.advanceTimersByTime(2999);

		expect(statusBar.currentMessage()).toBe(
			"File saved"
		);

		vi.advanceTimersByTime(1);

		expect(statusBar.currentMessage()).toBe("");
	});

	test("timeout restores normal widgets", () => {
		vi.useFakeTimers();

		const statusBar = new CStatusBar();
		const widget = new CWidget();

		statusBar.addWidget(widget);

		statusBar.showMessage("File saved", 3000);

		expect(widget.isVisible()).toBe(false);

		vi.advanceTimersByTime(3000);

		expect(widget.isVisible()).toBe(true);
	});

	test("new message replaces previous timeout", () => {
		vi.useFakeTimers();

		const statusBar = new CStatusBar();

		statusBar.showMessage("First", 3000);

		vi.advanceTimersByTime(2000);

		statusBar.showMessage("Second", 3000);

		vi.advanceTimersByTime(1000);

		expect(statusBar.currentMessage()).toBe(
			"Second"
		);

		vi.advanceTimersByTime(2000);

		expect(statusBar.currentMessage()).toBe("");
	});

	test("removeWidget removes normal widget", () => {
		const statusBar = new CStatusBar();
		const widget = new CWidget();

		statusBar.addWidget(widget);
		statusBar.removeWidget(widget);

		expect(widget.parent()).toBeNull();
	});

	test("removeWidget removes permanent widget", () => {
		const statusBar = new CStatusBar();
		const widget = new CWidget();

		statusBar.addPermanentWidget(widget);
		statusBar.removeWidget(widget);

		expect(widget.parent()).toBeNull();
	});

	test("removing unknown widget does nothing", () => {
		const statusBar = new CStatusBar();
		const widget = new CWidget();

		expect(() => {
			statusBar.removeWidget(widget);
		}).not.toThrow();

		expect(widget.parent()).toBeNull();
	});

	test("resizing status bar updates item geometry", () => {
		class TestWidget extends CWidget {
			override sizeHint(): CSize {
				return new CSize(30, 16);
			}
		}

		const statusBar = new CStatusBar();
		const widget = new TestWidget();

		statusBar.setGeometry(0, 0, 200, 24);
		statusBar.addWidget(widget);

		expect(widget.height()).toBe(18);

		statusBar.resize(200, 40);

		expect(widget.height()).toBe(34);
	});

	test("small status bar does not create negative widget height", () => {
		class TestWidget extends CWidget {
			override sizeHint(): CSize {
				return new CSize(30, 16);
			}
		}

		const statusBar = new CStatusBar();
		const widget = new TestWidget();

		statusBar.addWidget(widget);
		statusBar.resize(200, 4);

		expect(widget.height()).toBe(0);
	});
});