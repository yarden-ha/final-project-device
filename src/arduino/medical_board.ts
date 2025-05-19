import { Board, Led } from "johnny-five"
import { readFile } from 'fs/promises'
import { MedicalSensor } from "./devices/medical_sensor";
import { MedicalDriver } from "./devices/medical_driver";

type DeviceType = 'stepper' | 'sensor'


export class MedicalBoard {
    private board: Board;
    
    public devices: [{ name: string, type: DeviceType }] 

    constructor() {
        //this.board = new Board()
        //this.board.on("ready", this.onReady.bind(this))
        this.onReady()
    }

    private async createDevices() {
        const devices: [{ name: string, type: DeviceType }] = JSON.parse(await readFile('devices.json', 'utf-8')).devices
        this.devices = [...devices]
        for (const device of devices) {
            switch (device.type) {
                case 'stepper':
                    new MedicalDriver();
                    console.log(`Loading stepper device: ${device.name}`);
                    break;
                case 'sensor':
                    new MedicalSensor(device.name, device.type, 0);
                    console.log(`Loading sensor device: ${device.name}`);
                    break;
                default:
                    console.log(`Unknown device type: ${device.type}`);
            }
        }
    }

    private onReady() {
        this.createDevices()
        console.log("board is ready")
    }
}