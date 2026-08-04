import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return health payload', () => {
      const health = appController.getHealth();

      expect(health).toHaveProperty('service', 'tailorhub-backend');
      expect(health).toHaveProperty('status', 'ok');
      expect(health).toHaveProperty('timestamp');
    });
  });
});
