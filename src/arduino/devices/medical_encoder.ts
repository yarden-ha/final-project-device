import { Board, Button, Pin } from "johnny-five";

const READ_INTERVAL = 200; // ms
const SAMPLE_WINDOW = 3;
type Direction = "Clockwise" | "Counterclockwise" | "";

interface MedicalEncoderOptions {
  pinout: { a: number; b: number; z?: number };
  onLeft?: () => void;
  onRight?: () => void;
  onChange?: (stepCount: number, currentDir: Direction) => void;
  onFullRotation?: (rotationCount: number) => void;
}


const transitionTable = {
  0b0001: 1, // 00 → 01
  0b0010: -1, // 00 → 10
  0b0011: 0, // 00 → 11 (invalid)

  0b0100: 1, // 01 → 00
  0b0111: -1, // 01 → 11
  0b0110: 0, // 01 → 10 (invalid)

  0b1000: -1, // 10 → 00
  0b1011: 1, // 10 → 11
  0b1010: 0, // 10 → 01 (invalid)

  0b1101: -1, // 11 → 01
  0b1110: 1, // 11 → 10
  0b1100: 0, // 11 → 00 (invalid)
};


export class MedicalEncoder {
  private pinA: Pin;
  private pinB: Pin;
  private pinZ?: Pin;

  private stateA = 0;
  private stateB = 0;
  private lastZState = 0;
  private lastState = 0;

  stepCount = 0;
  fullRotations = 0;
  currentDir: Direction = "";
  private lastChangeTime = 0;

  private history: { a: number; b: number; time: number }[] = [];
  private lastA = 0;
  private lastB = 0;
  private onLeft?: () => void;
  private onRight?: () => void;
  private onChange?: (stepCount: number, currentDir: Direction) => void;
  private onFullRotation?: (rotationCount: number) => void;
  private lastChangedPin: "A" | "B" | null = null;

  private mUtEx = 0

  private cw = 0
  private ccw = 0
  lastATime: number;
  lastBTime: number;
  lastEncoded: number;

  constructor({ pinout, onLeft, onRight, onChange, onFullRotation }: MedicalEncoderOptions, board: Board) {
    this.pinA = new Pin(pinout.a);
    this.pinB = new Pin(pinout.b);
    this.pinA.mode = Pin.INPUT
    this.pinB.mode = Pin.INPUT
    this.onLeft = onLeft;
    this.onRight = onRight;
    this.onChange = onChange;
    this.onFullRotation = onFullRotation;

    if (pinout.z) {
      this.pinZ = new Pin(pinout.z);
      this.pinZ.mode = Pin.INPUT
      this.startZMonitoring();
    }



    board.io.digitalRead(pinout.a, val => {
      this.stateA = val;
      this.handleChange();
    });

    board.io.digitalRead(pinout.b, val => {
      this.stateB = val;
      this.handleChange();
    });

    this.pinZ?.on("data", (data) => {
      console.log(`Z: ${data}`);
    });

  }


  private handleChange() {
     console.log(`A:${this.stateA} B:${this.stateB}`);
     
    const encoded = (this.stateA << 1) | this.stateB;
    const sum = (this.lastEncoded << 2) | encoded;
    const dir = transitionTable[sum] ?? 0;

    if (dir === 1) {
      this.cw++;
      this.ccw = 0;
    } else if (dir === -1) {
      this.ccw++;
      this.cw = 0;
    }

    const threshold = 4;

    if (this.cw >= threshold) {
      this.currentDir = "Clockwise";
      this.stepCount++;
      this.onRight?.();
      this.onChange?.(this.stepCount, this.currentDir);
      this.cw = 0;
    } else if (this.ccw >= threshold) {
      this.currentDir = "Counterclockwise";
      this.stepCount--;
      this.onLeft?.();
      this.onChange?.(this.stepCount, this.currentDir);
      this.ccw = 0;
    }

    this.lastEncoded = encoded;
    this.lastEncoded = encoded;

  }

  private startZMonitoring() {
    if (!this.pinZ) return;

    setInterval(() => {
      this.pinZ!.query((state) => {
        const currentZ = state.value;
        if (this.lastZState === 0 && currentZ === 1) {
          this.fullRotations++;
          this.onFullRotation?.(this.fullRotations);
        }
        this.lastZState = currentZ;
      });
    }, 1);
  }
}
