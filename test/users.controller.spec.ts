import { Test } from '@nestjs/testing';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

const mockUsersService = () => ({
  findUsersByEmail: jest.fn(),
  addUser: jest.fn(),
  getUsers: jest.fn(),
  findUserById: jest.fn(),
  removeUser: jest.fn(),
  updateUser: jest.fn(),
  login: jest.fn(),
});

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('UsersController', () => {
  let controller: UsersController;
  let service: ReturnType<typeof mockUsersService>;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useFactory: mockUsersService }],
    }).compile();

    controller = mod.get(UsersController);
    service = mod.get(UsersService) as any;
  });

  it('POST /users → 201 ok', async () => {
    const res = mockRes();
    service.findUsersByEmail.mockResolvedValue(null);
    service.addUser.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    await controller.create({ name: 'Ana', email: 'a@b.com', password: '12345678' }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'u1', email: 'a@b.com' });
  });

  it('POST /users → 400 duplicate', async () => {
    const res = mockRes();
    service.findUsersByEmail.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    await controller.create({ name: 'Ana', email: 'a@b.com', password: '12345678' }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'User already exists' });
  });

  it('GET /users → 200 list', async () => {
    const res = mockRes();
    service.getUsers.mockResolvedValue([{ id: '1' }]);
    await controller.findAll(res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: '1' }]);
  });

  it('GET /users/:id → 404', async () => {
    const res = mockRes();
    service.findUserById.mockResolvedValue(null);
    await controller.findOne('nope', res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

  it('DELETE /users/:id → 204', async () => {
    const res = mockRes();
    service.removeUser.mockResolvedValue(true);
    await controller.remove('u1', res);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('PUT /users/:id → 404 when not exists', async () => {
    const res = mockRes();
    service.findUserById.mockResolvedValue(null);
    await controller.update('u1', { name: 'New' }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

  it('POST /users/login → 401 invalid password', async () => {
    const res = mockRes();
    service.findUsersByEmail.mockResolvedValue({ id: 'u1', email: 'a@b.com', password: '$2b$10$hash' });
    // Forzamos bcrypt.compare a false sin tocar bcrypt real: simulamos con password erróneo
    jest.spyOn(require('bcrypt'), 'compare').mockResolvedValueOnce(false as any);
    await controller.login({ email: 'a@b.com', password: 'wrong' }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
  });

  it('POST /users/login → 200 token', async () => {
    const res = mockRes();
    service.findUsersByEmail.mockResolvedValue({ id: 'u1', email: 'a@b.com', password: '$2b$10$hash' });
    jest.spyOn(require('bcrypt'), 'compare').mockResolvedValueOnce(true as any);
    service.login.mockResolvedValue({ token: 'jwt-token' });
    await controller.login({ email: 'a@b.com', password: '12345678' }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ token: 'jwt-token' });
  });
});