import { Button, Pin, } from "johnny-five";

type Direction = "Clockwise" | "Counterclockwise" | "";

interface MedicalEncoderOptions {
  pinout: { a: number; b: number; z?: number };
  onLeft?: () => void;
  onRight?: () => void;
  onChange?: (stepCount: number, currentDir: Direction) => void;
  onFullRotation?: (rotationCount: number) => void;
}

export class MedicalEncoder {
  private pinA: Button;
  private pinB: Button;
  private pinZ?: Pin;

  private stateA = 0;
  private stateB = 0;
  private lastEncoded = 0;
  private lastZState = 0;

  stepCount = 0;
  fullRotations = 0;
  currentDir: Direction = "";
  private lastChangeTime = 0;
  encodedHist
  private histA: number[] = [];
  private histB: number[] = [];
  private onLeft?: () => void;
  private onRight?: () => void;
  private onChange?: (stepCount: number, currentDir: Direction) => void;
  private onFullRotation?: (rotationCount: number) => void;
  private lastChangedPin: "A" | "B" | null = null;
  constructor({ pinout, onLeft, onRight, onChange, onFullRotation }: MedicalEncoderOptions) {
    this.pinA = new Button(pinout.a);
    this.pinB = new Button(pinout.b);

    this.onLeft = onLeft;
    this.onRight = onRight;
    this.onChange = onChange;
    this.onFullRotation = onFullRotation;

    if (pinout.z) {
      // this.pinZ = new Pin(pinout.z);
      // this.startZMonitoring();
    }

    this.pinA.on("down", () => {
      this.stateA = 1;
      this.lastChangedPin = "A";
      this.handleChange();
    });
    this.pinA.on("up", () => {
      this.stateA = 0;
      this.lastChangedPin = "A";
      this.handleChange();
    });
    this.pinB.on("down", () => {
      this.stateB = 1;
      this.lastChangedPin = "B";
      this.handleChange();
    });
    this.pinB.on("up", () => {
      this.stateB = 0;
      this.lastChangedPin = "B";
      this.handleChange();
    });
    this.pinZ?.on("data", (data) => {
      console.log(`Z:${data}`);

    })
  }

  private handleChange() {
    const now = Date.now();
    if (now - this.lastChangeTime < 100) return; // debounce
    this.lastChangeTime = now;

    // Only count when both are low (detent)
    if (this.stateA === 0 && this.stateB === 0 && this.lastChangedPin) {
      if (this.lastChangedPin === "A") {
        this.stepCount++;
        this.currentDir = "Clockwise";
        this.onRight?.();
      } else if (this.lastChangedPin === "B") {
        this.stepCount--;
        this.currentDir = "Counterclockwise";
        this.onLeft?.();
      }
      this.onChange?.(this.stepCount, this.currentDir);
      this.lastChangedPin = null; // Reset for next detent
    }
  }

  private startZMonitoring() {
    if (!this.pinZ) return;

    setInterval(() => {
      this.pinZ!.query((state) => {
        const currentZ = state.value;
        if (this.lastZState === 0 && currentZ === 1) {
          // Rising edge detected
          this.fullRotations++;
          this.onFullRotation?.(this.fullRotations);
        }
        this.lastZState = currentZ;
      });
    }, 1); // adjust interval as needed
  }
}
