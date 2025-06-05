import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MedicalBoardGateway } from './gateway/medical-board.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, MedicalBoardGateway],
})
export class AppModule { }
