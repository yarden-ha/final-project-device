import { Board, Pin } from "johnny-five"
import { MedicalDevice, unpackByte } from "../medical_board"

enum DIRECTION {
    CLOCK_WISE = 1,
    COUNTER_CLOCK_WISE = 2
}

const MOTOR_DATA = 0x1E
const SUBCMD_INIT = 0x01;
const MOVE_INIT = 0x02;
function encodeTo7BitArray(value) {
    return [value & 0x7F, (value >> 7) & 0x7F];
}
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
        this.board.io.sysexResponse(MOTOR_DATA, (data: number[]) => {
            const subcmd = data[0]; // First byte is the subcommand
            if (subcmd === MOVE_INIT) {
                // Arduino sends back in the order delay, spins
          const spins = (data[1] << 8) | data[2];
            const delay = (data[3] << 8) | data[4];
                console.log(data);
                console.log(`Received from Arduino - Delay: ${delay}, Spins: ${spins}`);
            }
        })

        this.dir.write(DIRECTION.CLOCK_WISE);

        this.fault.on("data", (value) => {
            console.log(value)
        })
        
    }

    sendMoveCommand(spins: number, delay: number) {
        spins = Math.min(spins, 0xFFFF);
        delay = Math.min(delay, 0xFFFF);

        const spinsHigh = (spins >> 8) & 0xFF;
        const spinsLow = spins & 0xFF;
        const delayHigh = (delay >> 8) & 0xFF;
        const delayLow = delay & 0xFF;

        console.log(`Sending command to Arduino - Spins: ${spins}, Delay: ${delay}`);
        console.log([MOVE_INIT, spinsHigh, spinsLow, delayHigh, delayLow]);

        this.board.io.sysexCommand([
            MOTOR_DATA,
            MOVE_INIT,
            spinsHigh, spinsLow,
            delayHigh, delayLow
        ]);
    }
 

}

