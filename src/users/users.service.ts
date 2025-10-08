import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  getUsers() {
    return this.repo.find();
  }

  findUserById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  findUsersByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async addUser(dto: CreateUserDto) {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const found = await this.findUserById(id);
    if (!found) return null;
    Object.assign(found, dto);
    return this.repo.save(found);
  }

  async removeUser(id: string) {
    const res = await this.repo.delete(id);
    return !!res.affected;
  }

  async login(email: string) {
    const token = await this.jwt.signAsync({ user: { email } }, { secret: process.env.JWT_SECRET, expiresIn: '10m' });
    return { token };
  }
}