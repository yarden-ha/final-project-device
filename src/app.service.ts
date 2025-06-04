import { Injectable } from '@nestjs/common';
import { MedicalBoard } from './arduino/medical_board';
import { MedicalBoardGateway } from './gateway/medical-board.gateway';

@Injectable()
export class AppService {
  private board = new MedicalBoard()
  constructor(private gateway: MedicalBoardGateway) {
  } // <-- inject


  tare(name: string) {
    return this.board.tare(name);
  }

  setScale(name: string, value: number) {
    return this.board.setScale(name, value);
  }


  getSensorVal(name: string) {
    this.board.readSensor(name);
    this.board.on(`${name}-data`, (data) => {
      this.gateway.emitSensorData(name, data)
    })
    return ""
  }
  mooove(name: string, d) {
    return this.board.testMotor(name, d)
  }


}
