import { Sensor } from "johnny-five"

export class MedicalSensor {

    private _sensorId: string;
    private _sensorType: string;
    private _sensorValue: number;
    private _sensor: Sensor;
    
    constructor(sensorId: string, sensorType: string, sensorValue: number) {
        //this._sensor = new Sensor(sensorId);
        this._sensorId = sensorId;
        this._sensorType = sensorType;
        this._sensorValue = sensorValue;
    }
    
    get sensorId(): string {
        return this._sensorId;
    }
    
    get sensorType(): string {
        return this._sensorType;
    }
    
    get sensorValue(): number {
        return this._sensorValue;
    }
    
    set sensorValue(value: number) {
        this._sensorValue = value;
    }
}