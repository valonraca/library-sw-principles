class BookRepo {
  constructor(storage) {
    this.storage = storage;
    const data = storage.load();
    this.books = data.books || [];
  }

  getAll() {
    return this.books;
  }

  add(book) {
    this.books.push(book);
    this._save();
  }

  getById(id) {
    return this.books.find(b => b.id === id);
  }

  update(book) {
    const idx = this.books.findIndex(b => b.id === book.id);
    if (idx !== -1) {
      this.books[idx] = book;
      this._save();
    }
  }

  _save() {
    this.storage.save({ books: this.books });
  }
}
