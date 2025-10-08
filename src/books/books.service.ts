import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './book.entity';
import { User } from '../users/user.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book) private readonly repo: Repository<Book>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  getBooks() {
    return this.repo.find({ relations: ['buyer'] });
  }

  findBookById(id: string) {
    return this.repo.findOne({ where: { id }, relations: ['buyer'] });
  }

  async addBook(dto: CreateBookDto) {
    const entity = this.repo.create({ ...dto, isSold: false });
    return this.repo.save(entity);
  }

  // Según contrato del examen: findBooks → disponibles
  async findBooks() {
    return this.getAvailableBooks();
  }

  async findBookByAuthor(author: string) {
    return this.repo
      .createQueryBuilder('b')
      .where('LOWER(b.author) = LOWER(:a)', { a: author })
      .getMany();
  }

  async removeBook(id: string) {
    const res = await this.repo.delete(id);
    return !!res.affected;
  }

  async markBookAsSold(bookId: string, userId: string) {
    const book = await this.findBookById(bookId);
    if (!book) return null;
    const buyer = await this.users.findOne({ where: { id: userId } });
    if (!buyer) return null;
    book.isSold = true;
    book.buyer = buyer;
    return this.repo.save(book);
  }

  getAvailableBooks() {
    return this.repo.find({ where: { isSold: false } });
  }

  getSoldBooks() {
    return this.repo.find({ where: { isSold: true } });
  }

  async updateBook(id: string, dto: UpdateBookDto) {
    const b = await this.findBookById(id);
    if (!b) return null;
    Object.assign(b, dto);
    return this.repo.save(b);
  }

  async buyBook(userId: string, bookId: string) {
    const found = await this.findBookById(bookId);
    if (!found || found.isSold) return null;
    const saved = await this.markBookAsSold(bookId, userId);
    if (!saved) return null;
    return `El libro ${found.title} ha sido comprado por el usuario con ID ${userId}.`;
  }
}