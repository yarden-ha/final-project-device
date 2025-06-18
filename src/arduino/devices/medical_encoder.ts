import { Button } from "johnny-five";

type Direction = "Clockwise" | "Counterclockwise" | "";

interface MedicalEncoderOptions {
    pinout: { a: number; b: number };
    onLeft?: () => void;
    onRight?: () => void;
    onChange?: (stepCount: number, currentDir: Direction) => void;
}

export class MedicalEncoder {
    private pinA: Button;
    private pinB: Button;

    private stateA = 0;
    private stateB = 0;
    private lastEncoded = 0;

    stepCount = 0;
    currentDir: Direction = "";
    private lastChangeTime = 0;
    private onLeft?: () => void;
    private onRight?: () => void;
    private onChange?: (stepCount: number, currentDir: Direction) => void;

    constructor({ pinout, onLeft, onRight, onChange }: MedicalEncoderOptions) {
        this.pinA = new Button(pinout.a);
        this.pinB = new Button(pinout.b);

        this.onLeft = onLeft;
        this.onRight = onRight;
        this.onChange = onChange;

        this.pinA.on("up", () => this.handleChange("a", 0));
        this.pinA.on("down", () => this.handleChange("a", 1));
        this.pinB.on("up", () => this.handleChange("b", 0));
        this.pinB.on("down", () => this.handleChange("b", 1));
    }

    private handleChange(pin: "a" | "b", value: number) {
        const now = Date.now();
        if (now - this.lastChangeTime < 15) {
            console.log('TIME')
            return;
        }
        this.lastChangeTime = now;
        if (pin === "a") this.stateA = value;
        else this.stateB = value;

        const MSB = this.stateA;
        const LSB = this.stateB;

        const encoded = (MSB << 1) | LSB;
        const sum = (this.lastEncoded << 2) | encoded;

        // Left steps (counterclockwise)
        if ([13, 4, 2, 11].includes(sum)) {
            this.stepCount--;
            this.currentDir = "Counterclockwise";
            this.onLeft?.();
        }

        // Right steps (clockwise)
        if ([14, 7, 1, 8].includes(sum)) {
            this.stepCount++;
            this.currentDir = "Clockwise";
            this.onRight?.();
        }

        this.lastEncoded = encoded;
        this.onChange?.(this.stepCount, this.currentDir);
    }
}
