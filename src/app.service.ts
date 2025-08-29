import { Injectable } from '@nestjs/common';
import { MedicalBoard } from './arduino/medical_board';
import { MedicalBoardGateway } from './gateway/medical-board.gateway';

@Injectable()
export class AppService {
  private board: MedicalBoard;
  constructor(private gateway: MedicalBoardGateway) {
    this.board = new MedicalBoard()
  }

  tare(name: string, val?: number) {
    return this.board.tare(name, val);
  }

  setScale(name: string, value: number) {
    return this.board.setScale(name, value);
  }


  getSensorVal(name: string) {
    this.board.readSensor(name);
    this.board.on(`${name}-data`, (data) => {
      this.gateway.emitSensorData(name, data)
    })
    return { status: 200 }
  }
  

  mooove(name: string, delay: number = 250) {
    return this.board.testMotor(name, delay, 0)
  }

  saveRecording() {
    return this.board.saveRecording('encoder')
  }

  stopMotor(name: string) {
    return this.board.stopMotor(name)
  }
  flipMotor(name: string) {
    return this.board.flipMotorDir(name)
  }
}
