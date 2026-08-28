import { CSize } from "../geometry/CSize.js";
import { CWidget } from "./CWidget.js";
import { CMenuBar } from "./CMenuBar.js";
import { CToolBar } from "./CToolBar.js";
import { CStatusBar } from "./CStatusBar.js";
import {
	CDockArea,
	CDockWidgetArea
} from "./CDockArea.js";
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

	addDockWidget(
		area: CDockWidgetArea,
		dockWidget: CDockWidget
	): void {
		this.#m_dockArea.addDockWidget(area, dockWidget);
	}

	removeDockWidget(dockWidget: CDockWidget): void {
		this.#m_dockArea.removeDockWidget(dockWidget);
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