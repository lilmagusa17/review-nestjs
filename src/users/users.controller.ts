import { Body, Controller, Delete, Get, Param, Post, Put, Res } from '@nestjs/common';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto, @Res() res: Response) {
    const existing = await this.users.findUsersByEmail(dto.email);
    if (existing) return res.status(400).json({ message: 'User already exists' });
    dto.password = await bcrypt.hash(dto.password, 10);
    const user = await this.users.addUser(dto);
    return res.status(201).json({ id: user.id, email: user.email });
  }

  @Get()
  async findAll(@Res() res: Response) {
    const list = await this.users.getUsers();
    return res.status(200).json(list);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const u = await this.users.findUserById(id);
    return u ? res.status(200).json(u) : res.status(404).json({ message: 'User not found' });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Res() res: Response) {
    const ok = await this.users.removeUser(id);
    return ok ? res.status(204).send() : res.status(404).json({ message: 'User not found' });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Res() res: Response) {
    const exists = await this.users.findUserById(id);
    if (!exists) return res.status(404).json({ message: 'User not found' });
    if (dto.password) dto.password = await bcrypt.hash(dto.password, 10);
    const updated = await this.users.updateUser(id, dto);
    return res.status(200).json(updated);
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Res() res: Response) {
    const user = await this.users.findUsersByEmail(body.email);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const ok = await bcrypt.compare(body.password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = await this.users.login(user.email);
    return res.status(200).json(token);
  }
}