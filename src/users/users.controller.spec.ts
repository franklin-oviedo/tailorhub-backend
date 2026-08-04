import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../common/enums/role.enum';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    findMyProfile: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const actor = { sub: 'u1', email: 'u@test.com', role: Role.ADMIN, storeId: 's1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('delegates getMe', async () => {
    usersService.findMyProfile.mockResolvedValue({ id: 'u1' });

    await controller.getMe(actor);

    expect(usersService.findMyProfile).toHaveBeenCalledWith('u1');
  });

  it('delegates findAll', async () => {
    const query = { page: 1, limit: 10 };
    usersService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll(actor, query);

    expect(usersService.findAll).toHaveBeenCalledWith(actor, query);
  });

  it('returns success message on remove', async () => {
    usersService.remove.mockResolvedValue(undefined);

    const result = await controller.remove('u1', actor);

    expect(result).toEqual({ message: 'User deleted successfully.' });
  });
});
