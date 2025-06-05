import { Board, Pin } from "johnny-five"
import { MedicalDevice } from "../medical_board"

enum DIRECTION {
    CLOCK_WISE = 1,
    COUNTER_CLOCK_WISE = 2
}

const MOTOR_DATA = 0x1E
const SUBCMD_INIT = 0x01;
const MOVE_INIT = 0x02;

export class MedicalDriver implements MedicalDevice {
    private step: Pin
    private dir: Pin
    private fault: Pin
    private board: Board;

    constructor(pins: { step: number, dir: number, fault: number }, stepsPerRev: number = 200, board: Board) {
        this.step = new Pin(pins.step)
        this.dir = new Pin(pins.dir)
        this.fault = new Pin(pins.fault)

        this.board = board

        this.board.io.sysexCommand([MOTOR_DATA, SUBCMD_INIT, this.step.pin, this.dir.pin, this.fault.pin]);


        this.dir.write(DIRECTION.CLOCK_WISE);

        this.fault.on("data", (value) => {
            console.log(value)
        })
    }

    sendMoveCommand(spins, delay = 51) {
        this.board.io.sysexCommand([MOTOR_DATA, MOVE_INIT, spins, delay]);
    }

    pulseStepPin(currentStep = 0, steps = 1000, delay = 1) {
        if (currentStep >= steps) {
            this.step.high()
            console.log("Done stepping.");
            return;
        }
        // this.step.write(1)
        // // Pulse: HIGH then LOW
        // // this.step.high();
        // this.board.wait(delay, () => { // 1 ms HIGH
        //     // this.step.low();
        // this.step.write(0)

        //     this.board.wait(1, () => { // 1 ms LOW
        //         currentStep++;
        //         this.pulseStepPin(currentStep);
        //     });
        // });
        for (currentStep; currentStep < steps; currentStep++) {
            this.step.write(1)
            let timeout = setTimeout(() => {
                //  this.step.write(0)
                clearTimeout(timeout)
            }, delay)
        }
        this.step.high()
        console.log('DONE')
    }

    public async moveToPosition(position: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.pulseStepPin(0, 200, position)
            resolve()
        })
    }
}

