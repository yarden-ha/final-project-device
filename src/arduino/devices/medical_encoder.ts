import { Button, Pin } from "johnny-five";

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

  constructor({ pinout, onLeft, onRight, onChange, onFullRotation }: MedicalEncoderOptions) {
    this.pinA = new Pin(pinout.a);
    this.pinB = new Pin(pinout.b);
    // this.pinA.mode = Pin.INPUT
    // this.pinB.mode = Pin.INPUT
    this.onLeft = onLeft;
    this.onRight = onRight;
    this.onChange = onChange;
    this.onFullRotation = onFullRotation;

    if (pinout.z) {
      this.pinZ = new Pin(pinout.z);
      this.pinZ.mode = Pin.INPUT
      this.startZMonitoring();
    }
    this.pinA.read((errA: any, valueA: number) => {
      this.stateA = valueA;
      this.lastATime = Date.now();
      this.handleChange();
    });
    this.pinB.read((errB: any, valueB: number) => {
      this.stateB = valueB;
      this.lastBTime = Date.now();
      this.handleChange();
    });


    this.pinZ?.on("data", (data) => {
      console.log(`Z: ${data}`);
    });

    // Start periodic direction analysis
    // setInterval(() => this.analyzeBufferedSteps(), READ_INTERVAL);
  }
  handleA() {
    const now = Date.now();
    if (now - this.lastChangeTime < READ_INTERVAL) return; // Ignore changes faster than 2ms
    this.lastChangeTime = now;
    let a = this.stateA;
    let b = this.stateB;
    if (a == this.lastA && b == this.lastB) return;
    if (this.mUtEx === 0) {
      this.mUtEx = 1;
      if (a === b) {
        this.stepCount++;
        this.currentDir = "Clockwise";
        this.onRight?.();
      } else {
        this.stepCount--;
        this.currentDir = "Counterclockwise";
        this.onLeft?.();
      }
      this.onChange?.(this.stepCount, this.currentDir);
      this.lastA = a;
      this.lastB = b;
      this.mUtEx = 0;
    }
  }

  handleB() {
    const now = Date.now();
    if (now - this.lastChangeTime < READ_INTERVAL) return; // Ignore changes faster than 2ms
    this.lastChangeTime = now;
    let a = this.stateA;
    let b = this.stateB;
    if (a == this.lastA && b == this.lastB) return;
    if (this.mUtEx === 0) {
      this.mUtEx = 1;
      if (a !== b) {
        this.stepCount++;
        this.currentDir = "Clockwise";
        this.onRight?.();
      } else {
        this.stepCount--;
        this.currentDir = "Counterclockwise";
        this.onLeft?.();
      }
      this.onChange?.(this.stepCount, this.currentDir);
      this.lastA = a;
      this.lastB = b;
      this.mUtEx = 0;
    }
  }
  private handleChange() {
    const a = this.stateA;
    const b = this.stateB;
    const now = Date.now();
    // Only process if state changed
    if (a === this.lastA && b === this.lastB) return;
    if (Math.abs(this.lastATime - this.lastBTime) > SAMPLE_WINDOW) return;
    // Determine which pin changed
    let direction: Direction = "";

    if (this.lastATime > this.lastBTime) {
      // A changed last
      if (a === b) {
        this.stepCount++;
        direction = "Clockwise";
        this.onRight?.();
      } else {
        this.stepCount--;
        direction = "Counterclockwise";
        this.onLeft?.();
      }
    } else if (this.lastBTime > this.lastATime) {
      // B changed last
      if (a !== b) {
        this.stepCount++;
        direction = "Clockwise";
        this.onRight?.();
      } else {
        this.stepCount--;
        direction = "Counterclockwise";
        this.onLeft?.();
      }
    } else {
      // Times are equal, ambiguous, ignore
      return;
    }

    if (direction) {
      this.currentDir = direction;
      this.onChange?.(this.stepCount, this.currentDir);
    }

    this.lastA = a;
    this.lastB = b;

  }

  private analyzeBufferedSteps() {
    if (this.history.length < 2) return;
    let delta = 0;

    for (let i = 1; i < this.history.length; i++) {
      // console.log(this.history[i]);
      let lastA = this.history[i - 1].a
      let lastB = this.history[i - 1].b
      let lastTime = this.history[i - 1].time
      let { a, b, time } = this.history[i]
      // const prev = (this.history[i - 1].a << 1) | this.history[i - 1].b;
      // const curr = (this.history[i].a << 1) | this.history[i].b;
      // const transition = (prev << 2) | curr;


      // // Quadrature direction lookup table
      // const directionMap = [0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0];
      // const dir = directionMap[transition & 0x0f];

      // // console.log(`Transition ${i - 1} → ${i}: ${prev} → ${curr} → ${dir}`);
      // delta += dir;
    }

    if (delta !== 0) {
      const direction = delta > 0 ? "Clockwise" : "Counterclockwise";
      this.stepCount += Math.abs(delta); // count positive steps only

      this.currentDir = direction;

      if (direction === "Clockwise") this.onRight?.();
      else this.onLeft?.();

      this.onChange?.(this.stepCount, this.currentDir);
    }
    this.history = []; // Clear buffer after processing
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
