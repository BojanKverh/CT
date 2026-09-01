import { CSignal } from "../core/CSignal.js";
import { CColor } from "../gui/CColor.js";
import { CVBoxLayout } from "../layouts/CVBoxLayout.js";
import { CHBoxLayout } from "../layouts/CHBoxLayout.js";
import { CFormLayout } from "../layouts/CFormLayout.js";
import { CLineEdit } from "../widgets/CLineEdit.js";
import { CSpinBox } from "../widgets/CSpinBox.js";
import { CWidget } from "../widgets/CWidget.js";
import { CDialog } from "./CDialog.js";
import { CLabel } from "../widgets/CLabel.js";
import { CDialogButtonBox, CStandardButton } from "./CDialogButtonBox.js";
import { CPaletteColorRole } from "../gui/CPalette.js";

export class CColorDialog extends CDialog
{
	static readonly DefaultWidth = 360;
	static readonly DefaultHeight = 240;
	static readonly Margin = 12;
	static readonly Spacing = 6;

	readonly currentColorChanged = new CSignal<[CColor]>();
	readonly colorSelected = new CSignal<[CColor]>();

	#m_color: CColor;

	#m_redSpinBox: CSpinBox;
	#m_greenSpinBox: CSpinBox;
	#m_blueSpinBox: CSpinBox;
	#m_hexEdit: CLineEdit;
    #m_display: CLabel;

	#m_buttonBox: CDialogButtonBox;

	#m_updating = false;

	constructor(
		color = new CColor(0, 0, 0),
		parent: CWidget | null = null
	) {
		super(parent);

        this.#m_color = new CColor(color.red(), color.green(), color.blue(), color.alpha());

		this.#m_redSpinBox = this.#createSpinBox(color.red());
		this.#m_greenSpinBox = this.#createSpinBox(color.green());
		this.#m_blueSpinBox = this.#createSpinBox(color.blue());

		this.#m_hexEdit = new CLineEdit(this);
        this.#m_hexEdit.setMaximumSize(80, 30);

		this.#m_buttonBox = new CDialogButtonBox(CStandardButton.Ok | CStandardButton.Cancel, this);

		const layout = new CVBoxLayout();

		layout.setContentsMargins(CColorDialog.Margin, CColorDialog.Margin,
			CColorDialog.Margin, CColorDialog.Margin);

		layout.setSpacing(CColorDialog.Spacing);

        const hbox = new CHBoxLayout();

        const form = new CFormLayout;
        form.addRow("Red:", this.#m_redSpinBox);
        form.addRow("Green:", this.#m_greenSpinBox);
        form.addRow("Blue:", this.#m_blueSpinBox);
        form.addRow("Hex:", this.#m_hexEdit);
        hbox.addLayout(form);
        this.#m_display = new CLabel(this);
        this.#m_display.setMinimumSize(80, 80);
        this.#m_display.setMaximumSize(80, 80);
        hbox.addWidget(this.#m_display);
        hbox.addStretch(1);
        
        layout.addLayout(hbox);
		layout.addStretch(1);
		layout.addWidget(this.#m_buttonBox);

		this.setLayout(layout);

		this.#m_redSpinBox.valueChanged.connect(() =>
		{
			this.#updateFromRgb();
		});

		this.#m_greenSpinBox.valueChanged.connect(() =>
		{
			this.#updateFromRgb();
		});

		this.#m_blueSpinBox.valueChanged.connect(() =>
		{
			this.#updateFromRgb();
		});

		this.#m_hexEdit.textChanged.connect(text =>
		{
			this.#updateFromHex(text);
		});

		this.#m_buttonBox.accepted.connect(() =>
		{
			this.colorSelected.emit(this.#m_color);
			this.accept();
		});

		this.#m_buttonBox.rejected.connect(() =>
		{
			this.reject();
		});

		this.resize(CColorDialog.DefaultWidth, CColorDialog.DefaultHeight);
        this.#setColor(this.#m_color);
	}

	currentColor(): CColor {
	    return new CColor(this.#m_color.red(), this.#m_color.green(), this.#m_color.blue(), 
            this.#m_color.alpha());
	}

	setCurrentColor(color: CColor): void {
		if (this.#m_color.equals(color))
			return;

		this.#setColor(color);
		this.currentColorChanged.emit(this.currentColor());
	}

	static getColor(
		initial: CColor,
		parent: CWidget | null = null
	): Promise<CColor | null>
	{
		return new Promise(resolve =>
		{
			const dialog = new CColorDialog(
				initial,
				parent
			);

			dialog.accepted.connect(() =>
			{
				resolve(dialog.currentColor());
			});

			dialog.rejected.connect(() =>
			{
				resolve(null);
			});

			dialog.exec();
		});
	}

	#createSpinBox(value: number): CSpinBox {
		const spinBox = new CSpinBox(this);

		spinBox.setRange(0, 255);
		spinBox.setValue(value);
        spinBox.setMinimumSize(60, 30);
        
		return spinBox;
	}

	#updateFromRgb(): void {
		if (this.#m_updating)
			return;

		const color = new CColor(
			this.#m_redSpinBox.value(),
			this.#m_greenSpinBox.value(),
			this.#m_blueSpinBox.value()
		);

        this.#setColor(color);
		this.currentColorChanged.emit(color);
	}

	#updateFromHex(text: string): void {
		if (this.#m_updating)
			return;

		const color = CColorDialog.#fromHex(text);

		if (color === null)
			return;

        this.#setColor(color);
		this.currentColorChanged.emit(color);
	}

	#setColor(color: CColor): void {
		this.#m_updating = true;

		this.#m_color = new CColor(color.red(), color.green(), color.blue(), color.alpha());

        if (color.red() !== this.#m_redSpinBox.value())
		    this.#m_redSpinBox.setValue(color.red());
        if (color.green() !== this.#m_greenSpinBox.value())
		    this.#m_greenSpinBox.setValue(color.green());
        if (color.blue() !== this.#m_blueSpinBox.value())
		    this.#m_blueSpinBox.setValue(color.blue());
        if (color.toHex() !== this.#m_hexEdit.text())
		    this.#m_hexEdit.setText(color.toHex());

        let pal = this.#m_display.palette();
        pal.setColor(CPaletteColorRole.Base, color);
        this.#m_display.setPalette(pal);
		
		this.#m_updating = false;
	}

    static #fromHex(text: string): CColor | null {
		if (!/^#[0-9a-fA-F]{6}$/.test(text))
			return null;

		return new CColor(
			parseInt(text.substring(1, 3), 16),
			parseInt(text.substring(3, 5), 16),
			parseInt(text.substring(5, 7), 16)
		);
	}
}