import { Test } from '@nestjs/testing';
import { BooksController } from '../src/books/books.controller';
import { BooksService } from '../src/books/books.service';

const mockBooksService = () => ({
  addBook: jest.fn(),
  getBooks: jest.fn(),
  findBookById: jest.fn(),
  removeBook: jest.fn(),
  updateBook: jest.fn(),
  findBookByAuthor: jest.fn(),
  buyBook: jest.fn(),
});

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('BooksController', () => {
  let controller: BooksController;
  let service: ReturnType<typeof mockBooksService>;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [{ provide: BooksService, useFactory: mockBooksService }],
    }).compile();

    controller = mod.get(BooksController);
    service = mod.get(BooksService) as any;
  });

  it('POST /books → 201 ok', async () => {
    const res = mockRes();
    service.addBook.mockResolvedValue({ id: 'b1', title: 'T', author: 'A', price: 10, isSold: false });
    await controller.create({ title: 'T', author: 'A', price: 10 } as any, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('POST /books → 500 on error', async () => {
    const res = mockRes();
    service.addBook.mockRejectedValue(new Error('db fail'));
    await controller.create({ title: 'T', author: 'A', price: 10 } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error creating book' });
  });

  it('GET /books → 200 list', async () => {
    const res = mockRes();
    service.getBooks.mockResolvedValue([{ id: 'b1' }]);
    await controller.findAll(res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: 'b1' }]);
  });

  it('GET /books/:id → 404', async () => {
    const res = mockRes();
    service.findBookById.mockResolvedValue(null);
    await controller.findOne('nope', res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Book not found' });
  });

  it('DELETE /books/:id → 204', async () => {
    const res = mockRes();
    service.removeBook.mockResolvedValue(true);
    await controller.remove('b1', res);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('PUT /books/:id → 404 when not exists', async () => {
    const res = mockRes();
    service.findBookById.mockResolvedValue(null);
    await controller.update('b1', { title: 'New' } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Book not found' });
  });

  it('GET /books/author/:id → 500 on error', async () => {
    const res = mockRes();
    service.findBookByAuthor.mockRejectedValue(new Error('oops'));
    await controller.byAuthor('Autor', res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Error fetching books by author' });
  });

  it('POST /books/:bookId/buy/:userId → 200 on success', async () => {
    const res = mockRes();
    service.buyBook.mockResolvedValue('El libro T ha sido comprado por el usuario con ID u1.');
    await controller.buy('b1', 'u1', res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'El libro T ha sido comprado por el usuario con ID u1.',
    });
  });

  it('POST /books/:bookId/buy/:userId → 404 when not found/already sold', async () => {
    const res = mockRes();
    service.buyBook.mockResolvedValue(null);
    await controller.buy('b1', 'u1', res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Book not found or already sold' });
  });
});