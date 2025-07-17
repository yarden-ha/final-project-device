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
            const subcmd = unpackByte(data[0], data[1]); // First byte is the subcommand
            if (subcmd === MOVE_INIT) {
                // Arduino sends back in the order delay, spins
                const b0 = unpackByte(data[3], data[2]);
                const b1 = unpackByte(data[4], data[5]); 
                let delay = b1 + b0 ;
                console.log(data);
                console.log(`Received from Arduino - Delay: ${delay},`);
            }
        })

        this.dir.write(DIRECTION.CLOCK_WISE);

        this.fault.on("data", (value) => {
            console.log(value)
        })

    }

    sendMoveCommand(delay: number) {

        delay = Math.min(delay, 0xFFFF);


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


}

