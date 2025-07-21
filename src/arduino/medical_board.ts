import { EventEmitter } from "events";
import { Board, Led } from "johnny-five"
import { readFile } from 'fs/promises'
import { MedicalDriver } from "./devices/medical_driver";
import { MedicalSensor } from "./devices/medical_sensor";
import { MedicalEncoder } from "./devices/medical_encoder";
import {writeFile} from 'fs/promises'

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
    pullhistory: { rpm: number, delay: number, weight: number }[] = []
    lastCommandSentTimeStamp: Date = new Date();
    motorActive = false
    sensorInterval: NodeJS.Timeout;
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
                        }, this.board);
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

    /**
     * Maps a weight value (grams) to a delay value (microseconds) for the motor.
     * @param weight - The measured weight in grams
     * @param minWeight - The minimum weight (default 0g)
     * @param maxWeight - The maximum weight (default 10000g)
     * @param minDelay - The minimum delay (default 800us)
     * @param maxDelay - The maximum delay (default 2000us)
     */
    private mapWeightToDelay(weight: number, minWeight = 0, maxWeight = 10000, minDelay = 800, maxDelay = 2000): number {
        // Clamp weight to [minWeight, maxWeight]
        weight = Math.max(minWeight, Math.min(weight, maxWeight));
        // Reverse linear interpolation: higher weight -> lower delay
        const delay = maxDelay - ((weight - minWeight) * (maxDelay - minDelay)) / (maxWeight - minWeight);
        return Math.round(delay);
    }

    public readSensor(name: string) {
        if (!this.boardDevices.has(name)) {
            return Promise.resolve(`Sensor ${name} not found`);
        }
        this.motorActive = true;

      this.sensorInterval =  setInterval(async () => {
            try {
                const weight = await (this.boardDevices.get(name) as MedicalSensor).sensorValue();
                const rounded = Math.floor(weight).toFixed(2)
                let currentTimestamp = new Date()

                if (weight > 500 && currentTimestamp.getTime() - this.lastCommandSentTimeStamp.getTime() > 200) {
                    this.lastCommandSentTimeStamp = currentTimestamp
                    const delay = this.mapWeightToDelay(weight);
                    console.log(`Delay: ${delay} Weight: ${weight}`)
                    this.testMotor('motor', delay ,weight)
                }

                this.emit(`${name}-data`, rounded)
            } catch (err) {
                console.error("Read error:", err);
            }
        }, 10)
    }

    tare(name: string, val?: number) {
        if (!this.boardDevices.has(name)) {
            return Promise.resolve(`Sensor ${name} not found`);
        }
        const sensor = this.boardDevices.get(name) as MedicalSensor;
        if (sensor instanceof MedicalSensor) {
            sensor.tare(val);
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

    testMotor(name: string, delay: number, weight: number) {
        console.log(`Testing motor: ${name} with delay: ${delay}`);
        let medicalDriver = this.boardDevices.get(name) as MedicalDriver
        // return medicalDriver ? medicalDriver.sendMoveCommand(delay) : { status: 404 }
        if (medicalDriver && this.motorActive) {
            let rpm = medicalDriver.rpm
            console.log(`rpm: ${rpm}`)
            this.pullhistory.push({ rpm, delay, weight })
            return medicalDriver.sendMoveCommand(delay);
        }
        else return { status: 404 }
    }

    saveRecording(name) {
        
        let encoder = this.boardDevices.get(name) as MedicalEncoder
        console.log(encoder);
        encoder.saveRecording()
    }


    public readRPM(name: string) {
        if (!this.boardDevices.has(name)) {
            return Promise.resolve(`Sensor ${name} not found`);
        }
        setInterval(async () => {
            const rpm = (this.boardDevices.get(name) as MedicalDriver).rpm;
            this.emit(`${name}-rpm`, rpm)
        }, 10)
    }

    public async stopMotor(name: string) {
        if (!this.boardDevices.has(name)) {
            return Promise.resolve(`Sensor ${name} not found`);
        }
        this.motorActive = false;
        this.sensorInterval && clearInterval(this.sensorInterval)
        const medicalDriver = this.boardDevices.get(name) as MedicalDriver;
        medicalDriver.sendStopCommand();
        //save pullhistory to file
        await writeFile('files/pullhistory.json', JSON.stringify(this.pullhistory),'utf8')
        this.pullhistory = []
    }
}