import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../common/enums/role.enum';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    create: jest.fn(),
    findMyProfile: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    disable: jest.fn(),
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

  it('delegates updateMe', async () => {
    const dto = { fullName: 'Nuevo Nombre' };
    usersService.update.mockResolvedValue({ id: 'u1' });

    await controller.updateMe(dto, actor);

    expect(usersService.update).toHaveBeenCalledWith('u1', dto, actor);
  });

  it('delegates findAll', async () => {
    const query = { page: 1, limit: 10 };
    usersService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll(actor, query);

    expect(usersService.findAll).toHaveBeenCalledWith(actor, query);
  });

  it('delegates create', async () => {
    const dto = {
      fullName: 'New User',
      email: 'new@tailorhub.com',
      phone: '+57 300 000 0000',
      password: 'An0therPass!',
      role: Role.EMPLOYEE,
    };
    usersService.create.mockResolvedValue({ id: 'u2' });

    await controller.create(dto, actor);

    expect(usersService.create).toHaveBeenCalledWith(dto, actor);
  });

  it('returns success message on remove', async () => {
    usersService.remove.mockResolvedValue(undefined);

    const result = await controller.remove('u1', actor);

    expect(result).toEqual({ message: 'User deleted successfully.' });
  });

  it('returns success message on disable', async () => {
    usersService.disable.mockResolvedValue(undefined);

    const result = await controller.disable('u1', actor);

    expect(usersService.disable).toHaveBeenCalledWith('u1', actor);
    expect(result).toEqual({ message: 'User disabled successfully.' });
  });
});
