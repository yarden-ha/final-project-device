import { EventEmitter } from "events";
import { Board, Led } from "johnny-five"
import { readFile } from 'fs/promises'
import { MedicalDriver } from "./devices/medical_driver";
import { MedicalSensor } from "./devices/medical_sensor";
import { MedicalEncoder } from "./devices/medical_encoder";

export type MedicalDevice = {}
type DeviceType = 'stepper' | 'sensor' | 'encoder'

type MedicalDeviceType = {
    type: DeviceType,
    name: string,
    pins: number[],
    deviceProps?: {
        [key: string]: any
    }
}

export const unpackByte = (lsb, msb) => (lsb & 0x7F) | ((msb & 0x7F) << 7);


export class MedicalBoard extends EventEmitter {
    private board: Board;
    private boardDevices: Map<string, MedicalDevice> = new Map();
    lastCommandSentTimeStamp: Date = new Date();
    constructor() {
        super();
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
                case 'encoder':
                    // Initialize sensor
                    console.log(`Initializing encoder: ${deviceJson.name} on pin ${deviceJson.pins}`);
                    const [a, b, z] = deviceJson.pins
                    const encoder = 
                    // new Encoder(
                    //     a,    // pinA
                    //     b,    // pinB
                    //     z,    // pinZ (optional)
                    //     () => console.log("Left turn detected"),
                    //     () => console.log("Right turn detected"),
                    //     (count) => console.log("Count:", count),
                    //     () => console.log("Full rotation detected")
                    //  )
                    new MedicalEncoder({
                        pinout: { a, b, z },
                        onLeft: () => console.log("Turned left"),
                        onRight: () => console.log("Turned right"),
                        onChange: (steps, dir) =>
                            console.log(`Steps: ${steps}, Direction: ${dir}`),
                    });
                    this.boardDevices.set(deviceJson.name, encoder);
                    (this.boardDevices.get(deviceJson.name) as MedicalEncoder)

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

    }



    public readSensor(name: string) {
        if (!this.boardDevices.has(name)) {
            return Promise.resolve(`Sensor ${name} not found`);
        }
        setInterval(async () => {
            try {
                const weight = await (this.boardDevices.get(name) as MedicalSensor).sensorValue();
                const rounded = Math.floor(weight).toFixed(2)
                let currentTimestamp = new Date()

                if (weight > 500 && currentTimestamp.getTime() - this.lastCommandSentTimeStamp.getTime() > 200) {
                    this.lastCommandSentTimeStamp = currentTimestamp
                    this.testMotor('motor', 500 - Math.floor(weight / 1000) * 50)
                }

                this.emit(`${name}-data`, rounded)
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
            sensor.tare(40);
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

    testMotor(name: string, delay: number) {
        console.log(`Testing motor: ${name} with delay: ${delay}`);

        let medicalDriver = this.boardDevices.get(name) as MedicalDriver
        // return medicalDriver ? medicalDriver.sendMoveCommand(delay) : { status: 404 }
        if (medicalDriver) {
            return medicalDriver.sendMoveCommand(delay);
        }
        else return { status: 404 }
    }
}