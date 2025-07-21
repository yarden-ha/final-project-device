import { Board, Pin } from "johnny-five";
import { unpackByte } from "../medical_board";
const SUBCMD_INIT = 0x01;
const SUBCMD_READ = 0x02;
const SUBCMD_SET_SCALE = 0x03;
const SUBCMD_TARE = 0x04;

// const Weight: 90451
// const Scale set to: 44.579103006407095
// const Set scale for sensor: force to 2029
const HX711_DATA = 0x1C

export class HX711 {
    private _dataPin: Pin; 
    private _clockPin: Pin;

    private _rawValue: number = 0;  // Last raw value read
    private _offset = 860;            // Used for taring (zero offset)
    private _scale = 35//30.895454545454545;         // Used to convert raw reading to meaningful units (e.g. grams or Newtons)
    private board: Board;
    private readInterval: NodeJS.Timeout;
    private readSpeed = 100;

    constructor(dataPin: number, clockPin: number, gain: number = 128, baord: Board) {
        this.board = baord
        this._dataPin = new Pin({ pin: dataPin, board: baord });
        this._clockPin = new Pin({ pin: clockPin, board: baord });
        this._dataPin.mode = Pin.INPUT
        this._clockPin.mode = Pin.OUTPUT

        this.board.io.sysexCommand([HX711_DATA, SUBCMD_INIT, this._dataPin.pin, this._clockPin.pin]);
        this.readInterval = setInterval(() => {
            this.board.io.sysexCommand([HX711_DATA, SUBCMD_READ, this._dataPin.pin, this._clockPin.pin]);
        }, this.readSpeed)
        this.board.io.sysexResponse(HX711_DATA, (data: number[]) => {

            const subcmd = unpackByte(data[0], data[1]);

            switch (subcmd) {
                case SUBCMD_READ:
                    const b0 = unpackByte(data[2], data[3]);
                    const b1 = unpackByte(data[4], data[5]);
                    const b2 = unpackByte(data[6], data[7]);
                    const b3 = unpackByte(data[8], data[9]);
                    const sign = unpackByte(data[10], data[11]);
                    let value = (b3 << 24) | (b2 << 16) | (b1 << 8) | b0;
                    if (sign === 1) value = -value;
                    this._rawValue = value
                    break;
            }
        })
    } 

    async tare(val?: number): Promise<void> {

        await this.waitForReady();
        if (val) {
            console.log("Setting offset HX711..."); 
            this._offset = val
        } else {
            console.log("Taring HX711..."); 
            console.log(this._rawValue)
            this._offset = this.calibrate(this._rawValue); // Store the current raw value as offset
        }
    }

    setScale(scale: number): void {

        this._scale = this._rawValue / scale;
        console.log(`Scale set to: ${this._scale}`);
    }
    calibrate(rawValue) {
        // this.setScale
        // console.log(`Raw value: ${rawValue} scale: ${this._scale} offset: ${this._offset}`);
        let calibratedVal = ((rawValue) / this._scale) - this._offset;
        if (calibratedVal < 0) calibratedVal = calibratedVal * -1
        // console.log(`Calibrated value: ${calibratedVal}`);
        return calibratedVal;
    }
    getWeight(): Promise<number> {
        // console.log("Reading weight...");
        return new Promise((resolve, reject) => {
            resolve(this.calibrate(this._rawValue));
        });
    }
    waitForReady(): Promise<void> {
        return new Promise((resolve) => {
            const check = () => {
                this._dataPin.query((state) => {
                    if (state.value === 0) {
                        resolve();
                    } else {
                        setTimeout(check, 1); // check again soon
                    }
                });
            };
            check();
        });
    }
}
