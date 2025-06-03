import { Board, Pin } from "johnny-five";
const SUBCMD_INIT = 0x01;
const SUBCMD_READ = 0x02;
const SUBCMD_SET_SCALE = 0x03;
const SUBCMD_TARE = 0x04;


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
        this.board.io.sysexCommand([HX711_DATA, SUBCMD_INIT, this._dataPin.pin, this._clockPin.pin]);

        this.board.io.sysexResponse(HX711_DATA, (data: number[]) => {
            console.log("Received HX711 SYSEX:", data);

            if (data.find((byteVal) => byteVal === SUBCMD_READ)) {

                const unpackByte = (lsb, msb) => (lsb & 0x7F) | ((msb & 0x7F) << 7);

                const b0 = unpackByte(data[0], data[1]);
                const b1 = unpackByte(data[2], data[3]);
                const b2 = unpackByte(data[4], data[5]);
                const b3 = unpackByte(data[6], data[7]);
                const sign = unpackByte(data[8], data[9]);
                const subcmd = unpackByte(data[10], data[11]);

                let value = (b3 << 24) | (b2 << 16) | (b1 << 8) | b0;
                if (sign === 1) value = -value;
                this._rawValue = value
                console.log('RAW:' + this._rawValue)
            }
            if (data.find((byteVal) => byteVal === SUBCMD_SET_SCALE)) {
                // const b0 = data[0];
                // const b1 = data[1];
                // const b2 = data[2];
                // const b3 = data[3];
                // const b4 = data[4];
                // const sign = data[5];


                // let unsigned = (b4 << 28) | (b3 << 21) | (b2 << 14) | (b1 << 7) | b0;
                // let signed = sign === 0x01 ? -unsigned : unsigned;

                // this._rawValue = signed;
                // console.log('RAW:', signed);
                console.log('scaleSet')
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
        this.setScale(2000)
        this.board.io.sysexCommand([HX711_DATA, SUBCMD_TARE, this._dataPin.pin, this._clockPin.pin]);
        // this._offset = this._rawValue; // Store the current raw value as offset
    }

    setScale(scale: number): void {
        const floatArray = new Float32Array([scale]);
        const byteArray = new Uint8Array(floatArray.buffer);
        this.board.io.sysexCommand([
            HX711_DATA, SUBCMD_SET_SCALE, // subcommand
            byteArray[0], byteArray[1], byteArray[2], byteArray[3],
            this._dataPin, this._clockPin // optional, if needed by your protocol
        ]);

        console.log(`Scale set to: ${this._scale}`);
    }
    calibrate(rawValue) {
        // this.setScale
        console.log(`Raw value: ${rawValue}`);
        let calibratedVal = (rawValue - this._offset) / this._scale;
        console.log(`Calibrated value: ${calibratedVal}`);
        return calibratedVal;
    }
    getWeight() {
        console.log("Reading weight...");
        this.board.io.sysexCommand([HX711_DATA, SUBCMD_READ, this._dataPin.pin, this._clockPin.pin]);
        return new Promise((resolve, reject) => {
            resolve(this._rawValue);
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
