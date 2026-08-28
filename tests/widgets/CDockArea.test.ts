import {
	afterEach,
	beforeEach,
	describe,
	expect,
	test
} from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import { CSize } from "../../src/geometry/CSize.js";
import {
	CDockArea,
	CDockAreaPosition
} from "../../src/widgets/CDockArea.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class TestWidget extends CWidget {
	#m_sizeHint: CSize;

	constructor(
		width: number,
		height: number
	) {
		super();

		this.#m_sizeHint = new CSize(
			width,
			height
		);
	}

	override sizeHint(): CSize {
		return this.#m_sizeHint;
	}
}

describe("CDockArea", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has no central widget by default", () => {
		const area = new CDockArea();

		expect(area.centralWidget()).toBeNull();
	});

	test("sets central widget", () => {
		const area = new CDockArea();
		const central = new CWidget();

		area.setCentralWidget(central);

		expect(area.centralWidget()).toBe(central);
		expect(central.parent()).toBe(area);
	});

	test("replaces central widget", () => {
		const area = new CDockArea();
		const first = new CWidget();
		const second = new CWidget();

		area.setCentralWidget(first);
		area.setCentralWidget(second);

		expect(area.centralWidget()).toBe(second);
		expect(first.parent()).toBeNull();
		expect(second.parent()).toBe(area);
	});

	test("removes central widget", () => {
		const area = new CDockArea();
		const central = new CWidget();

		area.setCentralWidget(central);
		area.setCentralWidget(null);

		expect(area.centralWidget()).toBeNull();
		expect(central.parent()).toBeNull();
	});

	test("central widget fills dock area", () => {
		const area = new CDockArea();
		const central = new CWidget();

		area.setGeometry(0, 0, 400, 300);
		area.setCentralWidget(central);

		expect(central.x()).toBe(0);
		expect(central.y()).toBe(0);
		expect(central.width()).toBe(400);
		expect(central.height()).toBe(300);
	});

	test("adds left dock widget", () => {
		const area = new CDockArea();
		const dock = new TestWidget(80, 20);

		area.setGeometry(0, 0, 400, 300);
		area.addDockWidget(
			CDockAreaPosition.Left,
			dock
		);

		expect(dock.parent()).toBe(area);
		expect(dock.x()).toBe(0);
		expect(dock.y()).toBe(0);
		expect(dock.width()).toBe(80);
		expect(dock.height()).toBe(300);
	});

	test("adds right dock widget", () => {
		const area = new CDockArea();
		const dock = new TestWidget(80, 20);

		area.setGeometry(0, 0, 400, 300);
		area.addDockWidget(
			CDockAreaPosition.Right,
			dock
		);

		expect(dock.x()).toBe(320);
		expect(dock.y()).toBe(0);
		expect(dock.width()).toBe(80);
		expect(dock.height()).toBe(300);
	});

	test("adds top dock widget", () => {
		const area = new CDockArea();
		const dock = new TestWidget(80, 40);

		area.setGeometry(0, 0, 400, 300);
		area.addDockWidget(
			CDockAreaPosition.Top,
			dock
		);

		expect(dock.x()).toBe(0);
		expect(dock.y()).toBe(0);
		expect(dock.width()).toBe(400);
		expect(dock.height()).toBe(40);
	});

	test("adds bottom dock widget", () => {
		const area = new CDockArea();
		const dock = new TestWidget(80, 40);

		area.setGeometry(0, 0, 400, 300);
		area.addDockWidget(
			CDockAreaPosition.Bottom,
			dock
		);

		expect(dock.x()).toBe(0);
		expect(dock.y()).toBe(260);
		expect(dock.width()).toBe(400);
		expect(dock.height()).toBe(40);
	});

	test("central widget uses remaining space", () => {
		const area = new CDockArea();

		const central = new CWidget();
		const left = new TestWidget(80, 20);
		const right = new TestWidget(60, 20);
		const top = new TestWidget(20, 40);
		const bottom = new TestWidget(20, 30);

		area.setGeometry(0, 0, 400, 300);

		area.setCentralWidget(central);

		area.addDockWidget(
			CDockAreaPosition.Left,
			left
		);

		area.addDockWidget(
			CDockAreaPosition.Right,
			right
		);

		area.addDockWidget(
			CDockAreaPosition.Top,
			top
		);

		area.addDockWidget(
			CDockAreaPosition.Bottom,
			bottom
		);

		expect(central.x()).toBe(
			80 + CDockArea.Spacing
		);

		expect(central.y()).toBe(
			40 + CDockArea.Spacing
		);

		expect(central.width()).toBe(
			400 -
			80 -
			60 -
			2 * CDockArea.Spacing
		);

		expect(central.height()).toBe(
			300 -
			40 -
			30 -
			2 * CDockArea.Spacing
		);
	});

	test("multiple left dock widgets are laid out from left", () => {
		const area = new CDockArea();

		const first = new TestWidget(50, 20);
		const second = new TestWidget(70, 20);

		area.setGeometry(0, 0, 400, 300);

		area.addDockWidget(
			CDockAreaPosition.Left,
			first
		);

		area.addDockWidget(
			CDockAreaPosition.Left,
			second
		);

		expect(first.x()).toBe(0);

		expect(second.x()).toBe(
			50 + CDockArea.Spacing
		);
	});

	test("multiple right dock widgets are laid out from right", () => {
		const area = new CDockArea();

		const first = new TestWidget(50, 20);
		const second = new TestWidget(70, 20);

		area.setGeometry(0, 0, 400, 300);

		area.addDockWidget(
			CDockAreaPosition.Right,
			first
		);

		area.addDockWidget(
			CDockAreaPosition.Right,
			second
		);

		expect(second.x()).toBe(330);

		expect(first.x()).toBe(
			330 -
			CDockArea.Spacing -
			50
		);
	});

	test("multiple top dock widgets are laid out downward", () => {
		const area = new CDockArea();

		const first = new TestWidget(20, 30);
		const second = new TestWidget(20, 40);

		area.setGeometry(0, 0, 400, 300);

		area.addDockWidget(
			CDockAreaPosition.Top,
			first
		);

		area.addDockWidget(
			CDockAreaPosition.Top,
			second
		);

		expect(first.y()).toBe(0);

		expect(second.y()).toBe(
			30 + CDockArea.Spacing
		);
	});

	test("multiple bottom dock widgets are laid out upward", () => {
		const area = new CDockArea();

		const first = new TestWidget(20, 30);
		const second = new TestWidget(20, 40);

		area.setGeometry(0, 0, 400, 300);

		area.addDockWidget(
			CDockAreaPosition.Bottom,
			first
		);

		area.addDockWidget(
			CDockAreaPosition.Bottom,
			second
		);

		expect(second.y()).toBe(260);

		expect(first.y()).toBe(
			260 -
			CDockArea.Spacing -
			30
		);
	});

	test("returns dock widgets for position", () => {
		const area = new CDockArea();

		const left1 = new CWidget();
		const left2 = new CWidget();
		const right = new CWidget();

		area.addDockWidget(
			CDockAreaPosition.Left,
			left1
		);

		area.addDockWidget(
			CDockAreaPosition.Left,
			left2
		);

		area.addDockWidget(
			CDockAreaPosition.Right,
			right
		);

		expect(
			area.dockWidgets(
				CDockAreaPosition.Left
			)
		).toEqual([
			left1,
			left2
		]);

		expect(
			area.dockWidgets(
				CDockAreaPosition.Right
			)
		).toEqual([
			right
		]);
	});

	test("moves dock widget to another position", () => {
		const area = new CDockArea();
		const dock = new TestWidget(60, 30);

		area.setGeometry(0, 0, 400, 300);

		area.addDockWidget(
			CDockAreaPosition.Left,
			dock
		);

		area.addDockWidget(
			CDockAreaPosition.Right,
			dock
		);

		expect(
			area.dockWidgets(
				CDockAreaPosition.Left
			)
		).toEqual([]);

		expect(
			area.dockWidgets(
				CDockAreaPosition.Right
			)
		).toEqual([
			dock
		]);

		expect(dock.parent()).toBe(area);
		expect(dock.x()).toBe(340);
	});

	test("removes dock widget", () => {
		const area = new CDockArea();
		const dock = new CWidget();

		area.addDockWidget(
			CDockAreaPosition.Left,
			dock
		);

		area.removeDockWidget(dock);

		expect(dock.parent()).toBeNull();

		expect(
			area.dockWidgets(
				CDockAreaPosition.Left
			)
		).toEqual([]);
	});

	test("removing unknown widget does nothing", () => {
		const area = new CDockArea();
		const dock = new CWidget();

		expect(() => {
			area.removeDockWidget(dock);
		}).not.toThrow();
	});

	test("resize updates dock geometry", () => {
		const area = new CDockArea();

		const central = new CWidget();
		const left = new TestWidget(80, 20);

		area.setGeometry(0, 0, 400, 300);

		area.setCentralWidget(central);

		area.addDockWidget(
			CDockAreaPosition.Left,
			left
		);

		area.resize(600, 500);

		expect(left.height()).toBe(500);

		expect(central.width()).toBe(
			600 -
			80 -
			CDockArea.Spacing
		);

		expect(central.height()).toBe(500);
	});

	test("does not create negative central geometry", () => {
		const area = new CDockArea();

		const central = new CWidget();
		const left = new TestWidget(100, 20);
		const right = new TestWidget(100, 20);

		area.setGeometry(0, 0, 50, 50);

		area.setCentralWidget(central);

		area.addDockWidget(
			CDockAreaPosition.Left,
			left
		);

		area.addDockWidget(
			CDockAreaPosition.Right,
			right
		);

		expect(central.width()).toBe(0);
		expect(central.height()).toBe(50);
	});

	test("sizeHint uses central widget size hint", () => {
		const area = new CDockArea();
		const central = new TestWidget(320, 240);

		area.setCentralWidget(central);

		const hint = area.sizeHint();

		expect(hint.width()).toBe(320);
		expect(hint.height()).toBe(240);
	});

	test("sizeHint is empty without central widget", () => {
		const area = new CDockArea();

		const hint = area.sizeHint();

		expect(hint.width()).toBe(0);
		expect(hint.height()).toBe(0);
	});
});