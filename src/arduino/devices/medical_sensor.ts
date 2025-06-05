import { Board, Sensor } from "johnny-five"
import { MedicalDevice } from "../medical_board";
import { HX711 } from "./hx711";

export class MedicalSensor implements MedicalDevice {

    private _sensorId: string;
    private _sensorType: string;
    private _sensor: Sensor | HX711;

    constructor(sensorId: string, sensorType: string, pins: number[],board:Board) {
        if (!sensorId || !sensorType) {
            throw new Error("Sensor ID and type are required.");
        }
        this._sensor = sensorType === 'force' ? new HX711(pins[0], pins[1], 128, board) : this._sensor = new Sensor(pins[0]);
        this._sensorId = sensorId;
        this._sensorType = sensorType;
    }
 
    get sensorId(): string {
        return this._sensorId;
    }

    get sensorType(): string {
        return this._sensorType;
    }

    async sensorValue() : Promise<number> {
        if (this._sensor instanceof HX711) {
            return  (this._sensor as HX711).getWeight();
        }
        else if (this._sensor instanceof Sensor) {
            return  new Promise((resolve) => {
               (this._sensor as Sensor).on("data", (value: number) => {
                    resolve(value);
                });
            });
        }else{
               return  new Promise((resolve,reject) => {reject()})
               
        }
    }
    tare(val) {
        if (this._sensor instanceof HX711) {
            return (this._sensor as HX711).tare(val);
        } else {
            throw new Error("Tare is only available for HX711 sensors.");
        }
    }
    setScale(scale: number) {
        if (this._sensor instanceof HX711) {
            return (this._sensor as HX711).setScale(scale);
        } else {
            throw new Error("Set scale is only available for HX711 sensors.");
        }
    }

}