import { Injectable } from '@nestjs/common';
import { MedicalBoard } from './arduino/medical_board';

@Injectable()
export class AppService {
  private board = new MedicalBoard()
  
  getHello(): string {
    return 'yarden OMO!';
  }
}
