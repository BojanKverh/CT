import { CSize } from "../geometry/CSize.js";
import { CWidget } from "./CWidget.js";
import { CMenuBar } from "./CMenuBar.js";
import { CToolBar } from "./CToolBar.js";
import { CStatusBar } from "./CStatusBar.js";
import { CDockArea, CDockWidgetArea } from "./CDockArea.js";
import { CDockWidget } from "./CDockWidget.js";

export class CMainWindow extends CWidget {
	#m_menuBar: CMenuBar | null = null;
	#m_toolBars: CToolBar[] = [];
	#m_statusBar: CStatusBar | null = null;
	#m_dockArea: CDockArea;


	constructor(parent: CWidget | null = null) {
		super(parent);

		this.#m_dockArea = new CDockArea(this);
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
	}

	addToolBar(toolBar: CToolBar): void {
		if (this.#m_toolBars.includes(toolBar))
			return;

		toolBar.setParent(this);
		this.#m_toolBars.push(toolBar);

		this.#updateGeometry();
		this.update();
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
	}

	centralWidget(): CWidget | null {
		return this.#m_dockArea.centralWidget();
	}

	setCentralWidget(widget: CWidget | null): void {
		this.#m_dockArea.setCentralWidget(widget);
	}

	addDockWidget(area: CDockWidgetArea, dockWidget: CDockWidget): void {
		if (dockWidget.isFloating())
			dockWidget.setFloatingState(false);

		dockWidget.setMainWindow(this);
		dockWidget.setDockWidgetArea(area);
		this.#m_dockArea.addDockWidget(area, dockWidget);
	}

	removeDockWidget(dockWidget: CDockWidget): void {
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
		dockWidget.setDockWidgetArea(area);
		this.#m_dockArea.addDockWidget(area, dockWidget);
		dockWidget.setFloatingState(false);
		this.update();
	}

	dockAreaAt(canvasX: number, canvasY: number
	): CDockWidgetArea | null {
		const pos = this.mapFromCanvas(canvasX, canvasY);

		if (pos.x() < 0 || pos.y() < 0 ||
			pos.x() >= this.width() ||
			pos.y() >= this.height()) {
			return null;
		}

		const marginX = Math.min(
			80,
			this.width() / 4
		);

		const marginY = Math.min(
			80,
			this.height() / 4
		);

		if (pos.x() < marginX)
			return CDockWidgetArea.Left;

		if (pos.x() >= this.width() - marginX)
			return CDockWidgetArea.Right;

		if (pos.y() < marginY)
			return CDockWidgetArea.Top;

		if (pos.y() >= this.height() - marginY)
			return CDockWidgetArea.Bottom;

		return null;
	}

	updateDockPreview(
		dockWidget: CDockWidget,
		canvasX: number,
		canvasY: number
	): void {
		this.#m_dockArea.setDockPreview(
			dockWidget,
			this.dockAreaAt(canvasX, canvasY)
		);
	}

	clearDockPreview(): void {
		this.#m_dockArea.clearDockPreview();
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
}