export class BookService {
  constructor(bookRepo) {
    this.bookRepo = bookRepo;
  }

  add(id, title, author) {
    if (!id || !title) throw new Error('Missing fields');

    const books = this.bookRepo.getAll();
    books.push({ id, title, author, available: true });
    this.bookRepo.saveAll(books);
  }

  findById(id) {
    return this.bookRepo.getAll().find(b => b.id === id);
  }

  setUnavailable(book) {
    book.available = false;
    this.bookRepo.saveAll(this.bookRepo.getAll());
  }
}
