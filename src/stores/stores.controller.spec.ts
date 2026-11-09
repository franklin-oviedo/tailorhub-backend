import { Test, TestingModule } from '@nestjs/testing';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

describe('StoresController', () => {
  let controller: StoresController;
  const storesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    uploadLogo: jest.fn(),
    uploadSeal: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoresController],
      providers: [{ provide: StoresService, useValue: storesService }],
    }).compile();

    controller = module.get<StoresController>(StoresController);
  });

  it('delegates findAll', async () => {
    const query = { page: 1, limit: 10 };
    storesService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll(query);

    expect(storesService.findAll).toHaveBeenCalledWith(query);
  });

  it('returns success message on remove', async () => {
    storesService.remove.mockResolvedValue(undefined);

    const result = await controller.remove('s1');

    expect(result).toEqual({ message: 'Store deleted successfully.' });
  });

  it('delegates uploadSeal', async () => {
    const file = { mimetype: 'image/png', buffer: Buffer.from('seal') } as Express.Multer.File;
    storesService.uploadSeal.mockResolvedValue({ id: 's1', seal: 'https://example.com/seal.png' });

    await controller.uploadSeal('s1', file);

    expect(storesService.uploadSeal).toHaveBeenCalledWith('s1', file);
  });
});
