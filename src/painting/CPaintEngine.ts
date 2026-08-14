export abstract class CPaintEngine {
    abstract save(): void;
    abstract restore(): void;

    abstract translate(x: number, y: number): void;

    abstract fillRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void;

    abstract strokeRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void;

    abstract clearRect(
        x: number,
        y: number,
        width: number,
        height: number
    ): void;

    abstract setFillStyle(style: string): void;
    abstract setStrokeStyle(style: string): void;
    abstract setLineWidth(width: number): void;

    abstract clipRect(x: number, y: number, width: number,
		height: number): void;

    abstract font() : string;
    abstract setFont(font: string): void;
    abstract textAlign() : CanvasTextAlign;
    abstract setTextAlign(align: CanvasTextAlign) : void;
    abstract setTextBaseline(baseline: CanvasTextBaseline): void;
    abstract textBaseline() : CanvasTextBaseline;
    abstract fillText(text: string, x: number, y: number): void;
}