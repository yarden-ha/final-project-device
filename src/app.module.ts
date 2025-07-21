import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MedicalBoardGateway } from './gateway/medical-board.gateway';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'files'), // project root
      serveRoot: '/files',
      exclude: ['**/*.html'],
    }),
  ],
  controllers: [AppController],
  providers: [AppService, MedicalBoardGateway],
})
export class AppModule { }
