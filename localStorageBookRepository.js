export class LocalStorageBookRepository {
  constructor(key = 'LIB_DATA') {
    this.key = key;
    this._load();
  }

  _load() {
    try {
      const payload = JSON.parse(localStorage.getItem(this.key) || '{}');
      this.books = payload.books || [];
    } catch (e) {
      this.books = [];
    }
  }

  _commit() {
    const payload = JSON.parse(localStorage.getItem(this.key) || '{}');
    payload.books = this.books;
    localStorage.setItem(this.key, JSON.stringify(payload));
  }

  getAll() {
    return this.books.slice();
  }

  findById(id) {
    return this.books.find(b => b.id === id);
  }

  save(book) {
    const idx = this.books.findIndex(b => b.id === book.id);
    if (idx >= 0) this.books[idx] = book;
    else this.books.push(book);
    this._commit();
  }
}
