import { Board, Pin } from "johnny-five";
const SUBCMD_INIT = 0x01;
const SUBCMD_READ = 0x02;


const HX711_DATA = 0x1C
export class HX711 {
    private _dataPin: Pin;
    private _clockPin: Pin;
    private _gain: number;
    private _gainPulses: number;
    private _rawValue: number = 0; // Last raw value read
    // private _rawValue: number = 0; // Last raw value read
    private _offset = 0;   // Used for taring (zero offset)
    private _scale = 1;    // Used to convert raw reading to meaningful units (e.g. grams or Newtons)
    board: Board;
    constructor(dataPin: number, clockPin: number, gain: number = 128, baord: Board) {
        this.board = baord
        this._dataPin = new Pin({ pin: dataPin, board: baord });
        this._clockPin = new Pin({ pin: clockPin, board: baord });
        this._dataPin.mode = Pin.INPUT
        this._clockPin.mode = Pin.OUTPUT
       
        this.setGain(gain);
      
        this.board.io.sysexResponse(HX711_DATA, (data: number[]) => {
            if (data.length >= 6) {
                const b0 = data[1];
                const b1 = data[2];
                const b2 = data[3];
                const b3 = data[4];
                const b4 = data[5];

                let unsigned = (b4 << 28) | (b3 << 21) | (b2 << 14) | (b1 << 7) | b0;
                let signed = (unsigned >> 0);
                // Convert from unsigned to signed

                this._rawValue = signed; // Store the raw value
                console.log('RAW:' + signed)
            }
        })
        this.tare()
    }

    setGain(gain: number): void {
        this._gain = gain;
        switch (gain) {
            case 128:
                this._gainPulses = 1;
                break;
            case 64:
                this._gainPulses = 3;
                break;
            case 32:
                this._gainPulses = 2;
                break;
            default:
                throw new Error("Invalid gain. Use 128, 64, or 32.");
        }
    }

    async tare(): Promise<void> {

        await this.waitForReady();
        console.log("Taring HX711...");
        
        // this._offset = this._rawValue; // Store the current raw value as offset
        this.board.io.sysexCommand([HX711_DATA, SUBCMD_INIT, this._dataPin.pin, this._clockPin.pin]);
    }

    setScale(scale: number): void {
        this._scale = scale / 11.3;
        console.log(`Scale set to: ${this._scale}`);
    }
    calibrate(rawValue) {
        // this.setScale
        console.log(`Raw value: ${rawValue}`);
        let calibratedVal =  (rawValue - this._offset) / this._scale;
        console.log(`Calibrated value: ${calibratedVal}`);
        return calibratedVal;
    }
    getWeight() {
        console.log("Reading weight...");
        this.board.io.sysexCommand([HX711_DATA, SUBCMD_READ, this._dataPin.pin, this._clockPin.pin]);
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

    read(): Promise<number> {
        // console.log("Reading HX711...");
        return new Promise((resolve, reject) => {
            this._readRaw([]).then((value) => {
                resolve(value);
            }).catch(err => {
                console.error("Error reading HX711:", err);
                reject(err);
            });
        })
    }

    private async _readRaw(bitArray: number[]): Promise<number> {
        // Ensure HX711 is ready
        let value = 0;

        for (let i = 0; i < bitArray.length; i++) {
            this._clockPin.high();
            await new Promise(r => setTimeout(r, 1)); // Short pulse
            let bit: number = 1;
            // bit = await this._readBit();
            bit = bitArray[i];
            value = (value << 1) | bit;
            this._clockPin.low();
            await new Promise(r => setTimeout(r, 1)); // Settle time
        }

        // Final gain-setting pulses
        for (let i = 0; i < this._gainPulses; i++) {
            this._clockPin.high();
            await new Promise(r => setTimeout(r, 1));
            this._clockPin.low();
            await new Promise(r => setTimeout(r, 1));
        }
        console.log(`Raw value read: ${value}`);

        // Convert to signed 32-bit int
        if (value & 0x800000) {
            value |= 0xFF000000; // Sign extend to 32-bit signed
        }



        return value;
    }

    private _pulseClock(): Promise<void> {
        return new Promise((resolve) => {
            this._clockPin.high();
            setTimeout(() => {
                this._clockPin.low();
                setTimeout(resolve, 1); // 1ms
            }, 1); // 1ms
        });
    }

    private _readBit(): Promise<number> {
        return new Promise((resolve) => {
            const pinNumber = this._dataPin.pin; // or use _dataPin.addr if needed
            const event = `digital-read-${pinNumber}`;
            const handler = (val: number) => {
                if (val === undefined) {
                    console.error(`Error reading pin ${pinNumber}: value is undefined`);
                    resolve(0); // Default to 0 if read fails
                    return;
                }
                resolve(val);
                this.board.io.removeListener(event, handler); // Prevent leak!
            };

            this.board.io.digitalRead(pinNumber, handler);
        });
    }
}
