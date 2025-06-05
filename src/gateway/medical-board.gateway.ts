import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MedicalBoardGateway {
  @WebSocketServer()
  server: Server;

  // Listen for a custom event from the client
  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: any) {
    // Respond to the client
    this.server.emit('pong', { msg: 'pong', data });
  }

  emitSensorData(sensorName: string, value: number) {
    console.log('sensor-data', { sensor: sensorName, value });
    
    this.server.emit('sensor-data', { sensor: sensorName, value });
  }
}