import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get('/:name')
  getSensorData(@Param('name') name: string) {
    return this.appService.getSensorVal(name);
  }

  @Get('/tare/:name')
  postSensorData(@Param('name') name: string,) {
    return this.appService.tare(name);
  }

  @Post('/setscale/:name')
  setScale(@Param('name') name: string, @Body() body: { scale: number }) {

    return this.appService.setScale(name, body.scale);
  }

  @Post('/motor/:name/move')
  moveMotor(@Param('name') name: string,@Body() body: { delay?: number }) {
    const { delay = 50 } = body;
    return this.appService.mooove(name, delay);
  }

  @Post('/record')
  record(){
    console.log('record controller');
    
    return this.appService.saveRecording()
  }
}
