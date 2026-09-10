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

/** Defines the public cmain window dock state API. */
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

/** Defines the public cmain window tool bar state API. */
export interface CMainWindowToolBarState {
	id: string;
	area: CToolBarArea;
	index: number;
	visible: boolean;
}

/** Defines the public cmain window state API. */
export interface CMainWindowState {
	version: 2;
	dockWidgets: CMainWindowDockState[];
	toolBars: CMainWindowToolBarState[];
	menuBarVisible: boolean | null;
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

/** Implements the main window widget. */
export class CMainWindow extends CWidget {
	#m_menuBar: CMenuBar | null = null;
	#m_toolBars: CToolBarItem[] = [];
	#m_dockWidgets: CDockWidget[] = [];
	#m_statusBar: CStatusBar | null = null;
	#m_dockArea: CDockArea;
	#m_beforeUnloadHandler: () => void;
	#m_toolBarPreview: CToolBarPreview | null = null;
	static readonly WorkspaceStorageKey: string = "ct.CMainWindow.workspace";

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.#m_dockArea = new CDockArea(this);
		this.#m_beforeUnloadHandler = () => this.saveWorkspace();

		/** Provides if behavior. */
		if (typeof globalThis.addEventListener === "function") {
			globalThis.addEventListener(
				"beforeunload",
				this.#m_beforeUnloadHandler
			);
		}

		this.#updateGeometry();
	}

	/** Provides menu bar behavior. */
	menuBar(): CMenuBar | null {
		return this.#m_menuBar;
	}

	/** Sets the menu bar. */
	setMenuBar(menuBar: CMenuBar | null): void {
		/** Provides if behavior. */
		if (this.#m_menuBar === menuBar)
			return;

		/** Provides if behavior. */
		if (this.#m_menuBar !== null)
			this.#m_menuBar.setParent(null);

		this.#m_menuBar = menuBar;

		/** Provides if behavior. */
		if (menuBar !== null)
			menuBar.setParent(this);

		this.#updateGeometry();
		this.update();
		this.restoreWorkspace();
	}

	/** Adds tool bar. */
	addToolBar(toolBar: CToolBar): void;
	/** Adds tool bar. */
	addToolBar(area: CToolBarArea, toolBar: CToolBar): void;

	/** Adds tool bar. */
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

		/** Provides if behavior. */
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

		/** Provides if behavior. */
		if (toolBar.workspaceId() === "")
			toolBar.setWorkspaceId(`toolbar-${this.#m_toolBars.length - 1}`);

		this.#updateGeometry();
		this.update();
		this.restoreWorkspace();
	}

	/** Removes tool bar. */
	removeToolBar(toolBar: CToolBar): void {
		const index = this.#m_toolBars.findIndex(
			item => item.toolBar === toolBar
		);

		/** Provides if behavior. */
		if (index === -1)
			return;

		this.#m_toolBars.splice(index, 1);
		toolBar.setMainWindow(null);
		toolBar.setFloatingState(false);
		toolBar.setParent(null);

		this.#updateGeometry();
		this.update();
	}

	/** Provides tool bars behavior. */
	toolBars(area?: CToolBarArea): readonly CToolBar[] {
		return this.#m_toolBars
			.filter(item => area === undefined || item.area === area)
			.map(item => item.toolBar);
	}

	/** Provides tool bar area behavior. */
	toolBarArea(toolBar: CToolBar): CToolBarArea | null {
		return this.#m_toolBars.find(
			item => item.toolBar === toolBar
		)?.area ?? null;
	}

	/** Provides move tool bar behavior. */
	moveToolBar(
		toolBar: CToolBar,
		area: CToolBarArea,
		index?: number
	): void {
		const oldIndex = this.#m_toolBars.findIndex(
			item => item.toolBar === toolBar
		);

		/** Provides if behavior. */
		if (oldIndex === -1)
			return;

		const removed = this.#m_toolBars.splice(oldIndex, 1);
		const item = removed[0];

		/** Provides if behavior. */
		if (item === undefined)
			return;

		item.area = area;
		item.floating = false;
		toolBar.setFloatingState(false);
		this.#setToolBarOrientation(toolBar, area);

		/** Provides if behavior. */
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

			/** Provides if behavior. */
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



	/** Provides begin tool bar drag behavior. */
	beginToolBarDrag(toolBar: CToolBar): void {
		const item = this.#m_toolBars.find(
			item => item.toolBar === toolBar
		);

		/** Provides if behavior. */
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

	/** Provides dock tool bar behavior. */
	dockToolBar(
		toolBar: CToolBar,
		area: CToolBarArea,
		index?: number
	): void {
		const item = this.#m_toolBars.find(
			item => item.toolBar === toolBar
		);

		/** Provides if behavior. */
		if (item === undefined)
			return;

		item.floating = false;
		toolBar.setFloatingState(false);

		this.moveToolBar(toolBar, area, index);
	}

	/** Provides tool bar area at behavior. */
	toolBarAreaAt(
		canvasX: number,
		canvasY: number
	): CToolBarArea | null {
		const pos = this.mapFromCanvas(canvasX, canvasY);

		/** Provides if behavior. */
		if (
			pos.x() < 0 ||
			pos.y() < 0 ||
			pos.x() >= this.width() ||
			pos.y() >= this.height()
		)
			return null;

		const marginX = Math.min(64, this.width() / 4);
		const marginY = Math.min(64, this.height() / 4);

		/** Provides if behavior. */
		if (pos.x() < marginX)
			return CToolBarArea.Left;

		/** Provides if behavior. */
		if (pos.x() >= this.width() - marginX)
			return CToolBarArea.Right;

		/** Provides if behavior. */
		if (pos.y() < marginY)
			return CToolBarArea.Top;

		/** Provides if behavior. */
		if (pos.y() >= this.height() - marginY)
			return CToolBarArea.Bottom;

		return null;
	}


	/** Provides update tool bar preview behavior. */
	updateToolBarPreview(
		toolBar: CToolBar,
		canvasX: number,
		canvasY: number
	): void {
		const area = this.toolBarAreaAt(canvasX, canvasY);

		/** Provides if behavior. */
		if (area === null) {
			this.clearToolBarPreview();
			return;
		}

		/** Provides if behavior. */
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

	/** Clears tool bar preview. */
	clearToolBarPreview(): void {
		/** Provides if behavior. */
		if (this.#m_toolBarPreview === null)
			return;

		this.#m_toolBarPreview = null;
		this.update();
	}



	/** Provides status bar behavior. */
	statusBar(): CStatusBar | null {
		return this.#m_statusBar;
	}

	/** Sets the status bar. */
	setStatusBar(statusBar: CStatusBar | null): void {
		/** Provides if behavior. */
		if (this.#m_statusBar === statusBar)
			return;

		/** Provides if behavior. */
		if (this.#m_statusBar !== null)
			this.#m_statusBar.setParent(null);

		this.#m_statusBar = statusBar;

		/** Provides if behavior. */
		if (statusBar !== null)
			statusBar.setParent(this);

		this.#updateGeometry();
		this.update();
		this.restoreWorkspace();
	}

	/** Provides central widget behavior. */
	centralWidget(): CWidget | null {
		return this.#m_dockArea.centralWidget();
	}

	/** Sets the central widget. */
	setCentralWidget(widget: CWidget | null): void {
		this.#m_dockArea.setCentralWidget(widget);
	}

	/** Adds dock widget. */
	addDockWidget(area: CDockWidgetArea, dockWidget: CDockWidget): void {
		/** Provides if behavior. */
		if (!this.#m_dockWidgets.includes(dockWidget)) {
			this.#m_dockWidgets.push(dockWidget);

			/** Provides if behavior. */
			if (dockWidget.workspaceId() === "")
				dockWidget.setWorkspaceId(`dock-${this.#m_dockWidgets.length - 1}`);
		}

		/** Provides if behavior. */
		if (dockWidget.isFloating())
			dockWidget.setFloatingState(false);

		dockWidget.setMainWindow(this);
		dockWidget.setDockWidgetArea(area);
		this.#m_dockArea.addDockWidget(area, dockWidget);
		this.restoreWorkspace();
	}

	/** Removes dock widget. */
	removeDockWidget(dockWidget: CDockWidget): void {
		const index = this.#m_dockWidgets.indexOf(dockWidget);

		/** Provides if behavior. */
		if (index !== -1)
			this.#m_dockWidgets.splice(index, 1);

		dockWidget.setMainWindow(null);

		/** Provides if behavior. */
		if (dockWidget.isFloating()) {
			/** Provides if behavior. */
			if (dockWidget.parent() === this)
				dockWidget.setParent(null);

			dockWidget.setFloatingState(false);
			this.update();
			return;
		}

		this.#m_dockArea.removeDockWidget(dockWidget);
	}

	/** Provides dock widget area behavior. */
	dockWidgetArea(dockWidget: CDockWidget): CDockWidgetArea | null {
		return this.#m_dockArea.dockWidgetArea(dockWidget);
	}

	/** Sets the dock widget floating. */
	setDockWidgetFloating(dockWidget: CDockWidget,
		floating: boolean): void {
		/** Provides if behavior. */
		if (dockWidget.isFloating() === floating)
			return;

		/** Provides if behavior. */
		if (floating) {
			const area = this.#m_dockArea.dockWidgetArea(dockWidget);

			/** Provides if behavior. */
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

	/** Provides dock widget behavior. */
	dockWidget(dockWidget: CDockWidget, area: CDockWidgetArea): void {
		/** Provides if behavior. */
		if (!this.#m_dockWidgets.includes(dockWidget)) {
			this.#m_dockWidgets.push(dockWidget);

			/** Provides if behavior. */
			if (dockWidget.workspaceId() === "")
				dockWidget.setWorkspaceId(`dock-${this.#m_dockWidgets.length - 1}`);
		}

		dockWidget.setMainWindow(this);
		const oldArea = dockWidget.lastDockArea();

		const oldHorizontal = oldArea === CDockWidgetArea.Top || oldArea === CDockWidgetArea.Bottom;
		const newHorizontal = area === CDockWidgetArea.Top || area === CDockWidgetArea.Bottom;

		/** Provides if behavior. */
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

	/** Provides dock area at behavior. */
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

	/** Provides update dock preview behavior. */
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

	/** Clears dock preview. */
	clearDockPreview(): void {
		this.#m_dockArea.clearDockPreview();
	}

	/** Provides save state behavior. */
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

	/** Provides restore state behavior. */
	restoreState(serializedState: string): boolean {
		let state: CMainWindowState;

		try {
			state = JSON.parse(serializedState) as CMainWindowState;
		} catch {
			return false;
		}

		/** Provides if behavior. */
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

		/** Provides for behavior. */
		for (const saved of state.dockWidgets) {
			const dock = docks.get(saved.id);

			/** Provides if behavior. */
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

			/** Provides if behavior. */
			if (saved.floating) {

				/** Provides if behavior. */
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

			/** Provides if behavior. */
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

		/** Provides for behavior. */
		for (const saved of [...state.toolBars].sort(
			(a, b) => a.index - b.index
		)) {
			const toolBar = toolBars.get(saved.id);

			/** Provides if behavior. */
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

			/** Provides if behavior. */
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

		/** Provides if behavior. */
		if (this.#m_menuBar !== null &&
			state.menuBarVisible !== null) {
			/** Provides if behavior. */
			if (state.menuBarVisible)
				this.#m_menuBar.show();
			else
				this.#m_menuBar.hide();
		}

		/** Provides if behavior. */
		if (this.#m_statusBar !== null &&
			state.statusBarVisible !== null) {
			/** Provides if behavior. */
			if (state.statusBarVisible)
				this.#m_statusBar.show();
			else
				this.#m_statusBar.hide();
		}

		this.#updateGeometry();
		this.update();
		return true;
	}

	/** Provides reset workspace behavior. */
	resetWorkspace(): void {
		const storage = this.#workspaceStorage();
		/** Provides if behavior. */
		if (storage !== null)
			storage.removeItem(CMainWindow.WorkspaceStorageKey);
	}


	/** Renders the widget. */
	override render(painter: CPainter): void {
		super.render(painter);

		/** Provides if behavior. */
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


	/** Sets the geometry. */
	override setGeometry(x: number, y: number, width: number, height: number
	): void {
		super.setGeometry(x, y, width, height);
		this.#updateGeometry();
	}

	/** Provides resize behavior. */
	override resize(width: number, height: number): void {
		super.resize(width, height);
		this.#updateGeometry();
	}

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize {
		const center = this.#m_dockArea.sizeHint();

		let centerWidth = center.width();
		let centerHeight = center.height();
		let topBottomHeight = 0;
		let horizontalToolBarWidth = 0;
		let sideWidth = 0;
		let verticalToolBarHeight = 0;

		/** Provides for behavior. */
		for (const item of this.#m_toolBars) {
			/** Provides if behavior. */
			if (!item.toolBar.isVisible() || item.floating)
				continue;

			/** Provides if behavior. */
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

		/** Provides if behavior. */
		if (this.#m_menuBar !== null && this.#m_menuBar.isVisible()) {
			width = Math.max(width, this.#m_menuBar.sizeHint().width());
			height += this.#m_menuBar.sizeHint().height();
		}

		/** Provides if behavior. */
		if (this.#m_statusBar !== null && this.#m_statusBar.isVisible()) {
			width = Math.max(width, this.#m_statusBar.sizeHint().width());
			height += this.#m_statusBar.sizeHint().height();
		}

		return new CSize(width, height);
	}


	/** Handles child visibility changed behavior. */
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

		/** Provides if behavior. */
		if (this.#m_menuBar !== null && this.#m_menuBar.isVisible()) {
			const height = this.#m_menuBar.sizeHint().height();
			this.#m_menuBar.setGeometry(0, top, this.width(), height);
			top += height;
		}

		/** Provides if behavior. */
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

		/** Provides for behavior. */
		for (const item of this.#m_toolBars) {
			/** Provides if behavior. */
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

		/** Provides for behavior. */
		for (const item of this.#m_toolBars) {
			/** Provides if behavior. */
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

		/** Provides for behavior. */
		for (const item of this.#m_toolBars) {
			/** Provides if behavior. */
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

		/** Provides for behavior. */
		for (const item of this.#m_toolBars) {
			/** Provides if behavior. */
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

		/** Provides if behavior. */
		if (this.#m_menuBar !== null && this.#m_menuBar.isVisible())
			top += this.#m_menuBar.sizeHint().height();

		/** Provides if behavior. */
		if (this.#m_statusBar !== null && this.#m_statusBar.isVisible())
			bottom -= this.#m_statusBar.sizeHint().height();

		/** Provides for behavior. */
		for (const item of this.#m_toolBars) {
			/** Provides if behavior. */
			if (
				item.toolBar === toolBar ||
				!item.toolBar.isVisible() ||
				item.floating
			)
				continue;

			/** Provides switch behavior. */
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

		/** Provides switch behavior. */
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


	/** Provides save workspace behavior. */
	saveWorkspace(): void {
		const storage = this.#workspaceStorage();

		/** Provides if behavior. */
		if (storage === null)
			return;

		storage.setItem(
			CMainWindow.WorkspaceStorageKey,
			this.saveState()
		);
	}

	/** Provides restore workspace behavior. */
	restoreWorkspace(): boolean {
		const storage = this.#workspaceStorage();

		/** Provides if behavior. */
		if (storage === null)
			return false;

		const state = storage.getItem(
			CMainWindow.WorkspaceStorageKey
		);

		/** Provides if behavior. */
		if (state === null)
			return false;

		return this.restoreState(state);
	}

	/** Releases resources owned by the widget. */
	override destroy(): void {
		/** Provides if behavior. */
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