import { CSize } from "../geometry/CSize.js";
import { CWidget } from "./CWidget.js";
import { CMenuBar } from "./CMenuBar.js";
import { CToolBar } from "./CToolBar.js";
import { CStatusBar } from "./CStatusBar.js";
import { CDockArea, CDockWidgetArea } from "./CDockArea.js";
import { CDockWidget } from "./CDockWidget.js";

export interface CMainWindowDockState {
	id: string;
	area: CDockWidgetArea;
	floating: boolean;
	visible: boolean;
	dockWidth: number;
	dockHeight: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface CMainWindowToolBarState {
	id: string;
	index: number;
	visible: boolean;
}

export interface CMainWindowState {
	version: 1;
	dockWidgets: CMainWindowDockState[];
	toolBars: CMainWindowToolBarState[];
	menuBarVisible: boolean | null;
	statusBarVisible: boolean | null;
}

export class CMainWindow extends CWidget {
	#m_menuBar: CMenuBar | null = null;
	#m_toolBars: CToolBar[] = [];
	#m_dockWidgets: CDockWidget[] = [];
	#m_statusBar: CStatusBar | null = null;
	#m_dockArea: CDockArea;
	#m_beforeUnloadHandler: () => void;
	static readonly WorkspaceStorageKey: string = "ct.CMainWindow.workspace";

	constructor(parent: CWidget | null = null) {
		super(parent);

		this.#m_dockArea = new CDockArea(this);
		this.#m_beforeUnloadHandler = () => this.saveWorkspace();

		if (typeof globalThis.addEventListener === "function") {
			globalThis.addEventListener(
				"beforeunload",
				this.#m_beforeUnloadHandler
			);
		}

		this.#updateGeometry();
	}

	menuBar(): CMenuBar | null {
		return this.#m_menuBar;
	}

	setMenuBar(menuBar: CMenuBar | null): void {
		if (this.#m_menuBar === menuBar)
			return;

		if (this.#m_menuBar !== null)
			this.#m_menuBar.setParent(null);

		this.#m_menuBar = menuBar;

		if (menuBar !== null)
			menuBar.setParent(this);

		this.#updateGeometry();
		this.update();
		this.restoreWorkspace();
	}

	addToolBar(toolBar: CToolBar): void {
		if (this.#m_toolBars.includes(toolBar))
			return;

		toolBar.setParent(this);
		this.#m_toolBars.push(toolBar);

		if (toolBar.workspaceId() === "")
			toolBar.setWorkspaceId(`toolbar-${this.#m_toolBars.length - 1}`);

		this.#updateGeometry();
		this.update();
		this.restoreWorkspace();
	}

	removeToolBar(toolBar: CToolBar): void {
		const index = this.#m_toolBars.indexOf(toolBar);

		if (index === -1)
			return;

		this.#m_toolBars.splice(index, 1);
		toolBar.setParent(null);

		this.#updateGeometry();
		this.update();
	}

	toolBars(): readonly CToolBar[] {
		return this.#m_toolBars;
	}

	statusBar(): CStatusBar | null {
		return this.#m_statusBar;
	}

	setStatusBar(statusBar: CStatusBar | null): void {
		if (this.#m_statusBar === statusBar)
			return;

		if (this.#m_statusBar !== null)
			this.#m_statusBar.setParent(null);

		this.#m_statusBar = statusBar;

		if (statusBar !== null)
			statusBar.setParent(this);

		this.#updateGeometry();
		this.update();
		this.restoreWorkspace();
	}

	centralWidget(): CWidget | null {
		return this.#m_dockArea.centralWidget();
	}

	setCentralWidget(widget: CWidget | null): void {
		this.#m_dockArea.setCentralWidget(widget);
	}

	addDockWidget(area: CDockWidgetArea, dockWidget: CDockWidget): void {
		if (!this.#m_dockWidgets.includes(dockWidget)) {
			this.#m_dockWidgets.push(dockWidget);

			if (dockWidget.workspaceId() === "")
				dockWidget.setWorkspaceId(`dock-${this.#m_dockWidgets.length - 1}`);
		}

		if (dockWidget.isFloating())
			dockWidget.setFloatingState(false);

		dockWidget.setMainWindow(this);
		dockWidget.setDockWidgetArea(area);
		this.#m_dockArea.addDockWidget(area, dockWidget);
		this.restoreWorkspace();
	}

	removeDockWidget(dockWidget: CDockWidget): void {
		const index = this.#m_dockWidgets.indexOf(dockWidget);

		if (index !== -1)
			this.#m_dockWidgets.splice(index, 1);

		dockWidget.setMainWindow(null);

		if (dockWidget.isFloating()) {
			if (dockWidget.parent() === this)
				dockWidget.setParent(null);

			dockWidget.setFloatingState(false);
			this.update();
			return;
		}

		this.#m_dockArea.removeDockWidget(dockWidget);
	}

	dockWidgetArea(dockWidget: CDockWidget): CDockWidgetArea | null {
		return this.#m_dockArea.dockWidgetArea(dockWidget);
	}

	setDockWidgetFloating(dockWidget: CDockWidget,
		floating: boolean): void {
		if (dockWidget.isFloating() === floating)
			return;

		if (floating) {
			const area = this.#m_dockArea.dockWidgetArea(dockWidget);

			if (area === null)
				return;

			dockWidget.setDockWidgetArea(area);

			const width = dockWidget.width();
			const height = dockWidget.height();

			this.#m_dockArea.removeDockWidget(dockWidget);

			dockWidget.setParent(this);
			dockWidget.resize(width, height);
			dockWidget.setFloatingState(true);

			this.update();
			return;
		}

		this.#m_dockArea.addDockWidget(
			dockWidget.lastDockArea(), dockWidget
		);

		dockWidget.setFloatingState(false);
		this.update();
	}

	dockWidget(dockWidget: CDockWidget, area: CDockWidgetArea): void {
		if (!this.#m_dockWidgets.includes(dockWidget)) {
			this.#m_dockWidgets.push(dockWidget);

			if (dockWidget.workspaceId() === "")
				dockWidget.setWorkspaceId(`dock-${this.#m_dockWidgets.length - 1}`);
		}

		dockWidget.setMainWindow(this);
		const oldArea = dockWidget.lastDockArea();

		const oldHorizontal = oldArea === CDockWidgetArea.Top || oldArea === CDockWidgetArea.Bottom;
		const newHorizontal = area === CDockWidgetArea.Top || area === CDockWidgetArea.Bottom;

		if (oldHorizontal !== newHorizontal) {
			const width = dockWidget.dockWidth();
			const height = dockWidget.dockHeight();
			dockWidget.setDockWidth(height);
			dockWidget.setDockHeight(width);
		}

		dockWidget.setDockWidgetArea(area);
		this.#m_dockArea.addDockWidget(area, dockWidget);
		dockWidget.setFloatingState(false);
		this.update();
	}

	dockAreaAt(
		dockWidget: CDockWidget,
		canvasX: number,
		canvasY: number
	): CDockWidgetArea | null {
		return this.#m_dockArea.dockAreaAt(
			dockWidget,
			canvasX,
			canvasY
		);
	}

	updateDockPreview(
		dockWidget: CDockWidget,
		canvasX: number,
		canvasY: number
	): void {
		this.#m_dockArea.setDockPreview(
			dockWidget,
			this.dockAreaAt(dockWidget, canvasX, canvasY)
		);
	}

	clearDockPreview(): void {
		this.#m_dockArea.clearDockPreview();
	}

	saveState(): string {
		const state: CMainWindowState = {
			version: 1,
			dockWidgets: this.#m_dockWidgets
				.filter(dock => dock.workspaceId() !== "")
				.map(dock => ({
					id: dock.workspaceId(),
					area: dock.lastDockArea(),
					floating: dock.isFloating(),
					visible: dock.isVisible(),
					dockWidth: dock.dockWidth(),
					dockHeight: dock.dockHeight(),
					x: dock.x(),
					y: dock.y(),
					width: dock.width(),
					height: dock.height()
				})),
			toolBars: this.#m_toolBars
				.filter(toolBar => toolBar.workspaceId() !== "")
				.map((toolBar, index) => ({
					id: toolBar.workspaceId(),
					index,
					visible: toolBar.isVisible()
				})),
			menuBarVisible: this.#m_menuBar?.isVisible() ?? null,
			statusBarVisible: this.#m_statusBar?.isVisible() ?? null
		};

		return JSON.stringify(state);
	}

	restoreState(serializedState: string): boolean {
		let state: CMainWindowState;

		try {
			state = JSON.parse(serializedState) as CMainWindowState;
		} catch {
			return false;
		}

		if (state.version !== 1 ||
			!Array.isArray(state.dockWidgets) ||
			!Array.isArray(state.toolBars)) {
			return false;
		}

		const docks = new Map(
			this.#m_dockWidgets
				.filter(dock => dock.workspaceId() !== "")
				.map(dock => [dock.workspaceId(), dock])
		);

		for (const saved of state.dockWidgets) {
			const dock = docks.get(saved.id);

			if (dock === undefined)
				continue;

			/*
			 * The saved area and dimensions already describe the final
			 * orientation. Set the area first so dockWidget() does not
			 * rotate the saved dimensions a second time.
			 */
			dock.setDockWidgetArea(saved.area);
			dock.setDockWidth(saved.dockWidth);
			dock.setDockHeight(saved.dockHeight);

			if (saved.floating) {

				if (!dock.isFloating()) {
					this.dockWidget(dock, saved.area);
					this.setDockWidgetFloating(dock, true);
				}

				dock.setGeometry(
					saved.x, saved.y,
					saved.width, saved.height
				);
			} else {
				this.dockWidget(dock, saved.area);
			}

			if (saved.visible)
				dock.show();
			else
				dock.hide();
		}

		const toolBars = new Map(
			this.#m_toolBars
				.filter(toolBar => toolBar.workspaceId() !== "")
				.map(toolBar => [toolBar.workspaceId(), toolBar])
		);

		const ordered = [...state.toolBars]
			.sort((a, b) => a.index - b.index)
			.map(saved => toolBars.get(saved.id))
			.filter((toolBar): toolBar is CToolBar =>
				toolBar !== undefined
			);

		const orderedSet = new Set(ordered);
		this.#m_toolBars = [
			...ordered,
			...this.#m_toolBars.filter(toolBar => !orderedSet.has(toolBar))
		];

		for (const saved of state.toolBars) {
			const toolBar = toolBars.get(saved.id);

			if (toolBar === undefined)
				continue;

			if (saved.visible)
				toolBar.show();
			else
				toolBar.hide();
		}

		if (this.#m_menuBar !== null &&
			state.menuBarVisible !== null) {
			if (state.menuBarVisible)
				this.#m_menuBar.show();
			else
				this.#m_menuBar.hide();
		}

		if (this.#m_statusBar !== null &&
			state.statusBarVisible !== null) {
			if (state.statusBarVisible)
				this.#m_statusBar.show();
			else
				this.#m_statusBar.hide();
		}

		this.#updateGeometry();
		this.update();
		return true;
	}

	resetWorkspace(): void {
		const storage = this.#workspaceStorage();
		if (storage !== null)
			storage.removeItem(CMainWindow.WorkspaceStorageKey);
	}

	override setGeometry(x: number, y: number, width: number, height: number
	): void {
		super.setGeometry(x, y, width, height);
		this.#updateGeometry();
	}

	override resize(width: number, height: number): void {
		super.resize(width, height);
		this.#updateGeometry();
	}

	override sizeHint(): CSize {
		const center = this.#m_dockArea.sizeHint();

		let width = center.width();
		let height = center.height();

		if (this.#m_menuBar !== null && this.#m_menuBar.isVisible())
			height += this.#m_menuBar.sizeHint().height();

		for (const toolBar of this.#m_toolBars) {
			if (!toolBar.isVisible())
				continue;

			width = Math.max(width, toolBar.sizeHint().width());
			height += toolBar.sizeHint().height();
		}

		if (this.#m_statusBar !== null && this.#m_statusBar.isVisible()) {
			width = Math.max(
				width,
				this.#m_statusBar.sizeHint().width()
			);
			height += this.#m_statusBar.sizeHint().height();
		}

		return new CSize(width, height);
	}

	protected override childVisibilityChanged(
		_child: CWidget
	): void {
		this.#updateGeometry();
		this.update();
	}

	#updateGeometry(): void {
		let top = 0;
		let bottom = this.height();

		if (this.#m_menuBar !== null && this.#m_menuBar.isVisible()) {
			const height = this.#m_menuBar.sizeHint().height();
			this.#m_menuBar.setGeometry(0, top, this.width(), height);
			top += height;
		}

		for (const toolBar of this.#m_toolBars) {
			if (!toolBar.isVisible())
				continue;

			const height = toolBar.sizeHint().height();
			toolBar.setGeometry(0, top, this.width(), height);
			top += height;
		}

		if (this.#m_statusBar !== null && this.#m_statusBar.isVisible()) {
			const height = this.#m_statusBar.sizeHint().height();
			bottom -= height;
			this.#m_statusBar.setGeometry(0, bottom, this.width(), height);
		}

		this.#m_dockArea.setGeometry(0, top, this.width(), Math.max(0, bottom - top));
	}

	saveWorkspace(): void {
		const storage = this.#workspaceStorage();

		if (storage === null)
			return;

		storage.setItem(
			CMainWindow.WorkspaceStorageKey,
			this.saveState()
		);
	}

	restoreWorkspace(): boolean {
		const storage = this.#workspaceStorage();

		if (storage === null)
			return false;

		const state = storage.getItem(
			CMainWindow.WorkspaceStorageKey
		);

		if (state === null)
			return false;

		return this.restoreState(state);
	}

	override destroy(): void {
		if (typeof globalThis.removeEventListener === "function") {
			globalThis.removeEventListener(
				"beforeunload",
				this.#m_beforeUnloadHandler
			);
		}

		super.destroy();
	}

	#workspaceStorage(): Storage | null {
		try {
			return globalThis.localStorage ?? null;
		} catch {
			return null;
		}
	}
}