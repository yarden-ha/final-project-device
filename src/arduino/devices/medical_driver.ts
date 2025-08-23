import { Board, Pin } from "johnny-five"
import { MedicalDevice, unpackByte } from "../medical_board"

enum DIRECTION {
    CLOCK_WISE = 1,
    COUNTER_CLOCK_WISE = 2
}

const MOTOR_DATA = 0x1E
const SUBCMD_INIT = 0x01;
const MOVE_INIT = 0x02;
const STOP_INIT = 0x03;
const DIR_FLIP = 0x04;

function encodeTo7BitArray(value) {
    return [value & 0x7F, (value >> 7) & 0x7F];
}
export class MedicalDriver implements MedicalDevice {
    private step: Pin
    private dir: Pin
    private fault: Pin
    private board: Board;
    public rpm: number = 0;
    constructor(pins: { step: number, dir: number, fault: number }, stepsPerRev: number = 200, board: Board) {
        this.step = new Pin(pins.step)
        this.dir = new Pin(pins.dir)

        if (pins.fault) this.fault = new Pin(pins.fault)

        this.board = board

        this.board.io.sysexCommand([MOTOR_DATA, SUBCMD_INIT, this.step.pin, this.dir.pin, this.fault.pin]);
        this.board.io.sysexResponse(MOTOR_DATA, (data: number[]) => {
            const subcmd = unpackByte(data[0], data[1]); // First byte is the subcommand
            if (subcmd === MOVE_INIT) {
                // Arduino sends back in the order delay, spins
                const b0 = unpackByte(data[3], data[2]);
                const b1 = unpackByte(data[4], data[5]);
                let delay = b1 + b0;
                console.log(data);
                console.log(`Received from Arduino - Delay: ${delay},`);
            }
            else if (subcmd === DIR_FLIP) {
                // Arduino sends back in the order delay, spins
                console.log('changed direction')

            }
        })


        this.fault.on("data", (value) => {
            console.log(value)
        })

    }
    calculateStepperRPM(motorDelay, stepsPerRev, microstepping) {
        const pulsesPerRev = stepsPerRev * microstepping;
        const pulsesPerSecond = 1_000_000 / (2 * motorDelay);
        const rpm = (pulsesPerSecond / pulsesPerRev) * 60;
        return rpm;
    }


    sendMoveCommand(delay: number) {

        delay = Math.min(delay, 0xFFFF);

        this.rpm = this.calculateStepperRPM(delay, 200, 16);

        const delayLow7 = delay & 0x7F;
        const delayHigh7 = (delay >> 7) & 0x7F;

        console.log(`Sending command to Arduino - Delay: ${delay}`);
        console.log([
            MOTOR_DATA,
            MOVE_INIT,
            delayLow7,
            delayHigh7
        ]);

        this.board.io.sysexCommand([
            MOTOR_DATA,
            MOVE_INIT,
            delayLow7,
            delayHigh7
        ]);

    }

    sendStopCommand() {
        this.board.io.sysexCommand([
            MOTOR_DATA,
            STOP_INIT,
        ]);
    }

    flipDirection() {
        this.board.io.sysexCommand([MOTOR_DATA, DIR_FLIP]);
    }
}

