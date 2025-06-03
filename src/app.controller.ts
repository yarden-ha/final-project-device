import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/:name')
  getSensorData(@Param('name') name: string) {
    return this.appService.getSensorVal(name);
  }

  @Get('/tare/:name')
  postSensorData(@Param('name') name: string,) {
    return this.appService.tare(name);
  }  

  @Post('/setscale/:name')
  setScale(@Param('name') name: string, @Body() body: {scale:number}) {

    return this.appService.setScale(name, body.scale);
  }

  @Get('/motor/:name/:delay')
  moveMotor(@Param('name') name: string,@Param('delay') delay: number) {
    console.log(delay)
    return this.appService.mooove(name,delay);
  }

}
