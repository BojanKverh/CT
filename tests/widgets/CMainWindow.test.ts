import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CSize } from "../../src/geometry/CSize.js";
import { CMainWindow } from "../../src/widgets/CMainWindow.js";
import { CMenuBar } from "../../src/widgets/CMenuBar.js";
import { CStatusBar } from "../../src/widgets/CStatusBar.js";
import { CToolBar } from "../../src/widgets/CToolBar.js";
import {
	CDockWidgetArea
} from "../../src/widgets/CDockArea.js";
import { CDockWidget } from "../../src/widgets/CDockWidget.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

class TestWidget extends CWidget {
	#m_width: number;
	#m_height: number;

	constructor(
		width: number,
		height: number,
		parent: CWidget | null = null
	) {
		super(parent);

		this.#m_width = width;
		this.#m_height = height;
	}

	override sizeHint(): CSize {
		return new CSize(this.#m_width, this.#m_height);
	}
}

describe("CMainWindow", () => {
	let app: CApplication;

	beforeEach(() => {
		app = new CApplication(createTestCanvas());
	});

	afterEach(() => {
		app.destroy();
	});

	test("has no menu bar by default", () => {
		const window = new CMainWindow();

		expect(window.menuBar()).toBeNull();
	});

	test("sets menu bar", () => {
		const window = new CMainWindow();
		const menuBar = new CMenuBar();

		window.setMenuBar(menuBar);

		expect(window.menuBar()).toBe(menuBar);
		expect(menuBar.parent()).toBe(window);
	});

	test("replaces menu bar", () => {
		const window = new CMainWindow();
		const first = new CMenuBar();
		const second = new CMenuBar();

		window.setMenuBar(first);
		window.setMenuBar(second);

		expect(window.menuBar()).toBe(second);
		expect(first.parent()).toBeNull();
		expect(second.parent()).toBe(window);
	});

	test("removes menu bar", () => {
		const window = new CMainWindow();
		const menuBar = new CMenuBar();

		window.setMenuBar(menuBar);
		window.setMenuBar(null);

		expect(window.menuBar()).toBeNull();
		expect(menuBar.parent()).toBeNull();
	});

	test("has no status bar by default", () => {
		const window = new CMainWindow();

		expect(window.statusBar()).toBeNull();
	});

	test("sets status bar", () => {
		const window = new CMainWindow();
		const statusBar = new CStatusBar();

		window.setStatusBar(statusBar);

		expect(window.statusBar()).toBe(statusBar);
		expect(statusBar.parent()).toBe(window);
	});

	test("replaces status bar", () => {
		const window = new CMainWindow();
		const first = new CStatusBar();
		const second = new CStatusBar();

		window.setStatusBar(first);
		window.setStatusBar(second);

		expect(window.statusBar()).toBe(second);
		expect(first.parent()).toBeNull();
		expect(second.parent()).toBe(window);
	});

	test("removes status bar", () => {
		const window = new CMainWindow();
		const statusBar = new CStatusBar();

		window.setStatusBar(statusBar);
		window.setStatusBar(null);

		expect(window.statusBar()).toBeNull();
		expect(statusBar.parent()).toBeNull();
	});

	test("sets central widget", () => {
		const window = new CMainWindow();
		const central = new CWidget();

		window.setCentralWidget(central);

		expect(window.centralWidget()).toBe(central);
	});

	test("replaces central widget", () => {
		const window = new CMainWindow();
		const first = new CWidget();
		const second = new CWidget();

		window.setCentralWidget(first);
		window.setCentralWidget(second);

		expect(window.centralWidget()).toBe(second);
		expect(first.parent()).toBeNull();
	});

	test("removes central widget", () => {
		const window = new CMainWindow();
		const central = new CWidget();

		window.setCentralWidget(central);
		window.setCentralWidget(null);

		expect(window.centralWidget()).toBeNull();
		expect(central.parent()).toBeNull();
	});

	test("central widget fills main window", () => {
		const window = new CMainWindow();
		const central = new CWidget();

		window.setGeometry(0, 0, 800, 600);
		window.setCentralWidget(central);

		expect(central.x()).toBe(0);
		expect(central.y()).toBe(0);
		expect(central.width()).toBe(800);
		expect(central.height()).toBe(600);
	});

	test("menu bar occupies top of main window", () => {
	    const window = new CMainWindow();
	    const menuBar = new CMenuBar();
	    const central = new CWidget();

	    window.setGeometry(0, 0, 800, 600);
	    window.setMenuBar(menuBar);
	    window.setCentralWidget(central);

	    expect(menuBar.x()).toBe(0);
	    expect(menuBar.y()).toBe(0);
	    expect(menuBar.width()).toBe(800);
	    expect(menuBar.height()).toBe(CMenuBar.DefaultHeight);

	    expect(central.x()).toBe(0);
	    expect(central.y()).toBe(0);
	    expect(central.width()).toBe(800);
	    expect(central.height()).toBe(600 - CMenuBar.DefaultHeight);
    });

    test("status bar occupies bottom of main window", () => {
		const window = new CMainWindow();
		const statusBar = new CStatusBar();
		const central = new CWidget();

		window.setGeometry(0, 0, 800, 600);
		window.setStatusBar(statusBar);
		window.setCentralWidget(central);

		expect(statusBar.x()).toBe(0);
		expect(statusBar.y()).toBe(
			600 - CStatusBar.DefaultHeight
		);
		expect(statusBar.width()).toBe(800);
		expect(statusBar.height()).toBe(
			CStatusBar.DefaultHeight
		);

		expect(central.x()).toBe(0);
		expect(central.y()).toBe(0);
		expect(central.width()).toBe(800);
		expect(central.height()).toBe(
			600 - CStatusBar.DefaultHeight
		);
	});

	test("menu and status bars reduce central area", () => {
	    const window = new CMainWindow();
	    const menuBar = new CMenuBar();
	    const statusBar = new CStatusBar();
	    const central = new CWidget();

	    window.setGeometry(0, 0, 800, 600);
	    window.setMenuBar(menuBar);
	    window.setStatusBar(statusBar);
	    window.setCentralWidget(central);

	    expect(central.x()).toBe(0);
	    expect(central.y()).toBe(0);
	    expect(central.width()).toBe(800);
	    expect(central.height()).toBe(600 - CMenuBar.DefaultHeight - CStatusBar.DefaultHeight);
    });

    test("adds toolbar below menu bar", () => {
	    const window = new CMainWindow();
	    const menuBar = new CMenuBar();
	    const toolBar = new CToolBar();
	    const central = new CWidget();

	    window.setGeometry(0, 0, 800, 600);
	    window.setMenuBar(menuBar);
	    window.addToolBar(toolBar);
	    window.setCentralWidget(central);

	    expect(toolBar.x()).toBe(0);
	    expect(toolBar.y()).toBe(CMenuBar.DefaultHeight);
	    expect(toolBar.width()).toBe(800);

	    expect(central.x()).toBe(0);
	    expect(central.y()).toBe(0);
	    expect(central.height()).toBe(600 - CMenuBar.DefaultHeight - toolBar.sizeHint().height());
    });

	test("stacks multiple toolbars", () => {
		const window = new CMainWindow();
		const first = new CToolBar();
		const second = new CToolBar();
		const central = new CWidget();

		window.setGeometry(0, 0, 800, 600);
		window.addToolBar(first);
		window.addToolBar(second);
		window.setCentralWidget(central);

		expect(first.y()).toBe(0);
		expect(second.y()).toBe(
			first.sizeHint().height()
		);
		expect(central.y()).toBe(
			first.sizeHint().height() +
			second.sizeHint().height()
		);
	});

	test("toolBars returns toolbars in insertion order", () => {
		const window = new CMainWindow();
		const first = new CToolBar();
		const second = new CToolBar();

		window.addToolBar(first);
		window.addToolBar(second);

		expect(window.toolBars()).toEqual([
			first,
			second
		]);
	});

	test("does not add same toolbar twice", () => {
		const window = new CMainWindow();
		const toolBar = new CToolBar();

		window.addToolBar(toolBar);
		window.addToolBar(toolBar);

		expect(window.toolBars()).toEqual([toolBar]);
	});

	test("removes toolbar", () => {
		const window = new CMainWindow();
		const toolBar = new CToolBar();

		window.addToolBar(toolBar);
		window.removeToolBar(toolBar);

		expect(window.toolBars()).toEqual([]);
		expect(toolBar.parent()).toBeNull();
	});

	test("removing unknown toolbar does nothing", () => {
		const window = new CMainWindow();
		const first = new CToolBar();
		const second = new CToolBar();

		window.addToolBar(first);
		window.removeToolBar(second);

		expect(window.toolBars()).toEqual([first]);
	});

	test("hidden menu bar releases its space", () => {
		const window = new CMainWindow();
		const menuBar = new CMenuBar();
		const central = new CWidget();

		window.setGeometry(0, 0, 800, 600);
		window.setMenuBar(menuBar);
		window.setCentralWidget(central);

		menuBar.hide();

		expect(central.y()).toBe(0);
		expect(central.height()).toBe(600);
	});

	test("showing menu bar restores its space", () => {
	    const window = new CMainWindow();
	    const menuBar = new CMenuBar();
	    const central = new CWidget();

	    window.setGeometry(0, 0, 800, 600);
	    window.setMenuBar(menuBar);
	    window.setCentralWidget(central);

	    menuBar.hide();

	    expect(central.y()).toBe(0);
	    expect(central.height()).toBe(600);

	    menuBar.show();

	    expect(central.y()).toBe(0);
	    expect(central.height()).toBe(600 - CMenuBar.DefaultHeight);
    });

	test("hidden toolbar releases its space", () => {
		const window = new CMainWindow();
		const toolBar = new CToolBar();
		const central = new CWidget();

		window.setGeometry(0, 0, 800, 600);
		window.addToolBar(toolBar);
		window.setCentralWidget(central);

		toolBar.hide();

		expect(central.y()).toBe(0);
		expect(central.height()).toBe(600);
	});

	test("hidden status bar releases its space", () => {
		const window = new CMainWindow();
		const statusBar = new CStatusBar();
		const central = new CWidget();

		window.setGeometry(0, 0, 800, 600);
		window.setStatusBar(statusBar);
		window.setCentralWidget(central);

		statusBar.hide();

		expect(central.height()).toBe(600);
	});

	test("adds dock widget", () => {
		const window = new CMainWindow();
		const central = new CWidget();
		const dock = new CDockWidget("Properties");

		window.setGeometry(0, 0, 800, 600);
		window.setCentralWidget(central);
		window.addDockWidget(
			CDockWidgetArea.Left,
			dock
		);

		expect(dock.parent()).not.toBeNull();
		expect(central.x()).toBe(
			dock.sizeHint().width() +
			2
		);
	});

	test("removes dock widget", () => {
		const window = new CMainWindow();
		const central = new CWidget();
		const dock = new CDockWidget("Properties");

		window.setGeometry(0, 0, 800, 600);
		window.setCentralWidget(central);
		window.addDockWidget(
			CDockWidgetArea.Left,
			dock
		);

		window.removeDockWidget(dock);

		expect(dock.parent()).toBeNull();
		expect(central.x()).toBe(0);
		expect(central.width()).toBe(800);
	});

	test("resizes managed widgets", () => {
		const window = new CMainWindow();
		const menuBar = new CMenuBar();
		const statusBar = new CStatusBar();
		const central = new CWidget();

		window.setMenuBar(menuBar);
		window.setStatusBar(statusBar);
		window.setCentralWidget(central);

		window.resize(1000, 700);

		expect(menuBar.width()).toBe(1000);
		expect(statusBar.width()).toBe(1000);
		expect(statusBar.y()).toBe(
			700 - CStatusBar.DefaultHeight
		);
		expect(central.width()).toBe(1000);
	});

	test("sizeHint includes managed widgets", () => {
		const window = new CMainWindow();
		const central = new TestWidget(400, 300);
		const menuBar = new CMenuBar();
		const toolBar = new CToolBar();
		const statusBar = new CStatusBar();

		window.setCentralWidget(central);
		window.setMenuBar(menuBar);
		window.addToolBar(toolBar);
		window.setStatusBar(statusBar);

		const hint = window.sizeHint();

		expect(hint.width()).toBeGreaterThanOrEqual(400);
		expect(hint.height()).toBe(
			300 +
			menuBar.sizeHint().height() +
			toolBar.sizeHint().height() +
			statusBar.sizeHint().height()
		);
	});

	test("sizeHint ignores hidden managed widgets", () => {
		const window = new CMainWindow();
		const central = new TestWidget(400, 300);
		const menuBar = new CMenuBar();
		const statusBar = new CStatusBar();

		window.setCentralWidget(central);
		window.setMenuBar(menuBar);
		window.setStatusBar(statusBar);

		menuBar.hide();
		statusBar.hide();

		const hint = window.sizeHint();

		expect(hint.width()).toBe(400);
		expect(hint.height()).toBe(300);
	});

	test("dock widget is not floating by default", () => {
		const dock = new CDockWidget();

		expect(dock.isFloating()).toBe(false);
	});

	test("dock widget is movable by default", () => {
		const dock = new CDockWidget();

		expect(dock.isMovable()).toBe(true);

		dock.setMovable(false);

		expect(dock.isMovable()).toBe(false);
	});

	test("returns dock widget area", () => {
		const window = new CMainWindow();
		const dock = new CDockWidget();

		window.addDockWidget(CDockWidgetArea.Right, dock);

		expect(window.dockWidgetArea(dock))
			.toBe(CDockWidgetArea.Right);
	});

	test("makes dock widget floating", () => {
		const window = new CMainWindow();
		const dock = new CDockWidget();

		window.setGeometry(0, 0, 800, 600);
		window.addDockWidget(CDockWidgetArea.Left, dock);

		window.setDockWidgetFloating(dock, true);

		expect(dock.isFloating()).toBe(true);
		expect(dock.parent()).toBe(window);
		expect(window.dockWidgetArea(dock)).toBeNull();
	});

	test("restores floating dock widget to previous area", () => {
		const window = new CMainWindow();
		const dock = new CDockWidget();

		window.setGeometry(0, 0, 800, 600);
		window.addDockWidget(CDockWidgetArea.Right, dock);

		window.setDockWidgetFloating(dock, true);
		window.setDockWidgetFloating(dock, false);

		expect(dock.isFloating()).toBe(false);
		expect(window.dockWidgetArea(dock))
			.toBe(CDockWidgetArea.Right);
	});

	test("floating emits topLevelChanged", () => {
		const window = new CMainWindow();
		const dock = new CDockWidget();
		const values: boolean[] = [];

		dock.topLevelChanged.connect(
			floating => values.push(floating)
		);

		window.addDockWidget(CDockWidgetArea.Left, dock);
		window.setDockWidgetFloating(dock, true);
		window.setDockWidgetFloating(dock, false);

		expect(values).toEqual([true, false]);
	});

	test("changing dock area emits dockLocationChanged", () => {
		const window = new CMainWindow();
		const dock = new CDockWidget();
		const areas: CDockWidgetArea[] = [];

		dock.dockLocationChanged.connect(
			area => areas.push(area)
		);

		window.addDockWidget(CDockWidgetArea.Left, dock);
		window.addDockWidget(CDockWidgetArea.Bottom, dock);

		expect(areas).toEqual([
			CDockWidgetArea.Bottom
		]);
	});
});