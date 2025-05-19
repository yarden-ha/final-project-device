import { Board, Led } from "johnny-five"
import { readFile } from 'fs'

type DeviceType = 'Stepper' | 'Sensor'


export class MedicalBoard {
    private board: Board;

    constructor() {
        this.board = new Board()
        this.board.on("ready", this.onReady.bind(this))  
    }

    private createDevices(){
        readFile('devices.json', 'utf8', (err, data) => {
            if (err) {
                console.error("Error reading file:", err);
                return;
            }
            try {
                const devices = JSON.parse(data);
                console.log(devices);
            } catch (parseError) {
                console.error("Error parsing JSON:", parseError);
            }
        });
    }

    private onReady() {
        console.log("board is ready")
    }
}