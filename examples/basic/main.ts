import { CSplitButton } from "../../src/widgets/CSplitButton.js";
import { CSettings } from "../../src/core/CSettings.js";
import { CPaletteColorRole } from "../../src/gui/CPalette.js";
import {CApplication, CWidget, CPainter, CRect, CPoint, CMouseEvent, CMouseButton, CPushButton, CLabel, CAlignment,
    CCheckBox, CLineEdit, CSlider, CProgressBar, CGroupBox, CSpinBox, CScrollBar, COrientation, CPixmap,
    CRadioButton, CButtonGroup, CHBoxLayout, CScrollArea, CMenu, CAction, CMenuBar, CDialog,
	CDialogButtonBox, CStandardButton, CSelectionMode, CListWidget, CListWidgetItem, CStackedWidget,
	CTabWidget, CFrame, CFrameShadow, CFrameShape, CComboBox, CFormLayout, CToolButton, CToolButtonStyle,
	CToolBar, CToolBarArea, CStatusBar, CMainWindow, CMessageBox, CInputDialog, CFileDialog, CProgressDialog, CColor, 
	CColorDialog, CSplitter, CSizeGrip, CToolBox, CCalendarWidget, CDateEdit, CTimeEdit, CDateTimeEdit,
	CTextEdit, CKeySequenceEdit, CListView, CModelIndex, CAbstractListModel, CTableView, CAbstractTableModel,
	CTreeView, CAbstractItemModel, CTreeWidgetItem, CTreeWidget, CTableWidgetItem, CTableWidget, 
	CContextMenuEvent, CDragEnterEvent, CDragMoveEvent, CDragLeaveEvent, CDropEvent,
	CDrag, CMimeData, CDropAction, CIcon, CDockWidget, CDockWidgetArea,
	CCursorShape, CDial, CTextBrowser, CDoubleSpinBox, CIntItemDelegate, CComboBoxItemDelegate,
	CSortOrder, CSortFilterProxyModel, CFont, CSqlRelationalTableModel,
	CMemorySqlTableAdapter, CSqlEditStrategy, CSqlFilterOperator, CSqlRelation,
	CSqlRelationalDelegate, CDateItemDelegate, CTimeItemDelegate,
	CDateTimeItemDelegate, CDataWidgetMapper, CDataWidgetMapperSubmitPolicy,
	CCompleter, CNumberEdit, CNumberItemDelegate, CShortcut, CPlainTextEdit, CTextEditFindFlag,
    CSize, CListViewMode, CSplashScreen, CImageView, CWizardDialog, CWizardPage, CVariantAnimation, CPropertyAnimation, CAnimationState, CAnimationDirection, CVBoxLayout, CParallelAnimationGroup, CSequentialAnimationGroup, CEasingCurveType,
	CPauseAnimation, CCssPalette
} from "../../src/index.js";
import { CEchoMode } from "../../src/widgets/CLineEdit.js";
import { CSizePolicyType } from "../../src/geometry/CSizePolicy.js";
import { CEasingCurve } from "../../src/animation/CEasingCurve.js";

const toolkitLogo = new Image();

/** Load the shared logo before constructing widgets or painting the splash. */
function loadToolkitLogo(): Promise<void> {
    return new Promise((resolve, reject) => {
        toolkitLogo.onload = () => resolve();
        toolkitLogo.onerror = () => reject(new Error("Cannot load assets/canvas-toolkit.png"));
        toolkitLogo.src = new URL("./assets/canvas-toolkit.png", import.meta.url).href;
    });
}

function createSplashPixmap(): CPixmap {
	const canvas = document.createElement("canvas");
	canvas.width = 560;
	canvas.height = 300;

	const ctx = canvas.getContext("2d");
	if (ctx === null)
		throw new Error("Canvas 2D context is unavailable.");

	const background = ctx.createLinearGradient(0, 0, 560, 300);
	background.addColorStop(0, "#10243a");
	background.addColorStop(1, "#245b78");
	ctx.fillStyle = background;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(toolkitLogo, 36, 43, 96, 96);
    ctx.textBaseline = "middle";

	ctx.textAlign = "left";
	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 36px sans-serif";
	ctx.fillText("Canvas Toolkit", 148, 91);

	ctx.fillStyle = "#b8d6e5";
	ctx.font = "17px sans-serif";
	ctx.fillText("Made with imagination. Built with care.", 40, 168);

	return new CPixmap(canvas, canvas.width, canvas.height);
}

/** Uses the same round PNG as the favicon and splash. */
class ToolkitLogoWidget extends CWidget {
    protected override paintEvent(painter: CPainter): void {
        const size = Math.min(this.width(), this.height());
        painter.drawPixmap(new CPixmap(toolkitLogo, toolkitLogo.naturalWidth, toolkitLogo.naturalHeight),
            (this.width() - size) / 2, (this.height() - size) / 2, size, size);
    }
}

function showAboutCanvasToolkit(parent: CWidget): void {
    const dialog = new CDialog(parent);
    dialog.setGeometry(130, 120, 540, 260);
    dialog.setWindowTitle("About Canvas Toolkit");
    const logo = new ToolkitLogoWidget(dialog); logo.setGeometry(24, 30, 112, 112);
    const title = new CLabel(dialog); title.setGeometry(156, 32, 360, 38);
    const font = title.font(); font.setPixelSize(28); title.setFont(font);
    title.setText("Canvas Toolkit");
    const description = new CLabel(dialog); description.setGeometry(156, 82, 360, 28);
    description.setText("A TypeScript UI toolkit for HTML Canvas.");
    const tagline = new CLabel(dialog); tagline.setGeometry(156, 120, 360, 26);
    tagline.setText("Made with imagination. Built with care.");
    const author = new CLabel(dialog); author.setGeometry(24, 172, 492, 26);
    author.setText("Created by Bojan Kverh");
    const buttons = new CDialogButtonBox(CStandardButton.Ok, dialog);
    buttons.setGeometry(24, 214, 492, 30); buttons.accepted.connect(() => dialog.accept());
    dialog.exec();
}

/** Demo-only surface with rotation, scale and normalized path-position properties. */
class AnimatedToolkitLogoWidget extends CWidget {
    #rotation = 0;
    #scale = 0.25;
    #horizontalStretch = 1;
    #pathPosition = new CPoint();
    #pathVisible = false;
    #surface = document.createElement("canvas");
    #context: CanvasRenderingContext2D;
    #frame: CPixmap;

    constructor(parent: CWidget) {
        super(parent);
        this.#surface.width = 1; this.#surface.height = 1;
        this.setMinimumSize(260, 240);
        this.setSizePolicy(CSizePolicyType.Expanding, CSizePolicyType.Expanding);
        const context = this.#surface.getContext("2d");
        if (context === null) throw new Error("Canvas 2D context is unavailable.");
        this.#context = context;
        this.#frame = new CPixmap(this.#surface, 1, 1);
    }
    override sizeHint(): CSize { return new CSize(720, 360); }
    setRotation(degrees: number): void {
        this.#rotation = degrees; this.update();
    }
    setScale(scale: number): void {
        this.#scale = Math.max(0, Math.min(1, scale)); this.update();
    }
    setHorizontalStretch(stretch: number): void {
        this.#horizontalStretch = Math.max(0.05, Math.min(4, stretch)); this.update();
    }
    /** Normalized path coordinates keep the same route when the surface is resized. */
    setPathPosition(position: CPoint): void {
        this.#pathPosition = new CPoint(position.x(), position.y()); this.update();
    }
    pathPosition(): CPoint { return new CPoint(this.#pathPosition.x(), this.#pathPosition.y()); }
    setPathVisible(visible: boolean): void { this.#pathVisible = visible; this.update(); }
    horizontalStretch(): number { return this.#horizontalStretch; }
    rotation(): number { return this.#rotation; }
    logoScale(): number { return this.#scale; }
    protected override paintEvent(painter: CPainter): void {
        const ctx = this.#context, width = Math.max(1, this.width()), height = Math.max(1, this.height());
        // Keep the backing canvas proportional to the layout's available space.
        // Drawing in logical coordinates preserves a round logo at any aspect ratio.
        const pixelWidth = Math.ceil(width * 2), pixelHeight = Math.ceil(height * 2);
        if (this.#surface.width !== pixelWidth || this.#surface.height !== pixelHeight) {
            this.#surface.width = pixelWidth; this.#surface.height = pixelHeight;
            // The paint engine uses pixmap dimensions as the source crop in pixels.
            this.#frame = new CPixmap(this.#surface, pixelWidth, pixelHeight);
        }
        ctx.setTransform(2, 0, 0, 2, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const background = ctx.createLinearGradient(0, 0, width, height);
        background.addColorStop(0, "#10243a"); background.addColorStop(1, "#245b78");
        ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);

        const maximumSize = Math.min(width, height) * 0.82;
        const size = maximumSize * this.logoScale();
        const imageWidth = size * this.#horizontalStretch;
        // A rotation-independent bounding radius plus glow padding keeps the
        // entire logo inside the surface at every key and during resizing.
        const radius = Math.hypot(imageWidth, size) / 2;
        const travelX = Math.max(0, width / 2 - radius - 24);
        const travelY = Math.max(0, height / 2 - radius - 24);
        if (this.#pathVisible) {
            const vertices = [
                new CPoint(width / 2, height / 2 - travelY),
                new CPoint(width / 2 - travelX, height / 2 + travelY),
                new CPoint(width / 2 + travelX, height / 2 + travelY)
            ];
            ctx.strokeStyle = "rgba(96, 225, 221, 0.3)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(vertices[0]!.x(), vertices[0]!.y());
            ctx.lineTo(vertices[1]!.x(), vertices[1]!.y());
            ctx.lineTo(vertices[2]!.x(), vertices[2]!.y()); ctx.closePath(); ctx.stroke();
            ctx.fillStyle = "rgba(96, 225, 221, 0.65)";
            for (const point of vertices) {
                ctx.beginPath(); ctx.arc(point.x(), point.y(), 3, 0, 2 * Math.PI); ctx.fill();
            }
        } else {
            // A fixed ring makes changes in size easy to see.
            ctx.strokeStyle = "rgba(184, 214, 229, 0.18)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(width / 2, height / 2, maximumSize / 2, 0, 2 * Math.PI); ctx.stroke();
        }
        const centerX = width / 2 + this.#pathPosition.x() * travelX;
        const centerY = height / 2 + this.#pathPosition.y() * travelY;
        ctx.save();
        try {
            ctx.translate(centerX, centerY);
            ctx.rotate(this.#rotation * Math.PI / 180);
            ctx.shadowColor = "rgba(48, 215, 211, 0.35)"; ctx.shadowBlur = 24;
            ctx.drawImage(toolkitLogo, -imageWidth / 2, -size / 2, imageWidth, size);
        } finally { ctx.restore(); }
        painter.drawPixmap(this.#frame, 0, 0, this.width(), this.height());
    }
}

/** Owns its animation explicitly so closing with a button, Esc or X stops the loop. */
class ToolkitLogoAnimationDialog extends CDialog {
    #animation = new CSequentialAnimationGroup();

    constructor(parent: CWidget) {
        super(parent);
        this.setMinimumSize(560, 560);
        this.setGeometry(70, 45, 820, 680);
        this.setWindowTitle("CT logo — Animation demo");
        const layout = new CVBoxLayout();
        layout.setContentsMargins(18, 16, 18, 16); layout.setSpacing(10);
        const fixedHeight = (widget: CWidget, height: number): void => {
            widget.setMinimumSize(0, height);
            widget.setMaximumSize(Number.MAX_SAFE_INTEGER, height);
            widget.setSizePolicy(CSizePolicyType.Expanding, CSizePolicyType.Fixed);
        };
        const title = new CLabel(this); fixedHeight(title, 32);
        const font = title.font(); font.setPixelSize(20); title.setFont(font);
        title.setText("Canvas Toolkit in motion");
        const hint = new CLabel(this); hint.setWordWrap(true);
        hint.setText("Parallel (3 s) → horizontal stretch (0.9 s) → elastic release (0.6 s) → triangle keyframes (3.6 s) → pause (3 s). Changing playback options restarts the sequence.");
        const logo = new AnimatedToolkitLogoWidget(this);
        const progress = new CProgressBar(this); fixedHeight(progress, 20);
        progress.setValue(0);
        const status = new CLabel(this); fixedHeight(status, 44); status.setWordWrap(true);
        layout.addWidget(title); layout.addWidget(hint); layout.addWidget(logo, 1);
        layout.addWidget(progress); layout.addWidget(status);
        const controls = new CWidget(this); fixedHeight(controls, 32);
        const buttons = new CHBoxLayout(); buttons.setContentsMargins(0, 0, 0, 0); buttons.setSpacing(8);
        const rotation = new CVariantAnimation();
        rotation.setStartValue(0); rotation.setEndValue(360); rotation.setDuration(3000);
        const scale = new CVariantAnimation();
        scale.setStartValue(0); scale.setEndValue(1); scale.setDuration(2500);
        const parallel = new CParallelAnimationGroup();
        parallel.addAnimation(rotation); parallel.addAnimation(scale);
        const stretch = new CVariantAnimation();
        stretch.setStartValue(1); stretch.setEndValue(2.6); stretch.setDuration(900);
        stretch.setEasingCurve(CEasingCurveType.OutCubic);
        const elastic = new CVariantAnimation();
        elastic.setStartValue(2.6); elastic.setEndValue(1); elastic.setDuration(600);
        const elasticCurve = new CEasingCurve(CEasingCurveType.OutElastic);
        elasticCurve.setOscillations(15);
        elasticCurve.setDamping(6);
        elastic.setEasingCurve(elasticCurve);
        // One typed property animation travels through all the point keys.
        const path = new CPropertyAnimation<CPoint>(point => logo.setPathPosition(point));
        path.setStartValue(new CPoint(0, 0));
        path.setKeyValueAt(0.15, new CPoint(0, -1));
        path.setKeyValueAt(0.40, new CPoint(-1, 1));
        path.setKeyValueAt(0.65, new CPoint(1, 1));
        path.setKeyValueAt(0.90, new CPoint(0, -1));
        path.setEndValue(new CPoint(0, 0));
        path.setDuration(3600); path.setEasingCurve(CEasingCurveType.Linear);
		this.#animation.addAnimation(parallel);
        this.#animation.addAnimation(stretch);
        this.#animation.addAnimation(elastic);
        this.#animation.addAnimation(path);
		this.#animation.addAnimation(new CPauseAnimation(3000));
        // The containing group repeats; its member animations remain finite.
        this.#animation.setLoopCount(-1);
        let stage = "Parallel";
        const updateStatus = (): void => {
            const animation = this.#animation;
            progress.setValue(Math.round(animation.currentLoopTime() / animation.duration() * 100));
            const direction = animation.currentDirection() === CAnimationDirection.Forward ? "Forward" : "Backward";
            const total = animation.loopCount() < 0 ? "∞" : String(animation.loopCount());
            const position = logo.pathPosition();
            const detail = stage === "Triangle"
                ? `Position: (${position.x().toFixed(2)}, ${position.y().toFixed(2)})`
                : `Rotation: ${Math.round(logo.rotation())}° | Scale: ${Math.round(logo.logoScale() * 100)}% | Width: ${Math.round(logo.horizontalStretch() * 100)}%`;
            status.setText(`${stage} | Loop: ${animation.currentLoop() + 1}/${total} | ${direction} | ${detail}`);
        };
        rotation.valueChanged.connect(degrees => { logo.setRotation(degrees); updateStatus(); });
        scale.valueChanged.connect(phase => {
            logo.setScale(0.25 + 0.75 * (1 - Math.cos(phase * 2 * Math.PI)) / 2);
            updateStatus();
        });
        stretch.valueChanged.connect(value => { logo.setHorizontalStretch(value); updateStatus(); });
        elastic.valueChanged.connect(width => {
            logo.setHorizontalStretch(width);
            updateStatus();
        });
        this.#animation.currentAnimationChanged.connect(animation => {
            stage = animation instanceof CPauseAnimation ? "Pause" : animation === path ? "Triangle" : animation === stretch ? "Stretch X" : animation === elastic ? "Elastic" : "Parallel";
            logo.setPathVisible(animation === path);
            if (animation !== path) logo.setPathPosition(new CPoint());
            if (animation === parallel) logo.setHorizontalStretch(1);
            updateStatus();
        });
        this.#animation.currentLoopChanged.connect(updateStatus);
        this.#animation.currentTimeChanged.connect(updateStatus);
        this.#animation.finished.connect(updateStatus);
        updateStatus();

        const restartPlayback = (): void => {
            this.#animation.stop();
            logo.setRotation(this.#animation.direction() === CAnimationDirection.Backward ? 360 : 0);
            logo.setScale(0.25); logo.setHorizontalStretch(1); logo.setPathPosition(new CPoint());
            this.#animation.start();
            updateStatus();
        };
        const options = new CWidget(this); fixedHeight(options, 32);
        const optionLayout = new CHBoxLayout();
        optionLayout.setContentsMargins(0, 0, 0, 0); optionLayout.setSpacing(8);
        const direction = new CPushButton(options); direction.setFixedSize(160, 32); direction.setText("Direction: Forward");
        direction.clicked.connect(() => {
            this.#animation.stop();
            const backward = this.#animation.direction() === CAnimationDirection.Forward;
            this.#animation.setDirection(backward ? CAnimationDirection.Backward : CAnimationDirection.Forward);
            direction.setText(backward ? "Direction: Backward" : "Direction: Forward");
            restartPlayback();
        });
        const alternating = new CPushButton(options); alternating.setFixedSize(160, 32); alternating.setText("Auto reverse: Off");
        alternating.clicked.connect(() => {
            this.#animation.stop();
            this.#animation.setAutoReverse(!this.#animation.autoReverse());
            alternating.setText(this.#animation.autoReverse() ? "Auto reverse: On" : "Auto reverse: Off");
            restartPlayback();
        });
        const repeat = new CPushButton(options); repeat.setFixedSize(160, 32); repeat.setText("Repeat: Forever");
        repeat.clicked.connect(() => {
            this.#animation.stop();
            const count = this.#animation.loopCount() === -1 ? 1 : this.#animation.loopCount() === 1 ? 3 : -1;
            this.#animation.setLoopCount(count);
            repeat.setText(count === -1 ? "Repeat: Forever" : count === 1 ? "Repeat: Once" : "Repeat: 3 legs");
            restartPlayback();
        });
        optionLayout.addWidget(direction); optionLayout.addWidget(alternating); optionLayout.addWidget(repeat); optionLayout.addStretch(1);
        options.setLayout(optionLayout); layout.addWidget(options);

        const pause = new CPushButton(controls); pause.setFixedSize(110, 32); pause.setText("Pause");
        pause.clicked.connect(() => {
            if (this.#animation.state() === CAnimationState.Running) this.#animation.pause();
            else if (this.#animation.state() === CAnimationState.Paused) this.#animation.resume();
            else restartPlayback();
        });
        this.#animation.stateChanged.connect(state => pause.setText(
            state === CAnimationState.Paused ? "Resume" : state === CAnimationState.Running ? "Pause" : "Play"));
        const restart = new CPushButton(controls); restart.setFixedSize(110, 32); restart.setText("Restart");
        restart.clicked.connect(restartPlayback);
        const close = new CPushButton(controls); close.setFixedSize(110, 32); close.setText("Close");
        close.clicked.connect(() => this.accept());
        buttons.addWidget(pause); buttons.addWidget(restart); buttons.addStretch(1); buttons.addWidget(close);
        controls.setLayout(buttons); layout.addWidget(controls);
        this.setLayout(layout);
    }
    play(): void {
        if (this.isOpen() && this.isVisible()) this.#animation.start();
    }
    override close(): void { this.#animation.stop(); super.close(); }
    override destroy(): void { this.#animation.destroy(); super.destroy(); }
}

function showLogoAnimationDemo(parent: CWidget): void {
    const dialog = new ToolkitLogoAnimationDialog(parent);
    dialog.exec(); dialog.play();
}

class RedWidget extends CWidget {
	#m_color: string = "#ffa0a0";
    protected override paintEvent(painter: CPainter): void {
        painter.setFillStyle(this.#m_color);
        painter.fillRect(
            new CRect(0, 0, this.width(), this.height())
        );
    }

	setColor(color: string): void {
		if (color !== this.#m_color) {
			this.#m_color = color;
			this.update();
		}
	}

	color(): string {
		return this.#m_color;
	}
}

class GreenWidget extends CWidget {
	#m_color: string = "#00a000";
    protected override paintEvent(painter: CPainter): void {
        painter.setFillStyle(this.#m_color);
        painter.fillRect(
            new CRect(0, 0, this.width(), this.height())
        );
    }

	setColor(color: string): void {
		if (color !== this.#m_color) {
			this.#m_color = color;
			this.update();
		}
	}

	color(): string {
		return this.#m_color;
	}
}


class BlueWidget extends CWidget {
	#m_color = "blue";

	protected override paintEvent(painter: CPainter): void {
		painter.setFillStyle(this.#m_color);
		painter.fillRect(new CRect(0, 0, this.width(), this.height()));
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_color = this.#m_color === "blue" ? "green" : "blue";

		event.accept();
		this.update();
	}
}

class ScrollContentWidget extends CWidget {
	protected override paintEvent(painter: CPainter): void {
		painter.setFillStyle("#ffffff");
		painter.fillRect(new CRect(0, 0, this.width(), this.height()));

		painter.setStrokeStyle("#d0d0d0");
		painter.setFillStyle("#202020");
		painter.setFont(new CFont("sans-serif", 14));

		for (let x = 0; x <= this.width(); x += 100) {
			painter.drawLine(x, 0, x, this.height());
			painter.drawText(`${x}`, x + 4, 18);
		}

		for (let y = 0; y <= this.height(); y += 100) {
			painter.drawLine(0, y, this.width(), y);
			painter.drawText(`${y}`, 4, y + 18);
		}

		painter.setFillStyle("#f0f0f0");
		painter.fillRect(new CRect(120, 100, 220, 120));

		painter.setFillStyle("#202020");
		painter.drawText("Top-left area", 140, 140);

		painter.setFillStyle("#f0f0f0");
		painter.fillRect(new CRect(700, 500, 220, 120));

		painter.setFillStyle("#202020");
		painter.drawText("Bottom-right area", 720, 540);
	}
}

class CStringListModel extends CAbstractListModel {
	#m_items: string[];

	constructor(items: string[]) {
		super();
		this.#m_items = items;
	}

	override rowCount(_parent = new CModelIndex()): number {
		return this.#m_items.length;
	}

	override data(index: CModelIndex): unknown {
		if (!index.isValid())
			return null;

		return this.#m_items[index.row()] ?? null;
	}
}

class DemoTableModel extends CAbstractTableModel {
	#m_rows: unknown[][] = [
		["Alice", "Slovenia", "30", "Ljubljana", "Accountant", new Date("2026-01-01"), false],
		["Bob", "Austria", "42", "Vienna", "Designer", new Date("2025-01-01"), true],
		["Carol", "Italy", "35", "Milan", "Manager", new Date("2025-02-01"), true],
		["David", "Germany", "51", "Munich", "Engineer", new Date("2024-11-01"), true],
		["Emma", "France", "28", "Paris", "Developer", new Date("2026-01-01"), true],
		["Frank", "Croatia", "44", "Zagreb", "Architect", new Date("2024-01-01"), false],
		["Grace", "Hungary", "37", "Budapest", "Analyst", new Date("2023-09-01"), false],
		["Henry", "Czechia", "48", "Prague", "Manager", new Date("2026-03-01"), true],
		["Isabella", "Spain", "32", "Madrid", "Designer", new Date("2022-07-01"), true],
		["Jack", "Portugal", "39", "Lisbon", "Developer", new Date("2021-01-01"), true],
		["Klara", "Slovenia", "27", "Maribor", "Engineer", new Date("2021-01-01"), true],
		["Lukas", "Austria", "46", "Graz", "Manager", new Date("2021-03-01"), true],
		["Maria", "Italy", "41", "Rome", "Architect", new Date("2021-05-01"), true],
		["Nina", "Germany", "34", "Berlin", "Developer", new Date("2022-07-01"), true],
		["Oliver", "France", "53", "Lyon", "Analyst", new Date("2024-04-01"), false],
		["Peter", "Croatia", "38", "Split", "Engineer", new Date("2023-09-01"), true],
		["Sara", "Hungary", "29", "Szeged", "Designer", new Date("2025-06-01"), true],
		["Thomas", "Czechia", "45", "Brno", "Manager", new Date("2023-03-25"), true],
		["Eva", "Spain", "36", "Barcelona", "Developer", new Date("2024-04-01"), true],
		["William", "Portugal", "50", "Porto", "Architect", new Date("2021-10-01"), true]
	];

	override rowCount(_parent = new CModelIndex()): number {
		return this.#m_rows.length;
	}

	override columnCount(_parent = new CModelIndex()): number {
		return this.#m_rows[0]?.length ?? 0;
	}

	override isEditable(_index: CModelIndex): boolean {
    	return true;
	}

	override setItemData(index: CModelIndex, value: unknown): boolean {
		if (!index.isValid())
			return false;

		const row = this.#m_rows[index.row()];

		if (row === undefined)
			return false;

		row[index.column()] = value;
		this.emitDataChanged(index, index);

		return true;
	}

	override data(index: CModelIndex): unknown {
		if (!index.isValid())
			return null;

		return this.#m_rows[index.row()]?.[index.column()] ?? null;
	}

	override headerData(
		section: number,
		orientation: COrientation
	): string | number | null {
		if (orientation === COrientation.Horizontal) {
			return [
				"Name",
				"Country",
				"Age",
				"City",
				"Occupation",
				"Start date",
				"Still here?"
			][section] ?? null;
		}

		return section + 1;
	}

	override sort(column: number, order: CSortOrder = CSortOrder.AscendingOrder): void {
    	const direction = order === CSortOrder.AscendingOrder ? 1 : -1;
    	this.#m_rows.sort((left, right) => {
			const a = left[column];
        	const b = right[column];

        	if (typeof a === "number" && typeof b === "number")
            	return (a - b) * direction;

        	if (a instanceof Date && b instanceof Date)
            	return (a.getTime() - b.getTime()) * direction;

        	return String(a).localeCompare(String(b)) * direction;
    	});

    	this.resetModel();
	}
}

class ContextMenuWidget extends CWidget {
	#m_menu = new CMenu();

	constructor() {
		super();

		const action1 = new CAction("Copy");
		const action2 = new CAction("Paste");
		const action3 = new CAction("Delete");

		action1.triggered.connect(() => {
			console.log("Copy");
		});

		action2.triggered.connect(() => {
			console.log("Paste");
		});

		action3.triggered.connect(() => {
			console.log("Delete");
		});

		this.#m_menu.addAction(action1);
		this.#m_menu.addAction(action2);
		this.#m_menu.addSeparator();
		this.#m_menu.addAction(action3);
	}

	protected override contextMenuEvent(
		event: CContextMenuEvent): void {
		this.#m_menu.exec(event.globalPos());
		event.accept();
	}

	protected override paintEvent(painter: CPainter): void {
		painter.drawText("Right click me", 10, 25);
	}
}

type TreeNode = {
	values: string[];
	parent: TreeNode | null;
	children: TreeNode[];
};

function node(values: string[], children: TreeNode[] = []): TreeNode {
	const result: TreeNode = {
		values,
		parent: null,
		children
	};

	for (const child of children)
		child.parent = result;

	return result;
}

class DemoTreeModel extends CAbstractItemModel {
	#m_root: TreeNode;

	constructor(root: TreeNode) {
		super();

		this.#m_root = root;
		this.#setParents(this.#m_root, null);
	}

	override rowCount(parent = new CModelIndex()): number {
		return this.#nodeForParent(parent).children.length;
	}

	override columnCount(_parent = new CModelIndex()): number {
		return 3;
	}

	override data(index: CModelIndex): unknown {
		if (!index.isValid())
			return null;

		const treeNode = index.data() as TreeNode;

		return treeNode.values[index.column()] ?? null;
	}

	override index(row: number, column: number,
		parent = new CModelIndex()): CModelIndex {
		if (row < 0 || column < 0 || column >= this.columnCount(parent))
			return new CModelIndex();

		const parentNode = this.#nodeForParent(parent);
		const child = parentNode.children[row];

		if (child === undefined)
			return new CModelIndex();

		return this.createIndex(row, column, child);
	}

	override parentIndex(index: CModelIndex): CModelIndex {
		if (!index.isValid())
			return new CModelIndex();

		const treeNode = index.data() as TreeNode;
		const parent = treeNode.parent;

		if (parent === null || parent === this.#m_root)
			return new CModelIndex();

		const grandParent = parent.parent;

		if (grandParent === null)
			return new CModelIndex();

		const row = grandParent.children.indexOf(parent);

		if (row < 0)
			return new CModelIndex();

		return this.createIndex(row, 0, parent);
	}

	override headerData(section: number,
		orientation: COrientation): string | number | null {
		if (orientation === COrientation.Horizontal)
			return ["Name", "Type", "Size"][section] ?? null;

		return section + 1;
	}

	#nodeForParent(index: CModelIndex): TreeNode {
		if (!index.isValid())
			return this.#m_root;

		return index.data() as TreeNode;
	}

	#setParents(treeNode: TreeNode, parent: TreeNode | null): void {
		treeNode.parent = parent;

		for (const child of treeNode.children)
			this.#setParents(child, treeNode);
	}
}

class DragSourceWidget extends CWidget {
	#m_dragging = false;
	#m_inProgress = false;

	override cursor(): CCursorShape {
		return this.#m_inProgress === true? CCursorShape.Grabbing : 
			CCursorShape.Grab;
	}

	protected override paintEvent(painter: CPainter): void {
		painter.setFillStyle("#4080e0");
		painter.fillRect(new CRect(0, 0, this.width(), this.height()));

		painter.setFillStyle("#ffffff");
		painter.drawText("Drag me", 20, 35);
	}

	protected override mouseEnterEvent(event: CMouseEvent): void {
		this.#m_inProgress = false;
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		this.#m_dragging = true;
		this.#m_inProgress = true;
		event.accept();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void {
		if (!this.#m_dragging) {
			event.ignore();
			return;
		}

		this.#m_dragging = false;

		const mimeData = new CMimeData();
		mimeData.setText("Hello from CDrag!");

		const drag = new CDrag(this);
		drag.setMimeData(mimeData);
		drag.exec(CDropAction.CopyAction);

		CApplication.instance().startDrag(drag);

		event.accept();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void {
		this.#m_dragging = false;
		this.#m_inProgress = false;
		event.accept();
	}
}

class DropTargetWidget extends CWidget {
	#m_dragOver = false;
	#m_text = "Drop here";

	constructor(parent: CWidget) {
		super(parent);
		this.setAcceptDrops(true);
	}

	protected override paintEvent(painter: CPainter): void {
		painter.setFillStyle(this.#m_dragOver ? "#80d080" : "#50a050");
		painter.fillRect(new CRect(0, 0, this.width(), this.height()));

		painter.setFillStyle("#ffffff");
		painter.drawText(this.#m_text, 15, 35);
	}

	protected override dragEnterEvent(event: CDragEnterEvent): void {
		if (!event.mimeData().hasText()) {
			event.ignore();
			return;
		}

		this.#m_dragOver = true;
		this.update();
		event.acceptProposedAction();
	}

	protected override dragMoveEvent(event: CDragMoveEvent): void {
		event.acceptProposedAction();
	}

	protected override dragLeaveEvent(event: CDragLeaveEvent): void {
		this.#m_dragOver = false;
		this.update();
		event.accept();
	}

	protected override dropEvent(event: CDropEvent): void {
		this.#m_dragOver = false;
		this.#m_text = event.mimeData().text();
		this.update();

		event.acceptProposedAction();
	}
}

const sqlCountries = [
	"Slovenia", "Austria", "Italy", "Germany", "France", "Croatia",
	"Hungary", "Czechia", "Spain", "Portugal"
];

const sqlOccupations = [
	"Developer", "Designer", "Manager", "Engineer", "Architect", "Analyst"
];

function createSqlEmployees(): Array<Record<string, unknown>> {
	const names = [
		"Alice", "Bob", "Carol", "David", "Emma", "Frank", "Grace", "Henry",
		"Isabella", "Jack", "Klara", "Lukas", "Maria", "Nina", "Oliver",
		"Peter", "Sara", "Thomas", "Eva", "William"
	];

	return Array.from({ length: 200 }, (_, index) => ({
		id: index + 1,
		name: `${names[index % names.length]} ${Math.floor(index / names.length) + 1}`,
		country_id: index % sqlCountries.length + 1,
		age: 21 + (index * 7) % 45,
		occupation: sqlOccupations[index % sqlOccupations.length],
		start_date: new Date(2021 + index % 6, index % 12, index % 28 + 1),
		start_time: new Date(1970, 0, 1, 7 + index % 10, index % 4 * 15, 0),
		last_login: new Date(2026, index % 12, index % 28 + 1,
			8 + index % 9, index % 6 * 10, 0),
		active: index % 4 !== 0
	}));
}

function createSqlCountries(): Array<Record<string, unknown>> {
	return sqlCountries.map((name, index) => ({ id: index + 1, name }));
}

type DemoListIconKind = "folder" | "document" | "image" | "sheet";

/** Generates local demo artwork so the icon view needs no extra image files. */
function createListDemoIcon(kind: DemoListIconKind): CIcon {
    const surface = document.createElement("canvas");
    surface.width = 64;
    surface.height = 64;
    const context = surface.getContext("2d");
    if (context === null)
        throw new Error("Cannot create icon demo canvas.");

    if (kind === "folder") {
        context.fillStyle = "#d99a20";
        context.beginPath();
        context.moveTo(5, 14); context.lineTo(26, 14); context.lineTo(32, 21);
        context.lineTo(59, 21); context.lineTo(59, 53); context.lineTo(5, 53);
        context.closePath(); context.fill();
        context.fillStyle = "#ffd366";
        context.fillRect(5, 25, 54, 28);
        context.strokeStyle = "#bd8618";
        context.lineWidth = 2;
        context.strokeRect(5, 25, 54, 28);
    } else {
        context.fillStyle = "#d5dde5";
        context.fillRect(12, 6, 43, 54);
        context.fillStyle = "#ffffff";
        context.fillRect(9, 3, 43, 54);
        context.strokeStyle = "#8797a6";
        context.lineWidth = 2;
        context.strokeRect(9, 3, 43, 54);
        if (kind === "image") {
            context.fillStyle = "#b6e4ff";
            context.fillRect(15, 12, 31, 31);
            context.fillStyle = "#ffcc4d";
            context.beginPath(); context.arc(37, 20, 5, 0, 2 * Math.PI); context.fill();
            context.fillStyle = "#4c9b6b";
            context.beginPath(); context.moveTo(15, 43); context.lineTo(27, 25);
            context.lineTo(37, 38); context.lineTo(42, 32); context.lineTo(46, 43);
            context.closePath(); context.fill();
        } else if (kind === "sheet") {
            context.fillStyle = "#249664";
            context.fillRect(9, 3, 43, 12);
            context.strokeStyle = "#c0d6c8";
            context.lineWidth = 1;
            for (let x = 16; x <= 44; x += 9) {
                context.beginPath(); context.moveTo(x, 21); context.lineTo(x, 49); context.stroke();
            }
            for (let y = 21; y <= 49; y += 7) {
                context.beginPath(); context.moveTo(16, y); context.lineTo(44, y); context.stroke();
            }
        } else {
            context.fillStyle = "#d95757";
            context.fillRect(9, 3, 43, 12);
            context.fillStyle = "#a8b4c0";
            for (let y = 23; y <= 44; y += 7)
                context.fillRect(17, y, y === 44 ? 18 : 27, 3);
        }
    }
    return new CIcon(new CPixmap(surface, 64, 64));
}

/** A locally drawn image with transparent margins for testing the checkerboard. */
function createImageViewDemoPixmap(): CPixmap {
    const canvas = document.createElement("canvas");
    canvas.width = 1400; canvas.height = 900;
    const ctx = canvas.getContext("2d");
    if (ctx === null) throw new Error("Canvas 2D context is unavailable.");

    const sky = ctx.createLinearGradient(0, 60, 0, 780);
    sky.addColorStop(0, "#163b68"); sky.addColorStop(0.65, "#68c9d3"); sky.addColorStop(1, "#d5f0e8");
    ctx.fillStyle = sky;
    ctx.fillRect(70, 60, 1260, 720);
    ctx.fillStyle = "#ffe6a0";
    ctx.beginPath(); ctx.arc(1090, 235, 85, 0, Math.PI * 2); ctx.fill();

    const mountain = (points: number[][], color: string): void => {
        ctx.fillStyle = color; ctx.beginPath();
        points.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point[0]!, point[1]!);
            else ctx.lineTo(point[0]!, point[1]!);
        });
        ctx.closePath(); ctx.fill();
    };
    mountain([[70, 590], [310, 260], [570, 600], [800, 310], [1100, 640], [1330, 430], [1330, 780], [70, 780]], "#4d7e9b");
    mountain([[70, 740], [460, 355], [840, 780]], "#28556b");
    mountain([[350, 464], [460, 355], [570, 466], [502, 441], [464, 478], [429, 430]], "#eff9f5");
    mountain([[650, 780], [1030, 420], [1330, 720], [1330, 780]], "#216b70");
    mountain([[951, 495], [1030, 420], [1113, 503], [1052, 478], [1028, 503], [1003, 466]], "#d8f3ee");

    const water = ctx.createLinearGradient(0, 630, 0, 780);
    water.addColorStop(0, "#399b9f"); water.addColorStop(1, "#133e5a");
    ctx.fillStyle = water; ctx.fillRect(70, 685, 1260, 95);
    ctx.strokeStyle = "#8dddd5"; ctx.lineWidth = 3;
    for (let y = 706; y < 775; y += 17) {
        ctx.beginPath(); ctx.moveTo(600 - (y - 700) * 2, y); ctx.lineTo(960 + (y - 700), y); ctx.stroke();
    }
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 54px sans-serif";
    ctx.fillText("A little room to explore", 125, 158);
    ctx.font = "24px sans-serif"; ctx.fillStyle = "#d2eff3";
    ctx.fillText("CANVAS TOOLKIT  /  IMAGE VIEW", 128, 205);
    ctx.fillStyle = "#277d92"; ctx.font = "22px sans-serif";
    ctx.fillText("1400 × 900 px • transparent margins • zoom in to inspect the details", 70, 842);
    return new CPixmap(canvas, canvas.width, canvas.height);
}

function showImageViewDemo(parent: CWidget): void {
    const dialog = new CDialog(parent);
    dialog.setGeometry(60, 45, 780, 590);
    dialog.setWindowTitle("Image viewer — CImageView");

    const imageView = new CImageView(dialog);
    imageView.setGeometry(16, 58, 748, 414);
    const status = new CLabel(dialog); status.setGeometry(16, 480, 748, 24);
    const updateStatus = (): void => {
        const image = imageView.pixmap();
        status.setText(`${image?.width() ?? 0} × ${image?.height() ?? 0} px  |  Zoom: ${(imageView.zoomFactor() * 100).toFixed(1)} %`);
    };
    imageView.zoomChanged.connect(updateStatus);

    const button = (text: string, x: number, width: number, callback: () => void): void => {
        const control = new CPushButton(dialog); control.setGeometry(x, 16, width, 28); control.setText(text);
        control.clicked.connect(() => { callback(); updateStatus(); imageView.setFocus(); });
    };
    button("−", 16, 34, () => imageView.zoomOut());
    button("+", 56, 34, () => imageView.zoomIn());
    button("100 %", 98, 72, () => imageView.actualSize());
    button("Fit to window", 178, 118, () => imageView.fitToWindow());
    const checker = new CCheckBox(dialog); checker.setGeometry(308, 16, 140, 28);
    checker.setText("Checkerboard"); checker.setChecked(true);
    checker.toggled.connect(checked => imageView.setCheckerboardVisible(checked));
    const source = new CComboBox(dialog); source.setGeometry(464, 16, 300, 28);
    source.addItems(["Landscape (transparent margins)", "Canvas Toolkit splash"]);
    const landscape = createImageViewDemoPixmap(), splash = createSplashPixmap();
    source.currentIndexChanged.connect(index => {
        imageView.setPixmap(index === 0 ? landscape : splash); updateStatus();
    });
    imageView.setPixmap(landscape); updateStatus();

    const hint = new CLabel(dialog); hint.setGeometry(16, 508, 748, 22);
    hint.setText("Wheel: zoom at pointer • Drag: pan • Double-click: fit / 100 % • Keys: + − 0 F and arrows");
    const buttons = new CDialogButtonBox(CStandardButton.Ok, dialog);
    buttons.setGeometry(16, 544, 748, 30); buttons.accepted.connect(() => dialog.accept());
    dialog.exec(); imageView.setFocus();
}

function showIconGridDemo(parent: CWidget): void {
    const dialog = new CDialog(parent);
    dialog.setGeometry(70, 60, 760, 570);
    dialog.setWindowTitle("Icon grid — CListWidget");

    const intro = new CLabel(dialog);
    intro.setGeometry(16, 12, 720, 26);
    intro.setText("Double-click an item or press Enter to activate it. Arrow keys navigate.");

    const modeLabel = new CLabel(dialog);
    modeLabel.setGeometry(16, 48, 46, 28); modeLabel.setText("View:");
    const mode = new CComboBox(dialog);
    mode.setGeometry(64, 48, 138, 28);
    mode.addItems(["Large icons", "List"]);

    const sizeLabel = new CLabel(dialog);
    sizeLabel.setGeometry(222, 48, 62, 28); sizeLabel.setText("Icon size:");
    const iconSize = new CSpinBox(dialog);
    iconSize.setGeometry(286, 48, 78, 28);
    iconSize.setRange(24, 80); iconSize.setValue(48);

    const widthLabel = new CLabel(dialog);
    widthLabel.setGeometry(384, 48, 90, 28); widthLabel.setText("View width:");
    const viewWidth = new CSpinBox(dialog);
    viewWidth.setGeometry(476, 48, 90, 28);
    viewWidth.setRange(240, 700); viewWidth.setValue(700);

    const multiSelect = new CCheckBox(dialog);
    multiSelect.setGeometry(592, 48, 144, 28); multiSelect.setText("Multi-select");

    const list = new CListWidget(dialog);
    list.setGeometry(16, 92, 700, 360);
    list.setViewMode(CListViewMode.IconMode);
    list.setIconSize(new CSize(48, 48));
    list.setGridSize(new CSize(112, 112));
    list.setSpacing(8);

    const icons: Record<DemoListIconKind, CIcon> = {
        folder: createListDemoIcon("folder"), document: createListDemoIcon("document"),
        image: createListDemoIcon("image"), sheet: createListDemoIcon("sheet")
    };
    const entries: Array<{ name: string; kind: DemoListIconKind; enabled?: boolean }> = [
        { name: "Documents", kind: "folder" },
        { name: "Pictures", kind: "folder" },
        { name: "Reports", kind: "folder" },
        { name: "Invoices", kind: "folder" },
        { name: "Partners", kind: "folder" },
        { name: "Archive (disabled)", kind: "folder", enabled: false },
        { name: "Invoice 2026-001.pdf", kind: "document" },
        { name: "Invoice 2026-002.pdf", kind: "document" },
        { name: "Annual report 2026 and supporting documents.pdf", kind: "document" },
        { name: "Price list.xlsx", kind: "sheet" },
        { name: "Payments November.xlsx", kind: "sheet" },
        { name: "Company logo.png", kind: "image" },
        { name: "Office photo.jpg", kind: "image" },
        { name: "Contract - Example partner.pdf", kind: "document" },
        { name: "Balance sheet.xlsx", kind: "sheet" },
        { name: "Cash flow.xlsx", kind: "sheet" },
        { name: "Product photo 01.jpg", kind: "image" },
        { name: "Product photo 02.jpg", kind: "image" },
        { name: "Meeting notes.pdf", kind: "document" },
        { name: "Receipts", kind: "folder" },
        { name: "VAT report.xlsx", kind: "sheet" },
        { name: "Inventory.xlsx", kind: "sheet" },
        { name: "Presentation cover.png", kind: "image" },
        { name: "Read me first.pdf", kind: "document" }
    ];
    for (const entry of entries) {
        const item = new CListWidgetItem(entry.name, icons[entry.kind]);
        item.setEnabled(entry.enabled !== false);
        list.addItem(item);
    }

    const status = new CLabel(dialog);
    status.setGeometry(16, 462, 720, 26);
    const showSelection = () => status.setText(
        `${list.selectedItems().length} selected — ${list.currentItem()?.text() ?? "No current item"}`);
    list.currentRowChanged.connect(showSelection);
    list.itemSelectionChanged.connect(showSelection);
    list.itemActivated.connect(item => status.setText(`Activated: ${item.text()}`));
    showSelection();

    const hint = new CLabel(dialog);
    hint.setGeometry(16, 490, 720, 22);
    hint.setText("Change View width to see reflow. The grey Archive item is disabled. No files are opened.");

    mode.currentIndexChanged.connect(index => {
        list.setViewMode(index === 0 ? CListViewMode.IconMode : CListViewMode.ListMode);
    });
    iconSize.valueChanged.connect(size => {
        list.setIconSize(new CSize(size, size));
        list.setGridSize(new CSize(size + 64, size + 64));
    });
    viewWidth.valueChanged.connect(width => list.setGeometry(16, 92, width, 360));
    multiSelect.toggled.connect(enabled => list.setSelectionMode(enabled
        ? CSelectionMode.MultiSelection : CSelectionMode.SingleSelection));

    const buttons = new CDialogButtonBox(CStandardButton.Ok, dialog);
    buttons.setGeometry(16, 526, 720, 30);
    buttons.accepted.connect(() => dialog.accept());
    dialog.exec();
    list.widget()?.setFocus();
}


function showSplitButtonDemo(parent: CWidget): void {
    const dialog = new CDialog(parent);
    dialog.setWindowTitle("Split button demo");
    dialog.setGeometry(0, 0, 580, 260);
    const layout = new CVBoxLayout();
    layout.setContentsMargins(16, 16, 16, 16); layout.setSpacing(10);
    const hint = new CLabel(dialog);
    hint.setText("Click New invoice, or use the arrow to choose a document type. Down / F4 opens the menu.");
    hint.setWordWrap(true);
    layout.addWidget(hint);
    const button = new CSplitButton(dialog);
    const menu = new CMenu();
    const result = new CLabel(dialog);
    result.setText("No document created yet.");
    const actions = ["New invoice", "New quotation", "New credit note"].map(text => {
        const action = new CAction(text);
        action.triggered.connect(() => result.setText(`${text}: document created.`));
        menu.addAction(action);
        return action;
    });
    button.setDefaultAction(actions[0]!);
    button.setMenu(menu);
    layout.addWidget(button);
    layout.addWidget(result);
    const enabled = new CCheckBox(dialog);
    enabled.setText("Enable split button"); enabled.setChecked(true);
    enabled.toggled.connect(value => actions[0]!.setEnabled(value));
    layout.addWidget(enabled);
    const close = new CPushButton(dialog); close.setText("Close");
    close.clicked.connect(() => dialog.reject()); layout.addWidget(close);
    dialog.setLayout(layout);
    // The popup and actions are borrowed by the button, so the demo releases them.
    const cleanup = (): void => {
        button.setMenu(null); button.setDefaultAction(null);
        menu.destroy();
        for (const action of actions) action.destroy();
    };
    dialog.rejected.connect(cleanup);
    dialog.open(); button.setFocus();
}

function showWizardDemo(parent: CWidget): void {
    const wizard = new CWizardDialog(parent);
    wizard.setGeometry(90, 65, 820, 470);
    wizard.setWindowTitle("Company setup — Wizard demo");

    const company = new CWizardPage();
    company.setTitle("Company details");
    company.setSubTitle("Enter a company name, or use Skip for now to return to this step later.");
    company.setDeferrable(true); company.setComplete(false);
    const companyLabel = new CLabel(company); companyLabel.setGeometry(0, 16, 140, 28);
    companyLabel.setText("Company name:");
    const companyName = new CLineEdit(company); companyName.setGeometry(152, 16, 430, 28);
    companyLabel.setBuddy(companyName);
    const companyHint = new CLabel(company); companyHint.setGeometry(0, 64, 600, 56);
    companyHint.setWordWrap(true);
    companyHint.setText("Try skipping this page while the name is empty. Your text is retained when you go Back or return to a deferred step.");
    companyName.textChanged.connect(() => company.setComplete(companyName.text().trim().length > 0));
    wizard.addPage(company);

    const contact = new CWizardPage();
    contact.setTitle("Contact details");
    contact.setSubTitle("Enter an email containing @, or defer this step with Skip for now.");
    contact.setDeferrable(true); contact.setComplete(false);
    const emailLabel = new CLabel(contact); emailLabel.setGeometry(0, 16, 140, 28); emailLabel.setText("Email:");
    const email = new CLineEdit(contact); email.setGeometry(152, 16, 430, 28); emailLabel.setBuddy(email);
    const emailHint = new CLabel(contact); emailHint.setGeometry(0, 64, 600, 28);
    emailHint.setText("For this demo you can enter demo@example.com.");
    email.textChanged.connect(() => contact.setComplete(email.text().trim().includes("@")));
    wizard.addPage(contact);

    const preferences = new CWizardPage();
    preferences.setTitle("Preferences"); preferences.setSubTitle("Choose demo preferences, then continue to the review.");
    const currencyLabel = new CLabel(preferences); currencyLabel.setGeometry(0, 16, 140, 28); currencyLabel.setText("Currency:");
    const currency = new CComboBox(preferences); currency.setGeometry(152, 16, 230, 28);
    currency.addItems(["EUR", "USD", "GBP"]); currencyLabel.setBuddy(currency);
    const notifications = new CCheckBox(preferences); notifications.setGeometry(0, 66, 450, 28);
    notifications.setText("Enable notifications"); notifications.setChecked(true);
    wizard.addPage(preferences);

    const review = new CWizardPage(); review.setTitle("Review");
    review.setSubTitle("Deferred steps must still be completed before Finish becomes available.");
    const summary = new CLabel(review); summary.setGeometry(0, 8, 620, 190);
    summary.setAlignment(CAlignment.Left | CAlignment.Top); summary.setWordWrap(true);
    wizard.addPage(review);
    const refreshSummary = (): void => {
        const deferred = wizard.deferredPageIds().map(id => wizard.page(id)?.title() ?? String(id));
        summary.setText([
            `Company: ${companyName.text().trim() || "(not entered yet)"}`,
            `Email: ${email.text().trim() || "(not entered yet)"}`,
            `Currency: ${currency.currentText()}`,
            `Notifications: ${notifications.isChecked() ? "enabled" : "disabled"}`,
            "",
            deferred.length > 0 ? `Deferred steps: ${deferred.join(", ")}. Press Next to return to them.` : "Everything is ready. Press Finish."
        ].join("\n"));
    };
    wizard.currentIdChanged.connect(refreshSummary);
    wizard.accepted.connect(() => {
        const result = new CDialog(parent); result.setGeometry(160, 140, 540, 270); result.setWindowTitle("Wizard completed");
        const label = new CLabel(result); label.setGeometry(20, 16, 500, 180);
        label.setAlignment(CAlignment.Left | CAlignment.Top); label.setWordWrap(true);
        label.setText(`Demo setup completed.\n\nCompany: ${companyName.text().trim()}\nEmail: ${email.text().trim()}\nCurrency: ${currency.currentText()}\nNotifications: ${notifications.isChecked() ? "enabled" : "disabled"}\n\nThese values are only used in this demo.`);
        const buttons = new CDialogButtonBox(CStandardButton.Ok, result); buttons.setGeometry(20, 222, 500, 30);
        buttons.accepted.connect(() => result.accept()); result.exec();
    });
    wizard.exec();
}

function startDemo(): void {
const canvas = document.querySelector<HTMLCanvasElement>("#canvas");

if (canvas === null)
    throw new Error("Canvas element not found.");

const settings = new CSettings("ct-demo");
// Restore before constructing the palette or any widgets.
if (!settings.contains("theme")) {
    try {
        const previousTheme = window.localStorage.getItem("ct-demo-theme");
        if (previousTheme === "light" || previousTheme === "dark")
            settings.setValue("theme", previousTheme);
    } catch { /* The demo can run without browser storage. */ }
}
const savedTheme = settings.value("theme", "light");
if (savedTheme === "light" || savedTheme === "dark")
    document.documentElement.setAttribute("data-ct-theme", savedTheme);

const app = new CApplication(canvas);
// Load the initial CSS theme before building the demo.
const cssPalette = new CCssPalette(canvas);
app.setPalette(cssPalette);

const mainWindow = new CMainWindow();

mainWindow.setGeometry(0, 0, canvas.width, canvas.height);

class DemoSurface extends RedWidget {
    #background: string | null = null;
    protected override paintEvent(painter: CPainter): void {
        painter.setFillStyle(this.color());
        painter.fillRect(this.rect());
    }
    override color(): string { return this.#background ?? this.palette().color(CPaletteColorRole.Window).toHex(); }
    override setColor(color: string): void {
        this.#background = color;
        this.update();
    }
}
const parent = new DemoSurface();
mainWindow.setCentralWidget(parent);

const but = new CPushButton(parent);
but.setGeometry(50, 50, 100, 30);
but.setText("Click me");

but.clicked.connect(async () => {
		const dlg = new CDialog(parent);
		dlg.setGeometry(150, 150, 600, 550);
		dlg.setWindowTitle("Settings");

		const buttonBox = new CDialogButtonBox(
			CStandardButton.Ok | CStandardButton.Cancel, dlg );

		buttonBox.setGeometry(10, 500, 580, 30);

		buttonBox.accepted.connect(() => {
			dlg.accept();
		});

		buttonBox.rejected.connect(() => {
			dlg.reject();
		});

		dlg.accepted.connect(() =>
		{
			console.log("Dlg accepted");
		});

		dlg.rejected.connect(() =>
		{
			console.log("Dialog rejected");
		});

		const toolBar = new CToolBar(dlg);
		toolBar.setGeometry(0, 0, 500, 36);

		const newAction = new CAction("New");
		const openAction = new CAction("Open");
		const saveAction = new CAction();
		const pixmap = await CPixmap.fromUrl("/icons/save.png");
		const icon = new CIcon(pixmap);
		saveAction.setIcon(icon);
		toolBar.addAction(newAction);

		toolBar.addAction(openAction);
		toolBar.addSeparator();
		toolBar.addAction(saveAction);

		const list = new CListWidget(dlg);
		list.setGeometry(20, 50, 180, 160);
		list.addItem("Slovenia");
		list.addItem("Austria");
		list.addItem("Germany");
		list.addItem("Italy");
		list.addItem("France");
		list.addItem("Spain");
		list.addItem("Portugal");
		list.addItem("Croatia");
		const disabledItem = new CListWidgetItem("Disabled");
		disabledItem.setEnabled(false);
		list.addItem(disabledItem);
		list.addItem("Hungary");
		list.addItem("Poland");
		list.setMidLineWidth(4);

		list.currentRowChanged.connect(row =>
		{
			console.log("current row:", row);
		});

		list.itemClicked.connect(item =>
		{
			console.log("clicked:", item.text());
		});
		list.setSelectionMode(CSelectionMode.MultiSelection);

		const sw = new CStackedWidget(dlg);
		sw.setGeometry(250, 50, 200, 100);

		const page1 = new CWidget();
		const page2 = new CWidget();
		const page3 = new CWidget();

		const button1 = new CPushButton(page1);
		button1.setGeometry(20, 20, 120, 30);
		button1.setText("Page 1");

		const button2 = new CPushButton(page2);
		button2.setGeometry(20, 20, 120, 30);
		button2.setText("Page 2");

		const button3 = new CPushButton(page3);
		button3.setGeometry(20, 20, 120, 30);
		button3.setText("Page 3");

		sw.addWidget(page1);
		sw.addWidget(page2);
		sw.addWidget(page3);

		const previous = new CPushButton(dlg);
		previous.setGeometry(450, 60, 100, 30);
		previous.setText("Previous");

		const next = new CPushButton(dlg);
		next.setGeometry(450, 90, 100, 30);
		next.setText("Next");

		previous.clicked.connect(() =>
		{
			if (sw.currentIndex() > 0)
				sw.setCurrentIndex(sw.currentIndex() - 1);
		});

		next.clicked.connect(() =>
		{
			if (sw.currentIndex() < sw.count() - 1)
				sw.setCurrentIndex(sw.currentIndex() + 1);
		});

		sw.currentChanged.connect(index =>
		{
			console.log("Current page:", index);
		});

		const tw = new CTabWidget(dlg);
		tw.setGeometry(10, 300, 300, 150);
		const rw = new RedWidget(tw);
		const bw = new BlueWidget(tw);
		tw.addTab(rw, "Red");
		tw.addTab(bw, "Blue");

		const fr = new CFrame(rw);
		fr.setGeometry(20, 20, 150, 60);
		fr.setFrameShape(CFrameShape.Box);
		fr.setFrameShadow(CFrameShadow.Sunken);
		fr.setLineWidth(1);
		fr.setMidLineWidth(1);

		var lyt = new CHBoxLayout;
		lyt.setContentsMargins(0, 0, 0, 0);
		var pb2 = new CPushButton();
		pb2.setText("Pushbutton at 0,0");
		lyt.addWidget(pb2);
		fr.setLayout(lyt);

		const cb = new CComboBox(dlg);
		cb.setGeometry(300, 200, 200, 30);
		cb.addItem("Bosnia and Herzegovina");
		cb.addItem("Croatia");
		cb.addItem("Montenegro");
		cb.addItem("North Macedonia");
		cb.addItem("Serbia");
		cb.addItem("Slovenia");
		cb.setEditable(true);

		const tb = new CToolButton(dlg)
		tb.setGeometry(350, 260, 60, 60);
		tb.setText("TB");
		const grip = new CSizeGrip(dlg);
		grip.setGeometry(dlg.width() - 16, dlg.height() - 16, 16, 16);
		dlg.exec();
	});

const but2 = new CPushButton(parent);
but2.setGeometry(500, 50, 100, 30);
but2.setText("Open dialog");
but2.clicked.connect(() => {
	const dlg = new CDialog(parent);
	dlg.setGeometry(100, 100, 500, 400);

	const bb = new CDialogButtonBox(CStandardButton.Ok | CStandardButton.Cancel, dlg);
	bb.setGeometry(0, 360, 490, 30);

	bb.accepted.connect(() => {
			dlg.accept();
		});

	bb.rejected.connect(() => {
			dlg.reject();
		});

	const gb = new CGroupBox("Settings", dlg);
	gb.setGeometry(6, 6, 488, 330);
	const fl = new CFormLayout();
	gb.setLayout(fl);
	const leName = new CLineEdit();
	leName.setEnabled(false);
	fl.addRow("Name", leName);
	const leSurname = new CLineEdit();
	fl.addRow("Last Name", leSurname);

	const cw = new CCalendarWidget(gb);
	cw.setGeometry(240, 120, 240, 200);
	dlg.exec();
});

const but3 = new CPushButton(parent);
but3.setGeometry(620, 50, 100, 30);
but3.setText("CTableView");
but3.clicked.connect(() => {
	const dlg = new CDialog(parent);
	dlg.setGeometry(100, 100, 800, 400);
	dlg.setWindowTitle("Employees");

	const tv = new CTableView(dlg);
	tv.setGeometry(50, 20, 500, 330);
	const model = new DemoTableModel();
	const proxy = new CSortFilterProxyModel();
	proxy.setSourceModel(model);

	tv.setModel(proxy);
	tv.setSortingEnabled(true);

	tv.setSortingEnabled(true);
	tv.setItemDelegateForColumn(2, new CIntItemDelegate());
	const occupationDelegate = new CComboBoxItemDelegate(["Developer", "Designer",
    	"Manager", "Engineer", "Architect", "Analyst" ]);
	tv.setItemDelegateForColumn(4, occupationDelegate);
	proxy.setFilterKeyColumn(1); // Country
	//proxy.setFilterFixedString("Italy");

	const bb = new CDialogButtonBox(CStandardButton.Ok, dlg);
	bb.setGeometry(0, 360, 780, 30);
	bb.accepted.connect(() => {
		dlg.accept();
	});
	dlg.exec();
});

const but4 = new CPushButton(parent);
but4.setGeometry(740, 50, 100, 30);
but4.setText("CTreeView");
but4.clicked.connect(() => {
	const dlg = new CDialog(parent);
	dlg.setGeometry(100, 100, 800, 400);
	dlg.setWindowTitle("Something");

	const root = node(["Root", "", ""], [
	node(["src", "Folder", ""], [
		node(["core", "Folder", ""], [
			node(["CApplication.ts", "TypeScript", "18 KB"]),
			node(["CObject.ts", "TypeScript", "7 KB"]),
			node(["CSignal.ts", "TypeScript", "3 KB"])
		]),
		node(["events", "Folder", ""], [
			node(["CEvent.ts", "TypeScript", "4 KB"]),
			node(["CKeyEvent.ts", "TypeScript", "3 KB"]),
			node(["CMouseEvent.ts", "TypeScript", "5 KB"])
		]),
		node(["geometry", "Folder", ""], [
			node(["CPoint.ts", "TypeScript", "2 KB"]),
			node(["CRect.ts", "TypeScript", "5 KB"]),
			node(["CSize.ts", "TypeScript", "2 KB"])
		]),
		node(["models", "Folder", ""], [
			node(["CAbstractItemModel.ts", "TypeScript", "5 KB"]),
			node(["CItemSelectionModel.ts", "TypeScript", "6 KB"]),
			node(["CModelIndex.ts", "TypeScript", "3 KB"])
		]),
		node(["widgets", "Folder", ""], [
			node(["CButton.ts", "TypeScript", "6 KB"]),
			node(["CLineEdit.ts", "TypeScript", "15 KB"]),
			node(["CListView.ts", "TypeScript", "11 KB"]),
			node(["CTableView.ts", "TypeScript", "16 KB"]),
			node(["CTreeView.ts", "TypeScript", "18 KB"]),
			node(["CWidget.ts", "TypeScript", "25 KB"])
		])
	]),
	node(["tests", "Folder", ""], [
		node(["core", "Folder", ""], [
			node(["CApplication.test.ts", "Test", "32 KB"]),
			node(["CObject.test.ts", "Test", "14 KB"])
		]),
		node(["models", "Folder", ""], [
			node(["CModelIndex.test.ts", "Test", "9 KB"]),
			node(["CItemSelectionModel.test.ts", "Test", "18 KB"])
		]),
		node(["widgets", "Folder", ""], [
			node(["CListView.test.ts", "Test", "17 KB"]),
			node(["CTableView.test.ts", "Test", "24 KB"]),
			node(["CTreeView.test.ts", "Test", "28 KB"])
		])
	]),
	node(["examples", "Folder", ""], [
		node(["main.ts", "TypeScript", "8 KB"]),
		node(["index.html", "HTML", "2 KB"])
	]),
	node(["package.json", "JSON", "1 KB"]),
	node(["tsconfig.json", "JSON", "1 KB"]),
	node(["README.md", "Markdown", "6 KB"])
	]);

	const model = new DemoTreeModel(root);
	const tree = new CTreeView(dlg);
	tree.setModel(model);

	tree.expanded.connect(index => {
		console.log("expanded:", model.data(index));
	});

	tree.collapsed.connect(index => {
		console.log("collapsed:", model.data(index));
	});

	tree.selectionModel()?.currentChanged.connect((current, previous) => {
		console.log("current:", model.data(current), "previous:", model.data(previous));
	});
	tree.setGeometry(50, 20, 500, 330);
	const bb = new CDialogButtonBox(CStandardButton.Ok, dlg);
	bb.setGeometry(0, 360, 780, 30);
	bb.accepted.connect(() => {
		dlg.accept();
	});
	dlg.exec();
	
});

const but5 = new CPushButton(parent);
but5.setText("CTreeWidget");
but5.setGeometry(30, 700, 100, 30);
but5.clicked.connect(() => {
	const dlg = new CDialog(parent);
	dlg.setGeometry(100, 100, 800, 400);
	dlg.setWindowTitle("CTreeWidget");

	const tree = new CTreeWidget(dlg);
	tree.setGeometry(20, 20, 600, 350);
	tree.setHeaderLabels(["Name", "Type", "Size"]);

	const documents = new CTreeWidgetItem(["Documents", "Folder", ""]);
	const projects = new CTreeWidgetItem(["Projects", "Folder", ""]);
	const canvasToolkit = new CTreeWidgetItem(["Canvas Toolkit", "Project", ""]);
	const src = new CTreeWidgetItem(["src", "Folder", ""]);
	const widgets = new CTreeWidgetItem(["widgets", "Folder", ""]);
	widgets.addChild(new CTreeWidgetItem(["CTreeWidget.ts", "TypeScript", "8 KB"]));
	widgets.addChild(new CTreeWidgetItem(["CTreeWidgetItem.ts", "TypeScript", "3 KB"]));
	widgets.addChild(new CTreeWidgetItem(["CTableView.ts", "TypeScript", "14 KB"]));
	src.addChild(widgets);
	src.addChild(new CTreeWidgetItem(["main.ts", "TypeScript", "2 KB"]));
	canvasToolkit.addChild(src);

	canvasToolkit.addChild(new CTreeWidgetItem(["package.json", "JSON", "1 KB"]));
	canvasToolkit.addChild(new CTreeWidgetItem(["tsconfig.json", "JSON", "1 KB"]));
	projects.addChild(canvasToolkit);
	projects.addChild(new CTreeWidgetItem(["ChessCoach", "Project", ""]));

	documents.addChild(projects);
	documents.addChild(new CTreeWidgetItem(["notes.txt", "Text file", "12 KB"]));
	const downloads = new CTreeWidgetItem(["Downloads", "Folder", ""]);
	downloads.addChild(new CTreeWidgetItem(["canvas-toolkit.zip", "ZIP archive", "184 KB" ]));
	downloads.addChild(new CTreeWidgetItem(["typescript.pdf", "PDF document", "3.2 MB"]));
	const pictures = new CTreeWidgetItem(["Pictures", "Folder", ""]);
	pictures.addChild(new CTreeWidgetItem(["holiday.jpg", "JPEG image", "4.8 MB"]));

	pictures.addChild(new CTreeWidgetItem(["screenshot.png", "PNG image", "820 KB"]));

	tree.addTopLevelItem(documents);
	tree.addTopLevelItem(downloads);
	tree.addTopLevelItem(pictures);

	tree.currentItemChanged.connect((current, previous) => {
		console.log("current:", current?.text(0) ?? null, "previous:", previous?.text(0) ?? null);
	});
	const bb = new CDialogButtonBox(CStandardButton.Ok, dlg);
	bb.setGeometry(0, 360, 780, 30);
	bb.accepted.connect(() => {
		dlg.accept();
	});
	dlg.exec();
});

const but6 = new CPushButton(parent);
but6.setText("CTableWidget");
but6.setGeometry(150, 700, 100, 30);
but6.clicked.connect(() => {
	const dlg = new CDialog(parent);
	dlg.setGeometry(100, 100, 800, 400);
	dlg.setWindowTitle("CTableWidget");

	const table = new CTableWidget(dlg);

	table.setGeometry(20, 20, 650, 350);
	table.setRowCount(15);
	table.setColumnCount(4);
	table.setSortingEnabled(true);

	table.setHorizontalHeaderLabels(["Name", "Occupation", "Age", "City"]);

	//table.setVerticalHeaderLabels(["1", "2", "3", "4", "5", "6", "7", "8"]);

	const data: unknown[][] = [
    	["Bojan", "Programmer", 52, "Maribor"],
    	["Peter", "Engineer", 48, "Ljubljana"],
    	["Ana", "Designer", 35, "Celje"],
    	["Marko", "Architect", 41, "Koper"],
    	["Maja", "Accountant", 39, "Ptuj"],
    	["Luka", "Developer", 29, "Kranj"],
    	["Nina", "Project Manager", 44, "Nova Gorica"],
    	["Tomaž", "System Administrator", 37, "Velenje"],
    	["Žana", "Designer", 35, "Celje"],
    	["Darko", "Architect", 41, "Koper"],
    	["Kaja", "Accountant", 39, "Ptuj"],
    	["Ines", "Developer", 29, "Kranj"],
    	["Nika", "Project Manager", 44, "Nova Gorica"],
    	["Frančeškin", "System Administrator", 37, "Velenje"],
    	["Domagoj", "System Administrator", 37, "Velenje"]
	];

	for (let row = 0; row < data.length; row++) {
		for (let column = 0; column < data[row]!.length; column++) {
			table.setItem(row, column,
				new CTableWidgetItem(data[row]![column]!));
		}
	}

	table.currentItemChanged.connect((current, previous) => {
		console.log("current:", current?.text() ?? null, "previous:",
			previous?.text() ?? null);
	});
	table.setItemDelegateForColumn(2, new CNumberItemDelegate());
	
	const bb = new CDialogButtonBox(CStandardButton.Ok, dlg);
	bb.setGeometry(0, 360, 780, 30);
	bb.accepted.connect(() => {
		dlg.accept();
	});
	dlg.exec();
});

const sqlButton = new CPushButton(parent);
sqlButton.setText("SQL model");
sqlButton.setGeometry(270, 700, 100, 30);
sqlButton.clicked.connect(async () => {
	const dlg = new CDialog(parent);
	dlg.setGeometry(50, 80, 900, 500);
	dlg.setWindowTitle("SQL table model");

	const adapter = new CMemorySqlTableAdapter({
		employees: createSqlEmployees(),
		countries: createSqlCountries()
	});
	const model = new CSqlRelationalTableModel(adapter);
	model.setTable("employees");
	model.setPrimaryKey("id");
	model.setColumns([
		"id", "name", "country_id", "age", "occupation", "start_date",
		"start_time", "last_login", "active"
	]);
	model.setRelation(2, new CSqlRelation("countries", "id", "name"));
	model.setColumnHeader("id", "ID");
	model.setColumnHeader("name", "Name");
	model.setColumnHeader("country_id", "Country");
	model.setColumnHeader("age", "Age");
	model.setColumnHeader("occupation", "Occupation");
	model.setColumnHeader("start_date", "Start date");
	model.setColumnHeader("start_time", "Start time");
	model.setColumnHeader("last_login", "Last login");
	model.setColumnHeader("active", "Active");
	model.setFetchSize(20);

	const status = new CLabel(dlg);
	status.setGeometry(20, 15, 250, 28);

	const strategyLabel = new CLabel(dlg);
	strategyLabel.setText("Edit strategy:");
	strategyLabel.setGeometry(270, 15, 90, 28);

	const strategy = new CComboBox(dlg);
	strategy.setGeometry(360, 15, 170, 28);
	strategy.addItems(["On field change", "On row change", "Manual submit"]);
	strategy.currentIndexChanged.connect(index => {
		model.setEditStrategy([
			CSqlEditStrategy.OnFieldChange,
			CSqlEditStrategy.OnRowChange,
			CSqlEditStrategy.OnManualSubmit
		][index] ?? CSqlEditStrategy.OnFieldChange);
	});

	const filterLabel = new CLabel(dlg);
	filterLabel.setText("Name:");
	filterLabel.setGeometry(550, 15, 50, 28);

	const filterEdit = new CLineEdit(dlg);
	filterEdit.setGeometry(600, 15, 180, 28);
	filterEdit.editingFinished.connect(() => {
		const value = filterEdit.text().trim();
		if (value === "") {
			model.clearFilter();
			return;
		}
		model.setFilter({
			column: "name",
			operator: CSqlFilterOperator.Contains,
			value
		});
	});

	const tv = new CTableView(dlg);
	tv.setGeometry(20, 55, 860, 345);
	tv.setModel(model);
	tv.setItemDelegate(new CSqlRelationalDelegate());
	tv.setSortingEnabled(true);

	const ageDelegate = new CIntItemDelegate();
	ageDelegate.setRange(18, 100);
	tv.setItemDelegateForColumn(3, ageDelegate);
	tv.setItemDelegateForColumn(4, new CComboBoxItemDelegate(sqlOccupations));
	tv.setItemDelegateForColumn(5, new CDateItemDelegate());
	tv.setItemDelegateForColumn(6, new CTimeItemDelegate());
	tv.setItemDelegateForColumn(7, new CDateTimeItemDelegate());

	const updateStatus = (): void => {
		status.setText(model.isLoading()
			? "Loading..."
			: `${model.rowCount()} / ${model.totalRowCount()} rows loaded`);
	};
	model.modelReset.connect(updateStatus);
	model.loadingChanged.connect(updateStatus);
	model.dataSubmitted.connect(() => status.setText("Changes saved"));
	model.errorOccurred.connect(error => status.setText(`Error: ${error.message}`));

	const addButton = new CPushButton(dlg);
	addButton.setText("Add row");
	addButton.setGeometry(20, 415, 100, 30);
	addButton.clicked.connect(async () => {
		await model.insertRecord({
			name: "New employee",
			country_id: 1,
			age: 30,
			occupation: "Developer",
			start_date: new Date(),
			start_time: new Date(1970, 0, 1, 8, 0, 0),
			last_login: new Date(),
			active: true
		});
		updateStatus();
	});

	const deleteButton = new CPushButton(dlg);
	deleteButton.setText("Delete row");
	deleteButton.setGeometry(130, 415, 100, 30);
	deleteButton.clicked.connect(async () => {
		const row = tv.currentIndex().row();
		if (row >= 0)
			await model.removeRow(row);
		updateStatus();
	});

	const saveButton = new CPushButton(dlg);
	saveButton.setText("Submit all");
	saveButton.setGeometry(240, 415, 100, 30);
	saveButton.clicked.connect(async () => {
		await model.submitAll();
		updateStatus();
	});

	const revertButton = new CPushButton(dlg);
	revertButton.setText("Revert");
	revertButton.setGeometry(350, 415, 100, 30);
	revertButton.clicked.connect(() => {
		model.revertAll();
		updateStatus();
	});

	const closeButton = new CPushButton(dlg);
	closeButton.setText("Close");
	closeButton.setGeometry(780, 415, 100, 30);
	closeButton.clicked.connect(() => dlg.accept());

	await model.select();
	updateStatus();
	dlg.exec();
});

const mapperButton = new CPushButton(parent);
mapperButton.setText("Widget mapper");
mapperButton.setGeometry(390, 700, 120, 30);
mapperButton.clicked.connect(() => {
	const dlg = new CDialog(parent);
	dlg.setGeometry(70, 80, 920, 540);
	dlg.setWindowTitle("Employee mapper / Tab order and label buddies");
	const model = new DemoTableModel();
	for (let row = 0; row < model.rowCount(); ++row) {
		const index = model.index(row, 2);
		model.setItemData(index, Number(model.data(index)));
	}

	const table = new CTableView(dlg);
	table.setGeometry(20, 20, 420, 300);
	table.setModel(model);

	const group = new CGroupBox("Employee", dlg);
	group.setGeometry(460, 20, 440, 220);
	const form = new CFormLayout();
	group.setLayout(form);

	const name = new CLineEdit();
	const country = new CComboBox();
	country.addItems(sqlCountries);
	const age = new CNumberEdit();
	age.setDecimals(2);
	const occupation = new CComboBox();
	occupation.addItems(sqlOccupations);
    // CFormLayout creates each label and links its buddy automatically.
    form.addRow("1. &Name", name);
    form.addRow("3. &Country", country);
    form.addRow("2. &Age (formula)", age);
    form.addRow("4. &Occupation", occupation);

	const mapper = new CDataWidgetMapper(dlg);
	mapper.setModel(model);
	mapper.setSubmitPolicy(CDataWidgetMapperSubmitPolicy.ManualSubmit);
	mapper.addMapping(name, 0);
	mapper.addMapping(country, 1);
	mapper.addMapping(age, 2);
	mapper.addMapping(occupation, 4);

	const status = new CLabel(dlg);
	status.setText("Enter confirms the formula; Submit saves the changes.");
	status.setGeometry(460, 300, 440, 24);
	const hint = new CLabel(dlg);
	hint.setText("Try (18+22)/2 or 1/0. Revert discards changes.");
	hint.setGeometry(460, 326, 440, 20);
	mapper.validationFailed.connect((_widget, section) => {
		status.setText(section === 2
			? "Invalid age formula. Correct it or click Revert."
			: "Invalid value. Correct it and submit again.");
	});
	table.selectionModel()?.currentChanged.connect(current =>
		mapper.setCurrentModelIndex(current));
	mapper.currentIndexChanged.connect(row => {
		const index = model.index(row, 0);
		const selection = table.selectionModel();
		selection?.clearSelection();
		selection?.select(index);
		table.setCurrentIndex(index);
	});
	mapper.toFirst();

	const previous = new CPushButton(dlg);
	previous.setText("Previous");
	previous.setGeometry(460, 260, 90, 30);
	previous.clicked.connect(() => mapper.toPrevious());

	const next = new CPushButton(dlg);
	next.setText("Next");
	next.setGeometry(560, 260, 90, 30);
	next.clicked.connect(() => mapper.toNext());

	const save = new CPushButton(dlg);
	save.setText("Submit");
    save.setDefault(true);
	save.setGeometry(660, 260, 90, 30);
	const submitChanges = (): void => {
		if (mapper.submit())
			status.setText(`Changes saved. Age: ${age.value()}.`);
	};
	save.clicked.connect(submitChanges);
	const saveAction = new CAction("Save", dlg);
	saveAction.setShortcut("Ctrl+S");
	saveAction.triggered.connect(() => {
    	mapper.submit();
	});

	const revert = new CPushButton(dlg);
	revert.setText("Revert");
	revert.setGeometry(760, 260, 90, 30);
	revert.clicked.connect(() => {
		mapper.revert();
		status.setText("Changes reverted.");
	});

	const close = new CPushButton(dlg);
	close.setText("Close");
	close.setGeometry(810, 490, 90, 30);
	close.clicked.connect(() => dlg.accept());

    const tabHint = new CLabel(dlg);
    tabHint.setText("Tab: 1 Name -> 2 Age -> 3 Country -> 4 Occupation (Shift+Tab reverses).");
    tabHint.setGeometry(20, 354, 880, 24);
    const cycleHint = new CLabel(dlg);
    cycleHint.setText("Then Previous -> Next -> Submit -> Revert -> Close -> table -> Name. Focus stays in this dialog.");
    cycleHint.setGeometry(20, 382, 880, 24);

    const buddyHint = new CLabel(dlg);
    buddyHint.setText("Alt+N: Name | Alt+A: Age | Alt+C: Country | Alt+O: Occupation. Or click a field label.");
    buddyHint.setGeometry(20, 410, 880, 24);

    const defaultHint = new CLabel(dlg);
    defaultHint.setText("Submit has the default border. In Age: enter a formula, Enter confirms it; Enter again submits.");
    defaultHint.setGeometry(20, 438, 880, 24);

    // The on-screen row order deliberately differs from keyboard navigation.
    CWidget.setTabOrder(name, age);
    CWidget.setTabOrder(age, country);
    CWidget.setTabOrder(country, occupation);
    CWidget.setTabOrder(occupation, previous);
    CWidget.setTabOrder(previous, next);
    CWidget.setTabOrder(next, save);
    CWidget.setTabOrder(save, revert);
    CWidget.setTabOrder(revert, close);
    CWidget.setTabOrder(close, table);

    dlg.exec();
    name.setFocus();
});

const completerButton = new CPushButton(parent);
completerButton.setText("Completer");
completerButton.setGeometry(520, 700, 110, 30);
completerButton.clicked.connect(() => {
	const dlg = new CDialog(parent);
	dlg.setGeometry(180, 140, 480, 190);
	dlg.setWindowTitle("CCompleter");

	const label = new CLabel(dlg);
	label.setText("Partner:");
	label.setGeometry(25, 30, 80, 28);

	const editor = new CLineEdit(dlg);
	editor.setGeometry(110, 30, 330, 28);
	editor.setCompleter(new CCompleter([
		"Mercator d.o.o.",
		"Merkur trgovina d.o.o.",
		"Petrol d.d.",
		"Pošta Slovenije d.o.o.",
		"Telekom Slovenije d.d.",
		"Triglav, Zdravstvena zavarovalnica d.d."
	], dlg));

	const help = new CLabel(dlg);
	help.setText("Vpiši začetek imena, nato uporabi ↑, ↓ in Enter.");
	help.setGeometry(25, 75, 415, 28);

	const close = new CPushButton(dlg);
	close.setText("Close");
	close.setGeometry(360, 135, 80, 30);
	close.clicked.connect(() => dlg.accept());

	dlg.exec();
});

const undoDemoButton = new CPushButton(parent);
undoDemoButton.setText("Undo / Redo");
undoDemoButton.setGeometry(520, 740, 110, 30);
undoDemoButton.clicked.connect(() => {
    const dlg = new CDialog(parent);
    dlg.setWindowTitle("Undo / Redo — text editors");
    dlg.setGeometry(160, 100, 640, 420);

    const lineLabel = new CLabel(dlg);
    lineLabel.setText("CLineEdit");
    lineLabel.setGeometry(25, 20, 200, 24);
    const line = new CLineEdit(dlg);
    line.setGeometry(25, 50, 390, 28);
    line.setText("Edit this text");

    const textLabel = new CLabel(dlg);
    textLabel.setText("CTextEdit");
    textLabel.setGeometry(25, 105, 200, 24);
    const text = new CTextEdit(dlg);
    text.setGeometry(25, 135, 390, 190);
    text.setPlainText("Edit this text.\nTry typing, selection, cut and paste.");

    // Each editor has its own history and button pair.
    const addHistoryButtons = (editor: CLineEdit | CTextEdit, y: number): void => {
        const undo = new CPushButton(dlg);
        undo.setText("Undo");
        undo.setGeometry(435, y, 80, 30);
        undo.setEnabled(editor.canUndo());
        editor.undoAvailable.connect(available => undo.setEnabled(available));
        undo.clicked.connect(() => {
            editor.undo();
            editor.setFocus();
        });

        const redo = new CPushButton(dlg);
        redo.setText("Redo");
        redo.setGeometry(525, y, 80, 30);
        redo.setEnabled(editor.canRedo());
        editor.redoAvailable.connect(available => redo.setEnabled(available));
        redo.clicked.connect(() => {
            editor.redo();
            editor.setFocus();
        });
    };
    addHistoryButtons(line, 50);
    addHistoryButtons(text, 135);

    const help = new CLabel(dlg);
    help.setText("Undo: Ctrl+Z     Redo: Ctrl+Y / Ctrl+Shift+Z");
    help.setGeometry(25, 340, 580, 25);

    const close = new CPushButton(dlg);
    close.setText("Close");
    close.setGeometry(525, 375, 80, 30);
    close.clicked.connect(() => dlg.accept());
    dlg.exec();
});

// Find uses CTextEdit's shared implementation through CPlainTextEdit.
const findDemoButton = new CPushButton(parent);
findDemoButton.setText("Find text");
findDemoButton.setGeometry(390, 740, 120, 30);
findDemoButton.clicked.connect(() => {
    const dlg = new CDialog(parent);
    dlg.setWindowTitle("Find / Replace — CPlainTextEdit / CTextEdit");
    dlg.setGeometry(120, 70, 800, 560);

    const hint = new CLabel(dlg);
    hint.setGeometry(20, 15, 620, 28);
    hint.setText("Ctrl+F: išči   Ctrl+H: zamenjaj   F3 / Shift+F3: naprej / nazaj");

    const showFind = new CPushButton(dlg);
    showFind.setGeometry(665, 15, 115, 28);
    showFind.setText("Išči (Ctrl+F)");

    const bar = new CWidget(dlg);
    bar.setGeometry(20, 52, 760, 126);
    const query = new CLineEdit(bar);
    query.setGeometry(0, 0, 350, 28);
    query.setPlaceholderText("Besedilo za iskanje");
    const previous = new CPushButton(bar);
    previous.setGeometry(360, 0, 115, 28);
    previous.setText("Prejšnji");
    const next = new CPushButton(bar);
    next.setGeometry(485, 0, 115, 28);
    next.setText("Naslednji");
    const hideFind = new CPushButton(bar);
    hideFind.setGeometry(610, 0, 150, 28);
    hideFind.setText("Zapri iskanje (Esc)");

    const replacement = new CLineEdit(bar);
    replacement.setGeometry(0, 32, 350, 28);
    replacement.setPlaceholderText("Zamenjaj z … (prazno izbriše zadetek)");
    const replaceOne = new CPushButton(bar);
    replaceOne.setGeometry(360, 32, 115, 28);
    replaceOne.setText("Zamenjaj");
    const replaceAll = new CPushButton(bar);
    replaceAll.setGeometry(485, 32, 115, 28);
    replaceAll.setText("Zamenjaj vse");

    const caseSensitive = new CCheckBox(bar);
    caseSensitive.setGeometry(0, 64, 250, 26);
    caseSensitive.setText("Velike/male črke");
    const wholeWords = new CCheckBox(bar);
    wholeWords.setGeometry(265, 64, 180, 26);
    wholeWords.setText("Cele besede");
    const status = new CLabel(bar);
    status.setGeometry(0, 93, 760, 26);

    const editor = new CPlainTextEdit(dlg);
    editor.setPlainText([
        "Iskanje v Canvas Toolkit",
        "",
        "Bojan uporablja Canvas Toolkit. Clarica uporablja canvas toolkit.",
        "Beseda Canvas se ponovi večkrat: Canvas, canvas in CANVAS.",
        "Pri celih besedah: test, tester, test_2 in test.",
        "Šumniki: čebela, ČEBELA in čebelar.",
        "Posebni znaki so dobesedni: [a]+ in (60+40)*1.22.",
        "",
        ...Array.from({ length: 25 }, (_, i) =>
            `Vrstica ${i + 1}: besedilo za pomikanje in iskanje.`),
        "",
        "Zadnji zadetek: Canvas."
    ].join("\n"));
    editor.setCursorPosition(0);

    const escapeFind = new CShortcut("Escape", dlg);
    const openFind = (): void => {
        const selected = editor.selectedText();
        if (selected.length > 0 && !selected.includes("\n")) query.setText(selected);
        bar.show();
        editor.setGeometry(20, 188, 760, 307);
        escapeFind.setEnabled(true);
        query.setFocus();
        query.selectAll();
        status.setText("Poskusi Canvas, test ali čebela. Iskanje ne preskoči konca dokumenta.");
    };
    const closeFind = (): void => {
        bar.hide();
        editor.setGeometry(20, 52, 760, 443);
        escapeFind.setEnabled(false);
        editor.setFocus();
    };
    const searchFlags = (backward = false): CTextEditFindFlag => {
        let flags = backward ? CTextEditFindFlag.Backward : CTextEditFindFlag.None;
        if (caseSensitive.isChecked()) flags |= CTextEditFindFlag.CaseSensitive;
        if (wholeWords.isChecked()) flags |= CTextEditFindFlag.WholeWords;
        return flags;
    };
    const replaceText = (all: boolean): void => {
        if (query.text().length === 0) {
            status.setText("Najprej vpiši besedilo za iskanje.");
            query.setFocus();
            return;
        }
        if (all) {
            const count = editor.replaceAll(query.text(), replacement.text(), searchFlags());
            status.setText(`Zamenjav v celotnem dokumentu: ${count}. En Undo razveljavi vse.`);
        } else {
            const found = editor.replace(query.text(), replacement.text(), searchFlags());
            status.setText(found ? "Zadetek zamenjan. Znova klikni za naslednjega."
                : "Ni naslednjega zadetka. Uporabi »Na začetek«.");
        }
    };
    const search = (backward: boolean): void => {
        if (!bar.isVisible()) openFind();
        const text = query.text();
        if (text.length === 0) {
            status.setText("Najprej vpiši besedilo za iskanje.");
            query.setFocus();
            return;
        }
        const found = editor.find(text, searchFlags(backward));
        status.setText(found
            ? `Najdeno: »${editor.selectedText()}« (položaj ${editor.selectionStart() + 1}).`
            : backward
                ? "Pred trenutno izbiro ni zadetka. Iskanje ne preskoči na konec."
                : "Za trenutno izbiro ni zadetka. Za iskanje od začetka klikni »Na začetek«."
        );
    };

    replaceOne.clicked.connect(() => replaceText(false));
    replaceAll.clicked.connect(() => replaceText(true));
    replacement.returnPressed.connect(() => replaceText(false));
    new CShortcut("Ctrl+H", dlg).activated.connect(() => {
        openFind();
        replacement.setFocus();
        replacement.selectAll();
    });
    showFind.clicked.connect(openFind);
    hideFind.clicked.connect(closeFind);
    previous.clicked.connect(() => search(true));
    next.clicked.connect(() => search(false));
    query.returnPressed.connect(() => search(false));
    query.textEdited.connect(() => status.setText("Enter: naslednji zadetek; Shift+F3: prejšnji."));
    new CShortcut("Ctrl+F", dlg).activated.connect(openFind);
    new CShortcut("F3", dlg).activated.connect(() => search(false));
    new CShortcut("Shift+F3", dlg).activated.connect(() => search(true));
    escapeFind.activated.connect(closeFind);

    const beginning = new CPushButton(dlg);
    beginning.setGeometry(20, 515, 130, 28);
    beginning.setText("Na začetek");
    beginning.clicked.connect(() => {
        editor.setCursorPosition(0);
        editor.setFocus();
        status.setText("Kurzor je na začetku dokumenta.");
    });
    const end = new CPushButton(dlg);
    end.setGeometry(160, 515, 130, 28);
    end.setText("Na konec");
    end.clicked.connect(() => {
        editor.setCursorPosition(editor.toPlainText().length);
        editor.setFocus();
        status.setText("Kurzor je na koncu dokumenta.");
    });
    const undo = new CPushButton(dlg);
    undo.setGeometry(310, 515, 100, 28);
    undo.setText("Undo");
    undo.setEnabled(editor.canUndo());
    editor.undoAvailable.connect(available => undo.setEnabled(available));
    undo.clicked.connect(() => { editor.undo(); editor.setFocus(); });
    const redo = new CPushButton(dlg);
    redo.setGeometry(420, 515, 100, 28);
    redo.setText("Redo");
    redo.setEnabled(editor.canRedo());
    editor.redoAvailable.connect(available => redo.setEnabled(available));
    redo.clicked.connect(() => { editor.redo(); editor.setFocus(); });
    const close = new CPushButton(dlg);
    close.setGeometry(665, 515, 115, 28);
    close.setText("Zapri demo");
    close.clicked.connect(() => dlg.accept());
    closeFind();
    dlg.exec();
    editor.setFocus();
});

const edit = new CNumberEdit(parent);
edit.setGeometry(520, 780, 180, 28);
edit.setExpression("(60+40)*1.22");
edit.valueChanged.connect(value => console.log(value));

const lab = new CLabel(parent);
lab.setGeometry(250, 50, 130, 40);
lab.setText("Jaz sem CLabel");
lab.setToolTip("This is CLabel, you won't believe that...");
lab.setAlignment(CAlignment.Right | CAlignment.Top);
lab.setFrameShape(CFrameShape.VLine);
lab.setFrameShadow(CFrameShadow.Raised);

const lab2 = new CLabel(parent);
lab2.setGeometry(250, 100, 60, 60);
//lab2.setPixmap(await CPixmap.fromUrl("https://lh3.googleusercontent.com/a/ACg8ocLmgw58KyM8NCkoYwv98Z1rhTAHr5doS1DcOM8s60xFXhZIN3Qb=s96-c"));
lab2.setText("Bojan");

const kse = new CKeySequenceEdit(parent);
kse.setGeometry(800, 20, 100, 30);

const child = new BlueWidget(parent);
child.setToolTip("Blue widget");
child.setGeometry(250, 250, 150, 100);

const cbox = new CCheckBox(child);
cbox.setText("Check me?");
cbox.setGeometry(10, 10, 100, 30);

const cbox2 = new CCheckBox(parent);
cbox2.setText("Check me again");
cbox2.setGeometry(10, 10, 150, 30);

const rb1 = new CRadioButton("Radio buttons", parent);
rb1.setGeometry(360, 100, 120, 20);
const rb2 = new CRadioButton("Check boxes", parent);
rb2.setGeometry(360, 120, 120, 20);
const rb3 = new CRadioButton("PushButtons", parent);
rb3.setGeometry(360, 140, 120, 20);
const cb = new CButtonGroup(parent);
cb.addButton(rb1);
cb.addButton(rb2);
cb.addButton(rb3);

const le = new CLineEdit(parent);
le.setGeometry(10, 100, 150, 20);
le.setPlaceholderText("This is placeholder");

const gb = new CGroupBox("Sliders & bars", parent);
gb.setGeometry(5, 135, 210, 160);

const sl = new CSlider(gb)
sl.setGeometry(5, 15, 200, 16);

const pb = new CProgressBar(gb);
pb.setGeometry(5, 45, 200, 16);
pb.setValue(0);

const sbox = new CSpinBox(gb);
sbox.setGeometry(5, 60, 80, 30);
sbox.setValue(30);
sbox.valueChanged.connect(value => {
	console.log("spin value:", value);
});

const dbox = new CDoubleSpinBox(gb);
dbox.setGeometry(5, 95, 80, 30);
dbox.setValue(55.51);
dbox.valueChanged.connect(value => {
	console.log("double spin value:", value);
});

const sbar = new CScrollBar(COrientation.Horizontal, gb);
sbar.setGeometry(5, 130, 200, 16);

const vbar = new CScrollBar(COrientation.Vertical, parent);
vbar.setGeometry(220, 50, 16, 200);

const w = new CWidget(parent);
w.setGeometry(0, 440, 640, 40);
const pb1 = new CPushButton(w);
pb1.setText("OK");
pb1.clicked.connect(async () => {
	/*CMessageBox.information(null, "This is message box!", "This is a brand new message box");
	const text = await CInputDialog.getText(null, "Input dialog", "Enter text: ");
	if (text !== null)
		console.log("TEXT: " + text);

	const val = await CInputDialog.getInt(null, "Input dialog", "Enter value:", 100, 100, 200, 5);
	if (val !== null)
		console.log("INT: " + val);*/
	const files = await CFileDialog.getOpenFiles("image/*");
	if (files !== null)
	console.log(files);
});
const pb2 = new CPushButton(w);
pb2.setText("Cancel");
pb2.clicked.connect(async () => {
	/*const pd = new CProgressDialog("Copying", false, 0, 100);
	pd.setAutoClose(false);
	pd.exec();
	setInterval(() => {
		if (pd.value() < 100)
			pd.setValue(Math.min(100, pd.value() + 5));
	}, 100);*/
	const clr = new CColor();
	clr.setColor(parent.color());
	const newClr = await CColorDialog.getColor(clr);
	if (newClr !== null)
		parent.setColor(newClr?.toHex());
});
const layout = new CHBoxLayout();
layout.setContentsMargins(3, 3, 3, 3);
layout.setSpacing(6);
layout.addStretch(2);
layout.addWidget(pb1, 0);
layout.addWidget(pb2, 0);
w.setLayout(layout);

const scrollArea = new CScrollArea(parent);
scrollArea.setGeometry(20, 380, 420, 260);

const scrollContent = new ScrollContentWidget();
scrollContent.resize(1000, 700);

scrollArea.setWidget(scrollContent);

const splitter = new CSplitter(COrientation.Horizontal, parent);
splitter.setGeometry(580, 100, 600, 300);

const leftW = new CTextEdit;
leftW.setHtml(`
    <h2>Rich text editor</h2>
    <p>
        Normal,
        <b>bold</b>,
        <i>italic</i> and
        <span style="color: red; font-size: 30px">
            BIG RED
        </span>
    </p>
`);
leftW.setMinimumSize(150, 300);
leftW.setMaximumSize(350, 300);
const rightW = new BlueWidget(splitter);

const model = new CStringListModel(["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus",
	"Neptune", "Pluto", "Ceres", "Haumea", "Makemake", "Eris", "Ganymede", "Titan", "Callisto", "Io",
	"Moon", "Europa", "Triton" ]);

const listView = new CListView(rightW);

listView.setGeometry(10, 10, 200, 250);
listView.setModel(model);

splitter.addWidget(leftW);
splitter.addWidget(rightW);
splitter.setSizes([100, 94]);

const toolBox = new CToolBox(parent);
toolBox.setGeometry(700, 420, 280, 300);

const generalPage = new CWidget();

const nameLabel = new CLabel(generalPage);
nameLabel.setGeometry(10, 15, 80, 28);
nameLabel.setText("Name:");

const nameEdit = new CLineEdit(generalPage);
nameEdit.setGeometry(90, 15, 160, 28);
nameEdit.setText("Bojan");
nameEdit.setMaxLength(10);
nameEdit.setClearButtonEnabled(true);
const passLabel = new CLabel(generalPage);
passLabel.setGeometry(10, 45, 80, 28);
passLabel.setText("Password");
const passEdit = new CLineEdit(generalPage);
passEdit.setGeometry(90, 45, 160, 28);
passEdit.setEchoMode(CEchoMode.Password);

const dateLabel = new CLabel(generalPage);
dateLabel.setGeometry(10, 75, 80, 30);
dateLabel.setText("Birthday:");
const dateEdit = new CDateEdit(generalPage);
dateEdit.setGeometry(90, 75, 120, 30);
const timeLabel = new CLabel(generalPage);
timeLabel.setGeometry(10, 105, 80, 30);
timeLabel.setText("Time:");
const timeEdit = new CTimeEdit(generalPage);
timeEdit.setDisplayFormat("hh:mm ap");
timeEdit.setGeometry(90, 105, 120, 30);

const dateTimeEdit = new CDateTimeEdit(generalPage);
dateTimeEdit.setGeometry(40, 145, 200, 30);

const networkPage = new CWidget();

const hostLabel = new CLabel(networkPage);
hostLabel.setGeometry(10, 15, 80, 28);
hostLabel.setText("Host:");

const hostEdit = new CLineEdit(networkPage);
hostEdit.setGeometry(90, 15, 160, 28);
hostEdit.setText("localhost");

const portLabel = new CLabel(networkPage);
portLabel.setGeometry(10, 55, 80, 28);
portLabel.setText("Port:");

const portEdit = new CLineEdit(networkPage);
portEdit.setGeometry(90, 55, 160, 28);
portEdit.setText("8080");

const advancedPage = new CWidget();

const checkBox = new CCheckBox(advancedPage);
checkBox.setGeometry(10, 15, 200, 28);
checkBox.setText("Enable advanced mode");

toolBox.addItem(generalPage, "General");
toolBox.addItem(networkPage, "Network");
toolBox.addItem(advancedPage, "Advanced");

toolBox.currentChanged.connect(index => {
	console.log("ToolBox current:", index);
});

const ccw = new ContextMenuWidget();
ccw.setParent(parent);
ccw.setGeometry(30, 650, 100, 30);

const plain = new CPlainTextEdit(parent);
plain.setGeometry(700, 800, 300, 100);
plain.setPlaceholderText("This is CPlainTextEdit placeholder text");

const menuBar = new CMenuBar();
mainWindow.setMenuBar(menuBar);

const fileMenu = new CMenu();
const newAction = new CAction("New", mainWindow);
newAction.setShortcut("Alt+N");
newAction.triggered.connect(() => {
	console.log("New triggered");
})
const openAction = new CAction("Open", mainWindow);
openAction.setShortcut("Ctrl+O");
openAction.triggered.connect(() => {
	console.log("Open");
})
fileMenu.addAction(newAction);
fileMenu.addAction(openAction);
const importAction = new CAction("Import", mainWindow);
importAction.setShortcut("Ctrl+I");
importAction.setEnabled(false);
fileMenu.addAction(importAction);
fileMenu.addAction(new CAction("Save"));
fileMenu.addSeparator();
fileMenu.addAction(new CAction("Exit"));

const editMenu = new CMenu();
editMenu.addAction(new CAction("Undo"));
editMenu.addAction(new CAction("Redo"));
editMenu.addSeparator();
editMenu.addAction(new CAction("Cut"));
editMenu.addAction(new CAction("Copy"));
editMenu.addAction(new CAction("Paste"));

const viewMenu = new CMenu();

// View -> Dark theme changes the CSS variables and updates existing windows.
const darkThemeAction = new CAction("Dark theme", mainWindow);
darkThemeAction.setCheckable(true);
darkThemeAction.setChecked(document.documentElement.getAttribute("data-ct-theme") === "dark");
darkThemeAction.triggered.connect(() => {
    const theme = darkThemeAction.isChecked() ? "dark" : "light";
    document.documentElement.setAttribute("data-ct-theme", theme);
    settings.setValue("theme", theme);
    cssPalette.reload();
    app.setPalette(cssPalette);
});
viewMenu.addAction(darkThemeAction);
viewMenu.addSeparator();

const showGridAction = new CAction("Show grid", mainWindow);
showGridAction.setShortcut("Ctrl+G");
showGridAction.setCheckable(true);
showGridAction.setChecked(true);

viewMenu.addAction(showGridAction);
viewMenu.addSeparator();

const iconGridDemoAction = new CAction("Icon grid demo…", mainWindow);
iconGridDemoAction.triggered.connect(() => showIconGridDemo(parent));
viewMenu.addAction(iconGridDemoAction);

const imageViewDemoAction = new CAction("Image viewer demo…", mainWindow);
imageViewDemoAction.triggered.connect(() => showImageViewDemo(parent));
viewMenu.addAction(imageViewDemoAction);

const panelsMenu = new CMenu();
panelsMenu.addAction(new CAction("Properties"));
panelsMenu.addAction(new CAction("Inspector"));
panelsMenu.addAction(new CAction("Console"));

viewMenu.addMenu("Panels", panelsMenu);

const toolsMenu = new CMenu();
const splitButtonDemoAction = new CAction("Split button demo…", mainWindow);
splitButtonDemoAction.triggered.connect(() => showSplitButtonDemo(parent));
toolsMenu.addAction(splitButtonDemoAction);
toolsMenu.addAction(new CAction("Options"));
toolsMenu.addAction(new CAction("Customize"));
toolsMenu.addSeparator();
const wizardDemoAction = new CAction("Wizard demo…", mainWindow);
wizardDemoAction.triggered.connect(() => showWizardDemo(parent));
toolsMenu.addAction(wizardDemoAction);
const logoAnimationDemoAction = new CAction("CT logo animation…", mainWindow);
logoAnimationDemoAction.triggered.connect(() => showLogoAnimationDemo(parent));
toolsMenu.addAction(logoAnimationDemoAction);

const helpMenu = new CMenu();
helpMenu.addAction(new CAction("Documentation"));
helpMenu.addSeparator();
const aboutToolkitAction = new CAction("About Canvas Toolkit…", mainWindow);
aboutToolkitAction.triggered.connect(() => showAboutCanvasToolkit(parent));
helpMenu.addAction(aboutToolkitAction);

menuBar.addMenu("File", fileMenu);
menuBar.addMenu("Edit", editMenu);
menuBar.addMenu("View", viewMenu);

menuBar.addSeparator();

menuBar.addMenu("Tools", toolsMenu);
menuBar.addMenu("Help", helpMenu);

const statusBar = new CStatusBar();
mainWindow.setStatusBar(statusBar);

const left = new CLabel(null);
left.setText("Ready");
const permanent = new CLabel(null);
permanent.setText("INS");

statusBar.addWidget(left);
statusBar.addPermanentWidget(permanent);

// Demo actions report activation without creating or opening files.
newAction.triggered.connect(() => statusBar.showMessage("New action triggered", 3000));
openAction.triggered.connect(() => statusBar.showMessage("Open action triggered", 3000));
showGridAction.toggled.connect(checked => statusBar.showMessage(
    `Show grid: ${checked ? "on" : "off"}`, 3000));
statusBar.showMessage("Open File or View to see keyboard shortcuts", 5000);
statusBar.setGeometry(700, 776, 300, 24);

const dragSource = new DragSourceWidget(parent);
dragSource.setGeometry(360, 640, 120, 50);

const dropTarget = new DropTargetWidget(parent);
dropTarget.setGeometry(500, 640, 180, 50);

const dock = new CDockWidget("Properties");
const dockContent = new CWidget();

const dockLabel = new CLabel(dockContent);
dockLabel.setText("Dock widget");
//dockLabel.setGeometry(10, 10, 80, 24);

const floatButton = new CPushButton(dockContent);
floatButton.setText("Float");
floatButton.setGeometry(10, 45, 60, 30);

dock.setWidget(dockContent);

mainWindow.addDockWidget(CDockWidgetArea.Right, dock);
const toolBar1 = new CToolBar();
//toolBar1.setGeometry(0, 0, 500, 120);
toolBar1.setExtent(45);

// Share actions between the menu and toolbar, including their keyboard bindings.
toolBar1.addAction(newAction);
toolBar1.addAction(openAction);
mainWindow.addToolBar(CToolBarArea.Top, toolBar1);

floatButton.clicked.connect(() => {
	mainWindow.setDockWidgetFloating(dock, !dock.isFloating());

	floatButton.setText(
		dock.isFloating() ? "Dock" : "Float"
	);
});

const dial = new CDial(parent); // oziroma tvoj root widget
dial.setGeometry(420, 250, 120, 120);
dial.setRange(0, 200);
dial.setValue(50);

const tb = new CTextBrowser(parent);
tb.setGeometry(460, 480, 200, 150);
tb.setHtml('<h2>Canvas Toolkit</h2><p>This is <b>CTextBrowser</b>.<br/>Visit <a href="https://example.com">our website</a>.</p>');

app.startUpdates();

setInterval(() => {
	if (pb.value() < 100)
		pb.setValue(pb.value() + 1)
}, 50);

//mainWindow.hide();

const splash = new CSplashScreen(createSplashPixmap());
splash.showMessage(
	"Nalagam …",
	CAlignment.Left | CAlignment.Bottom,
	"#ffffff"
);
splash.show();

setTimeout(() => {
	splash.finish(mainWindow, 1000);
}, 2000);



}

void loadToolkitLogo().then(startDemo).catch((error: unknown) => {
    console.error("Canvas Toolkit demo failed to start:", error);
});
