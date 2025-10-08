import { Body, Controller, Delete, Get, Param, Post, Put, Res } from '@nestjs/common';
import { Response } from 'express';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Post()
  async create(@Body() dto: CreateBookDto, @Res() res: Response) {
    try {
      const book = await this.books.addBook(dto);
      return res.status(201).json(book);
    } catch {
      return res.status(500).json({ message: 'Error creating book' });
    }
  }

  @Get()
  async findAll(@Res() res: Response) {
    try {
      const list = await this.books.getBooks();
      return res.status(200).json(list);
    } catch {
      return res.status(500).json({ message: 'Error fetching books' });
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const b = await this.books.findBookById(id);
    return b ? res.status(200).json(b) : res.status(404).json({ message: 'Book not found' });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Res() res: Response) {
    const ok = await this.books.removeBook(id);
    return ok ? res.status(204).send() : res.status(404).json({ message: 'Book not found' });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBookDto, @Res() res: Response) {
    const exists = await this.books.findBookById(id);
    if (!exists) return res.status(404).json({ message: 'Book not found' });
    const updated = await this.books.updateBook(id, dto);
    return res.status(200).json(updated);
  }

  @Get('author/:id')
  async byAuthor(@Param('id') author: string, @Res() res: Response) {
    try {
      const list = await this.books.findBookByAuthor(author);
      return res.status(200).json(list);
    } catch {
      return res.status(500).json({ message: 'Error fetching books by author' });
    }
  }

  @Post(':bookId/buy/:userId')
  async buy(@Param('bookId') bookId: string, @Param('userId') userId: string, @Res() res: Response) {
    try {
      const msg = await this.books.buyBook(userId, bookId);
      return msg ? res.status(200).json({ message: msg })
                 : res.status(404).json({ message: 'Book not found or already sold' });
    } catch {
      return res.status(500).json({ message: 'Error buying book' });
    }
  }
}