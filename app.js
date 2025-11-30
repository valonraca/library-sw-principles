// models
class Book {
  constructor(id, title, author, year) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.year = year;
    this.isBorrowed = false;
    this.borrowedBy = null;
  }
}

class Member {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

// storage adapter (OCP)
class StorageAdapter {
  load(key) {
    throw new Error("load() not implemented");
  }

  save(key, value) {
    throw new Error("save() not implemented");
  }
}

class LocalStorageAdapter extends StorageAdapter {
  load(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

// repositories (SRP)
class BookRepository {
  constructor(storage) {
    this.storage = storage;
    this.key = "books";
    this.books = this.storage.load(this.key);
  }

  add(book) {
    this.books.push(book);
    this._save();
  }

  getAll() {
    return this.books;
  }

  getById(id) {
    return this.books.find((b) => b.id === id);
  }

  update() {
    this._save();
  }

  _save() {
    this.storage.save(this.key, this.books);
  }
}

class MemberRepository {
  constructor(storage) {
    this.storage = storage;
    this.key = "members";
    this.members = this.storage.load(this.key);
  }

  add(member) {
    this.members.push(member);
    this._save();
  }

  getAll() {
    return this.members;
  }

  getById(id) {
    return this.members.find((m) => m.id === id);
  }

  _save() {
    this.storage.save(this.key, this.members);
  }
}

// library service (business logic)
class LibraryService {
  constructor(bookRepo, memberRepo) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
  }

  addBook(title, author, year) {
    const id = Date.now();
    const book = new Book(id, title, author, year);
    this.bookRepo.add(book);
    return book;
  }

  addMember(name) {
    const id = Date.now();
    const member = new Member(id, name);
    this.memberRepo.add(member);
    return member;
  }

  borrowBook(bookId, memberId) {
    const book = this.bookRepo.getById(bookId);
    const member = this.memberRepo.getById(memberId);

    if (!book) return "Book not found.";
    if (!member) return "Member not found.";
    if (book.isBorrowed) return "Book is already borrowed.";

    book.isBorrowed = true;
    book.borrowedBy = member.id;

    this.bookRepo.update();
    return `Book borrowed by ${member.name}`;
  }

  returnBook(bookId) {
    const book = this.bookRepo.getById(bookId);

    if (!book) return "Book not found.";
    if (!book.isBorrowed) return "Book is not borrowed.";

    book.isBorrowed = false;
    book.borrowedBy = null;

    this.bookRepo.update();
    return "Book returned successfully";
  }

  searchBooks(keyword) {
    const term = keyword.toLowerCase();
    return this.bookRepo
      .getAll()
      .filter(
        (b) =>
          b.title.toLowerCase().includes(term) ||
          b.author.toLowerCase().includes(term)
      );
  }

  listBorrowedBooks() {
    return this.bookRepo.getAll().filter((b) => b.isBorrowed);
  }

  listAvailableBooks() {
    return this.bookRepo.getAll().filter((b) => !b.isBorrowed);
  }
}

// initialisation
const storage = new LocalStorageAdapter();
const bookRepo = new BookRepository(storage);
const memberRepo = new MemberRepository(storage);

const library = new LibraryService(bookRepo, memberRepo);

// Export for testing or console use
window.library = library;
