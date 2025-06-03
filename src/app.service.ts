import { Injectable } from '@nestjs/common';
import { MedicalBoard } from './arduino/medical_board';

@Injectable()
export class AppService {
  private board = new MedicalBoard()

  getHello(): string {
    return 'yarden OMO!';
  }
  tare(name: string) {
    return this.board.tare(name);
  }

  setScale(name: string, value: number) {
    return this.board.setScale(name, value);
  }


  getSensorVal(name: string) {
    return this.board.readSensor(name);
  }
  mooove(name: string, d) {
    return this.board.testMotor(name, d)
  }
}
