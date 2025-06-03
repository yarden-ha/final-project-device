import { Board, Led } from "johnny-five"
import { readFile } from 'fs/promises'
import { MedicalDriver } from "./devices/medical_driver";
import { MedicalSensor } from "./devices/medical_sensor";
import { HX711 } from "./devices/hx711";

export type MedicalDevice = {}
type DeviceType = 'stepper' | 'sensor'

type MedicalDeviceType = {
    type: DeviceType,
    name: string,
    pins: number[],
    deviceProps?: {
        [key: string]: any
    }
}

export class MedicalBoard {
    private board: Board;
    private boardDevices: Map<string, MedicalDevice> = new Map();

    constructor() {
        this.board = new Board()
        this.board.on("ready", this.onReady.bind(this))
    }

    private async createDevices() {
        /**
        * 
        * {
            "devices": [
                {
                    "name": "Sensor A",
                    "type": "sensor",
                    "pin": 2,
                    "deviceProps": {
                        "sensorType":""
                    }
                }
            ]
        }
        * 
        */
        let devicesFile = JSON.parse(await readFile('devices.json', 'utf8'))
        let devicesJson = devicesFile.devices as MedicalDeviceType[];

        devicesJson.forEach(deviceJson => {
            let deviceProps = deviceJson.deviceProps || {};

            switch (deviceJson.type) {
                case 'stepper':
                    // Initialize stepper motor
                    console.log(`Initializing stepper motor: ${deviceJson.name} on pin ${deviceJson.pins}`);
                    // Assuming MedicalDriver is a class that handles stepper motors
                    const [step, dir, fault] = deviceJson.pins;
                    this.boardDevices.set(deviceJson.name, new MedicalDriver({ step, dir, fault }, 200, this.board));
                    break;
                case 'sensor':
                    // Initialize sensor
                    let sensorType = deviceProps['sensorType'] || 'default';
                    console.log(`Initializing sensor: ${deviceJson.name} on pin ${deviceJson.pins}`);
                    this.boardDevices.set(deviceJson.name, new MedicalSensor(deviceJson.name, sensorType, deviceJson.pins, this.board));
                    // Add sensor initialization code here        
                    break;

                default:
                    console.error("Device not supported!!!")
                    break
            }
        });

    }

    private onReady() {
        console.log("board is ready")
        // Initialize the board and create devices
        // do here anything once the board is ready
        console.log("Creating devices...")
        this.createDevices()
        setTimeout(() => {

            this.readSensor('force')

        }, 5000)
    }

    public readSensor(name: string) {
        if (!this.boardDevices.has(name)) {
            return Promise.resolve(`Sensor ${name} not found`);
        }
        setInterval(async () => {
            try {
                const weight = await (this.boardDevices.get(name) as MedicalSensor).sensorValue();
                console.log("Weight:", weight);
            } catch (err) {
                console.error("Read error:", err);
            }
        }, 10)
    }

    tare(name: string) {
        if (!this.boardDevices.has(name)) {
            return Promise.resolve(`Sensor ${name} not found`);
        }
        const sensor = this.boardDevices.get(name) as MedicalSensor;
        if (sensor instanceof MedicalSensor) {
            sensor.tare();
            console.log(`Tared sensor: ${name}`);
        } else {
            console.error(`Sensor ${name} is not a HX711 sensor`);
        }
    }

    setScale(name: string, scale: number) {
        if (!this.boardDevices.has(name)) {
            return Promise.resolve(`Sensor ${name} not found`);
        }
        const sensor = this.boardDevices.get(name) as MedicalSensor;

        sensor.setScale(scale);
        console.log(`Set scale for sensor: ${name} to ${scale}`);

    }
    testMotor(name: string,delay:number) {
        let medicalDriver = this.boardDevices.get(name) as MedicalDriver
        if (medicalDriver) {

         return   medicalDriver.moveToPosition(delay)

        }
        else return {status:404}
    }
}