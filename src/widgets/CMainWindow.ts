/** @module Widgets/CMainWindow */
import { CSize } from "../geometry/CSize.js";
import { CWidget } from "./CWidget.js";
import { CMenuBar } from "./CMenuBar.js";
import { CToolBar, CToolBarArea } from "./CToolBar.js";
import { CStatusBar } from "./CStatusBar.js";
import { CDockArea, CDockWidgetArea } from "./CDockArea.js";
import { CDockWidget } from "./CDockWidget.js";
import { COrientation } from "../gui/COrientation.js";
import type { CPainter } from "../painting/CPainter.js";
import { CRect } from "../geometry/CRect.js";
import { CPaletteColorRole } from "../gui/CPalette.js";

/**
 * Persisted docking, visibility and floating geometry for one named dock widget.
 */
export interface CMainWindowDockState {
    /**
    * Stable objectName used to match an existing dock during restoration.
    */
    id: string;
    /**
    * Dock edge to restore when attached to the main window.
    */
    area: CDockWidgetArea;
    /**
    * Whether the dock is detached from an edge.
    */
    floating: boolean;
    /**
    * Whether the dock is shown after restoration.
    */
    visible: boolean;
    /**
    * Remembered logical width when attached to a vertical dock edge.
    */
    dockWidth: number;
    /**
    * Remembered logical height when attached to a horizontal dock edge.
    */
    dockHeight: number;
    /**
    * Floating horizontal position in application coordinates.
    */
    x: number;
    /**
    * Floating vertical position in application coordinates.
    */
    y: number;
    /**
    * Floating logical width.
    */
    width: number;
    /**
    * Floating logical height.
    */
    height: number;
}

/**
 * Persisted placement and visibility of one named toolbar.
 */
export interface CMainWindowToolBarState {
    /**
    * Stable objectName used to match an existing toolbar.
    */
    id: string;
    /**
    * Main-window edge hosting the toolbar.
    */
    area: CToolBarArea;
    /**
    * Ordering position among toolbars at this edge.
    */
    index: number;
    /**
    * Whether the toolbar is shown after restoration.
    */
    visible: boolean;
}

/**
 * Versioned main-window layout snapshot returned by saveState() and consumed by restoreState().
 */
export interface CMainWindowState {
    /**
    * Snapshot schema discriminator; current snapshots use version 2.
    */
    version: 2;
    /**
    * Saved geometry and placement for named dock widgets.
    */
    dockWidgets: CMainWindowDockState[];
    /**
    * Saved placement and visibility for named toolbars.
    */
    toolBars: CMainWindowToolBarState[];
    /**
    * Saved menu-strip visibility, or null when no strip was present.
    */
    menuBarVisible: boolean | null;
    /**
    * Saved status-strip visibility, or null when no strip was present.
    */
    statusBarVisible: boolean | null;
}

type CToolBarItem = {
	area: CToolBarArea;
	toolBar: CToolBar;
	floating: boolean;
};

type CToolBarPreview = {
	toolBar: CToolBar;
	area: CToolBarArea;
};

/**
 * Application window managing menus, toolbars, dock panels, central content and a status bar.
 * Add a central widget with its own layout. Available central geometry updates when
 * the window resizes or surrounding controls change.
 *
 * @example
 * Create CApplication first, then build the top-level window and size it to the application viewport. The central widget manages its children through a grid layout.
 * ```ts
 * import {
 *     CGridLayout, CLabel, CMainWindow, CMenuBar, CStatusBar, CWidget
 * } from "canvas-toolkit-lib";
 *
 * function createMainWindow(): CMainWindow {
 *     const main = new CMainWindow();
 *     const content = new CWidget();
 *     const layout = new CGridLayout();
 *     const label = new CLabel(content);
 *     label.setText("Ready");
 *     layout.addWidget(label, 0, 0);
 *     content.setLayout(layout);
 *     main.setCentralWidget(content);
 *     main.setMenuBar(new CMenuBar());
 *     main.setStatusBar(new CStatusBar());
 *     return main;
 * }
 * ```
 */
export class CMainWindow extends CWidget {
	#m_menuBar: CMenuBar | null = null;
	#m_toolBars: CToolBarItem[] = [];
	#m_dockWidgets: CDockWidget[] = [];
	#m_statusBar: CStatusBar | null = null;
	#m_dockArea: CDockArea;
	#m_beforeUnloadHandler: () => void;
	#m_toolBarPreview: CToolBarPreview | null = null;
    /** Browser-storage key used by main-window workspace persistence. */
    static readonly WorkspaceStorageKey: string = "ct.CMainWindow.workspace";

    /**
    * Creates the central dock area and registers workspace saving for the browser's beforeunload event.
    */
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

    /**
    * Returns the installed menu bar or null. A menu bar is created explicitly.
    */
    menuBar(): CMenuBar | null {
		return this.#m_menuBar;
	}

    /**
    * Reparents the menu bar to this window and recalculates reserved content space. Null removes the current menu bar.
    */
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

    /**
    * Adds a toolbar to a docking area. The single-toolbar overload uses the default area. Layout recalculates space around the central dock area.
    */
    addToolBar(toolBar: CToolBar): void;
    /**
    * Adds a toolbar to a docking area. The single-toolbar overload uses the default area. Layout recalculates space around the central dock area.
    */
    addToolBar(area: CToolBarArea, toolBar: CToolBar): void;

    /**
    * Adds a toolbar to a docking area. The single-toolbar overload uses the default area. Layout recalculates space around the central dock area.
    */
    addToolBar(
		areaOrToolBar: CToolBarArea | CToolBar,
		maybeToolBar?: CToolBar
	): void {
		const area = areaOrToolBar instanceof CToolBar
			? CToolBarArea.Top
			: areaOrToolBar;

		const toolBar = areaOrToolBar instanceof CToolBar
			? areaOrToolBar
			: maybeToolBar!;

		if (this.#m_toolBars.some(item => item.toolBar === toolBar))
			return;

		toolBar.setParent(this);
		toolBar.setMainWindow(this);
		toolBar.setFloatingState(false);
		this.#setToolBarOrientation(toolBar, area);

		this.#m_toolBars.push({
			area,
			toolBar,
			floating: false
		});

		if (toolBar.workspaceId() === "")
			toolBar.setWorkspaceId(`toolbar-${this.#m_toolBars.length - 1}`);

		this.#updateGeometry();
		this.update();
		this.restoreWorkspace();
	}

    /**
    * Removes the toolbar from the managed docked and floating toolbar collection.
    */
    removeToolBar(toolBar: CToolBar): void {
		const index = this.#m_toolBars.findIndex(
			item => item.toolBar === toolBar
		);

		if (index === -1)
			return;

		this.#m_toolBars.splice(index, 1);
		toolBar.setMainWindow(null);
		toolBar.setFloatingState(false);
		toolBar.setParent(null);

		this.#updateGeometry();
		this.update();
	}

    /**
    * Returns managed toolbars, optionally restricted to one docking area.
    */
    toolBars(area?: CToolBarArea): readonly CToolBar[] {
		return this.#m_toolBars
			.filter(item => area === undefined || item.area === area)
			.map(item => item.toolBar);
	}

    /**
    * Returns a toolbar's current docking area or null when it is unmanaged.
    */
    toolBarArea(toolBar: CToolBar): CToolBarArea | null {
		return this.#m_toolBars.find(
			item => item.toolBar === toolBar
		)?.area ?? null;
	}

    /**
    * Moves a toolbar to a requested docking area and order.
    */
    moveToolBar(
		toolBar: CToolBar,
		area: CToolBarArea,
		index?: number
	): void {
		const oldIndex = this.#m_toolBars.findIndex(
			item => item.toolBar === toolBar
		);

		if (oldIndex === -1)
			return;

		const removed = this.#m_toolBars.splice(oldIndex, 1);
		const item = removed[0];

		if (item === undefined)
			return;

		item.area = area;
		item.floating = false;
		toolBar.setFloatingState(false);
		this.#setToolBarOrientation(toolBar, area);

		if (index === undefined) {
			this.#m_toolBars.push(item);
		} else {
			const areaIndices = this.#m_toolBars
				.map((candidate, i) => ({candidate, i}))
				.filter(entry => entry.candidate.area === area)
				.map(entry => entry.i);

			const clampedIndex = Math.max(
				0,
				Math.min(index, areaIndices.length)
			);

			let insertionIndex: number;

			if (clampedIndex === areaIndices.length) {
				insertionIndex = areaIndices.length === 0
					? this.#m_toolBars.length
					: areaIndices[areaIndices.length - 1]! + 1;
			} else {
				insertionIndex = areaIndices[clampedIndex]!;
			}

			this.#m_toolBars.splice(insertionIndex, 0, item);
		}

		this.#updateGeometry();
		this.update();
	}

    /**
    * @internal Starts managed toolbar dragging.
    */
    beginToolBarDrag(toolBar: CToolBar): void {
		const item = this.#m_toolBars.find(
			item => item.toolBar === toolBar
		);

		if (item === undefined || item.floating)
			return;

		const x = toolBar.x();
		const y = toolBar.y();
		const hint = toolBar.sizeHint();

		item.floating = true;
		toolBar.setFloatingState(true);
		toolBar.setParent(this);
		toolBar.setGeometry(
			x,
			y,
			hint.width(),
			hint.height()
		);

		this.#updateGeometry();
		this.update();
	}

    /**
    * @internal Completes toolbar docking after a drag.
    */
    dockToolBar(
		toolBar: CToolBar,
		area: CToolBarArea,
		index?: number
	): void {
		const item = this.#m_toolBars.find(
			item => item.toolBar === toolBar
		);

		if (item === undefined)
			return;

		item.floating = false;
		toolBar.setFloatingState(false);

		this.moveToolBar(toolBar, area, index);
	}

    /**
    * @internal Determines the toolbar docking zone at a position.
    */
    toolBarAreaAt(
		canvasX: number,
		canvasY: number
	): CToolBarArea | null {
		const pos = this.mapFromCanvas(canvasX, canvasY);

		if (
			pos.x() < 0 ||
			pos.y() < 0 ||
			pos.x() >= this.width() ||
			pos.y() >= this.height()
		)
			return null;

		const marginX = Math.min(64, this.width() / 4);
		const marginY = Math.min(64, this.height() / 4);

		if (pos.x() < marginX)
			return CToolBarArea.Left;

		if (pos.x() >= this.width() - marginX)
			return CToolBarArea.Right;

		if (pos.y() < marginY)
			return CToolBarArea.Top;

		if (pos.y() >= this.height() - marginY)
			return CToolBarArea.Bottom;

		return null;
	}

    /**
    * @internal Updates docking feedback during toolbar dragging.
    */
    updateToolBarPreview(
		toolBar: CToolBar,
		canvasX: number,
		canvasY: number
	): void {
		const area = this.toolBarAreaAt(canvasX, canvasY);

		if (area === null) {
			this.clearToolBarPreview();
			return;
		}

		if (
			this.#m_toolBarPreview?.toolBar === toolBar &&
			this.#m_toolBarPreview.area === area
		)
			return;

		this.#m_toolBarPreview = {
			toolBar,
			area
		};

		this.update();
	}

    /**
    * @internal Clears transient toolbar docking feedback.
    */
    clearToolBarPreview(): void {
		if (this.#m_toolBarPreview === null)
			return;

		this.#m_toolBarPreview = null;
		this.update();
	}

    /**
    * Returns the installed status bar or null.
    */
    statusBar(): CStatusBar | null {
		return this.#m_statusBar;
	}

    /**
    * Installs or removes the bottom status bar and recalculates the central area.
    */
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

    /**
    * Returns the widget filling the central dock-area region, or null.
    */
    centralWidget(): CWidget | null {
		return this.#m_dockArea.centralWidget();
	}

    /**
    * Installs the central content widget inside the managed dock area. Its geometry follows the remaining space after menu, toolbar, status and dock allocation.
    */
    setCentralWidget(widget: CWidget | null): void {
		this.#m_dockArea.setCentralWidget(widget);
	}

    /**
    * Registers and docks a panel in the specified area. The window tracks it for workspace state.
    */
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

    /**
    * Removes a managed dock panel from its dock area.
    */
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

    /**
    * Returns the panel's dock area, or null when it is not docked.
    */
    dockWidgetArea(dockWidget: CDockWidget): CDockWidgetArea | null {
		return this.#m_dockArea.dockWidgetArea(dockWidget);
	}

    /**
    * Moves a managed panel between a floating child window and its remembered dock area.
    */
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

    /**
    * Moves a panel to a specified area, registering it if necessary and preserving orientation-dependent dock extents.
    */
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

    /**
    * Maps a position to a candidate dock area around central content.
    */
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

    /**
    * @internal Updates visual feedback for a pending panel docking operation.
    */
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

    /**
    * @internal Clears panel docking feedback.
    */
    clearDockPreview(): void {
		this.#m_dockArea.clearDockPreview();
	}

    /**
    * Returns the serializable toolbar and dock-panel arrangement, including workspace identifiers and visibility.
    */
    saveState(): string {
		const state: CMainWindowState = {
			version: 2,
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
				.filter(toolBar => toolBar.toolBar.workspaceId() !== "")
				.map((item, index) => ({
					id: item.toolBar.workspaceId(),
					area: item.area,
					index,
					visible: item.toolBar.isVisible()
				})),
			menuBarVisible: this.#m_menuBar?.isVisible() ?? null,
			statusBarVisible: this.#m_statusBar?.isVisible() ?? null
		};

		return JSON.stringify(state);
	}

    /**
    * Applies a previously saved arrangement to matching registered toolbars and dock panels. Returns whether restoration succeeded.
    */
    restoreState(serializedState: string): boolean {
		let state: CMainWindowState;

		try {
			state = JSON.parse(serializedState) as CMainWindowState;
		} catch {
			return false;
		}

		if (state.version !== 2 ||
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
				.filter(item => item.toolBar.workspaceId() !== "")
				.map(item => [item.toolBar.workspaceId(), item.toolBar])
		);

		const savedToolBars: CToolBarItem[] = [];

		for (const saved of [...state.toolBars].sort(
			(a, b) => a.index - b.index
		)) {
			const toolBar = toolBars.get(saved.id);

			if (toolBar === undefined)
				continue;

			toolBar.setMainWindow(this);
			toolBar.setFloatingState(false);
			this.#setToolBarOrientation(toolBar, saved.area);

			savedToolBars.push({
				area: saved.area,
				toolBar,
				floating: false
			});

			if (saved.visible)
				toolBar.show();
			else
				toolBar.hide();
		}

		const restored = new Set(
			savedToolBars.map(item => item.toolBar)
		);

		this.#m_toolBars = [
			...savedToolBars,
			...this.#m_toolBars.filter(
				item => !restored.has(item.toolBar)
			)
		];

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

    /**
    * Restores the window's default workspace arrangement.
    */
    resetWorkspace(): void {
		const storage = this.#workspaceStorage();
		if (storage !== null)
			storage.removeItem(CMainWindow.WorkspaceStorageKey);
	}

    /** Renders the widget. */
    override render(painter: CPainter): void {
		super.render(painter);

		if (
			this.#m_toolBarPreview === null ||
			!this.isVisible()
		)
			return;

		const rect = this.#toolBarPreviewRect(
			this.#m_toolBarPreview.toolBar,
			this.#m_toolBarPreview.area
		);

		painter.save();

		try {
			painter.translate(this.x(), this.y());
			painter.clipRect(this.rect());

			const color = this.palette().color(
				CPaletteColorRole.Highlight
			);

			color.setAlpha(64);
			painter.setBrush(color.toCss());
			painter.fillRect(rect);

			color.setAlpha(230);
			painter.setPen(color.toCss());
			painter.drawRect(
				rect.x(),
				rect.y(),
				rect.width(),
				rect.height()
			);
		} finally {
			painter.restore();
		}
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

		let centerWidth = center.width();
		let centerHeight = center.height();
		let topBottomHeight = 0;
		let horizontalToolBarWidth = 0;
		let sideWidth = 0;
		let verticalToolBarHeight = 0;

		for (const item of this.#m_toolBars) {
			if (!item.toolBar.isVisible() || item.floating)
				continue;

			if (
				item.area === CToolBarArea.Top ||
				item.area === CToolBarArea.Bottom
			) {
				topBottomHeight += item.toolBar.sizeHint().height();
				horizontalToolBarWidth = Math.max(
					horizontalToolBarWidth,
					item.toolBar.sizeHint().width()
				);
			} else {
				sideWidth += item.toolBar.sizeHint().width();
				verticalToolBarHeight = Math.max(
					verticalToolBarHeight,
					item.toolBar.sizeHint().height()
				);
			}
		}

		centerWidth += sideWidth;
		centerHeight = Math.max(centerHeight, verticalToolBarHeight);

		let width = Math.max(centerWidth, horizontalToolBarWidth);
		let height = centerHeight + topBottomHeight;

		if (this.#m_menuBar !== null && this.#m_menuBar.isVisible()) {
			width = Math.max(width, this.#m_menuBar.sizeHint().width());
			height += this.#m_menuBar.sizeHint().height();
		}

		if (this.#m_statusBar !== null && this.#m_statusBar.isVisible()) {
			width = Math.max(width, this.#m_statusBar.sizeHint().width());
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
		let left = 0;
		let top = 0;
		let right = this.width();
		let bottom = this.height();

		if (this.#m_menuBar !== null && this.#m_menuBar.isVisible()) {
			const height = this.#m_menuBar.sizeHint().height();
			this.#m_menuBar.setGeometry(0, top, this.width(), height);
			top += height;
		}

		if (this.#m_statusBar !== null && this.#m_statusBar.isVisible()) {
			const height = this.#m_statusBar.sizeHint().height();
			bottom -= height;
			this.#m_statusBar.setGeometry(
				0,
				bottom,
				this.width(),
				height
			);
		}

		for (const item of this.#m_toolBars) {
			if (
				!item.toolBar.isVisible() ||
				item.floating ||
				item.area !== CToolBarArea.Top
			)
				continue;

			const height = item.toolBar.sizeHint().height();
			item.toolBar.setGeometry(left, top, Math.max(0, right - left), height);
			top += height;
		}

		for (const item of this.#m_toolBars) {
			if (
				!item.toolBar.isVisible() ||
				item.floating ||
				item.area !== CToolBarArea.Bottom
			)
				continue;

			const height = item.toolBar.sizeHint().height();
			bottom -= height;
			item.toolBar.setGeometry(left, bottom, Math.max(0, right - left), height);
		}

		for (const item of this.#m_toolBars) {
			if (
				!item.toolBar.isVisible() ||
				item.floating ||
				item.area !== CToolBarArea.Left
			)
				continue;

			const width = item.toolBar.sizeHint().width();
			item.toolBar.setGeometry(left, top, width, Math.max(0, bottom - top));
			left += width;
		}

		for (const item of this.#m_toolBars) {
			if (
				!item.toolBar.isVisible() ||
				item.floating ||
				item.area !== CToolBarArea.Right
			)
				continue;

			const width = item.toolBar.sizeHint().width();
			right -= width;
			item.toolBar.setGeometry(right, top, width, Math.max(0, bottom - top));
		}

		this.#m_dockArea.setGeometry(
			left,
			top,
			Math.max(0, right - left),
			Math.max(0, bottom - top)
		);
	}

	#toolBarPreviewRect(
		toolBar: CToolBar,
		area: CToolBarArea
	): CRect {
		let left = 0;
		let top = 0;
		let right = this.width();
		let bottom = this.height();

		if (this.#m_menuBar !== null && this.#m_menuBar.isVisible())
			top += this.#m_menuBar.sizeHint().height();

		if (this.#m_statusBar !== null && this.#m_statusBar.isVisible())
			bottom -= this.#m_statusBar.sizeHint().height();

		for (const item of this.#m_toolBars) {
			if (
				item.toolBar === toolBar ||
				!item.toolBar.isVisible() ||
				item.floating
			)
				continue;

			switch (item.area) {
			case CToolBarArea.Top:
				top += item.toolBar.sizeHint().height();
				break;

			case CToolBarArea.Bottom:
				bottom -= item.toolBar.sizeHint().height();
				break;

			case CToolBarArea.Left:
				left += item.toolBar.sizeHint().width();
				break;

			case CToolBarArea.Right:
				right -= item.toolBar.sizeHint().width();
				break;
			}
		}

		const horizontal =
			area === CToolBarArea.Top ||
			area === CToolBarArea.Bottom;

		const extent = toolBar.extent();

		switch (area) {
		case CToolBarArea.Top: {
			const height = Math.min(
				Math.max(0, bottom - top),
				extent
			);

			return new CRect(
				left,
				top,
				Math.max(0, right - left),
				height
			);
		}

		case CToolBarArea.Bottom: {
			const height = Math.min(
				Math.max(0, bottom - top),
				extent
			);

			return new CRect(
				left,
				bottom - height,
				Math.max(0, right - left),
				height
			);
		}

		case CToolBarArea.Left: {
			const width = Math.min(
				Math.max(0, right - left),
				extent
			);

			return new CRect(
				left,
				top,
				width,
				Math.max(0, bottom - top)
			);
		}

		case CToolBarArea.Right: {
			const width = Math.min(
				Math.max(0, right - left),
				extent
			);

			return new CRect(
				right - width,
				top,
				width,
				Math.max(0, bottom - top)
			);
		}
		}
	}

	#setToolBarOrientation(
		toolBar: CToolBar,
		area: CToolBarArea
	): void {
		toolBar.setOrientation(
			area === CToolBarArea.Left ||
			area === CToolBarArea.Right
				? COrientation.Vertical
				: COrientation.Horizontal
		);
	}

    /**
    * Saves the current workspace state to browser storage using the window's workspace key.
    */
    saveWorkspace(): void {
		const storage = this.#workspaceStorage();

		if (storage === null)
			return;

		storage.setItem(
			CMainWindow.WorkspaceStorageKey,
			this.saveState()
		);
	}

    /**
    * Loads and restores a previously stored workspace. Returns false when storage or valid saved state is unavailable.
    */
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

    /** Releases resources owned by the widget. */
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