/****************************************************
 * Linor-libraryService.js
 * Core business logic (no DOM, no localStorage)
 ****************************************************/

export class LibraryService {

  // Dependencies injected here (repos + ports)
  constructor(bookRepo, memberRepo, paymentProvider, notifier, logger) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.paymentProvider = paymentProvider;
    this.notifier = notifier;
    this.logger = logger;

    // Load state from repos
    this.books = this.bookRepo.load();
    this.members = this.memberRepo.load();
  }

  _log(msg) {
    if (this.logger) {
      this.logger.log(msg);
    }
  }

  getBooks()     { return [...this.books]; }
  getMembers()   { return [...this.members]; }
  getMemberById(id) {
    return this.members.find(m => m.id === id) || null;
  }

  addBook(id, title, author) {
    if (!id || !title) {
      return { ok: false, error: "Book ID and title are required in this case" };
    }

    this.books.push({ id, title, author, available: true });
    this.bookRepo.save(this.books);
    this._log(`Added book: ${title} by ${author} (Linor)`);
    return { ok: true };
  }

  registerMember(id, name, email) {
    if (!email || !email.includes("@")) {
      return { ok: false, error: "Invalid email" };
    }

    this.members.push({ id, name, email, fees: 0 });
    this.memberRepo.save(this.members);

    this._log(`Registered member: ${name} (by Linor)`);

    if (this.notifier) {
      this.notifier.send(
        email,
        "Welcome to the best Library in  town!",
        `Hi ${name}, your member ID is ${id}`
      );
    }

    return { ok: true };
  }

  checkoutBook(bookId, memberId, days = 21, card = "4111-xxxx") {
    const book   = this.books.find(b => b.id === bookId);
    const member = this.members.find(m => m.id === memberId);

    if (!book)   return { ok: false, error: "Book not found here" };
    if (!member) return { ok: false, error: "Member not found here" };
    if (!book.available) return { ok: false, error: "Book already checked out" };

    // Simple late fee rule
    let fee = 0;
    if (days > 14) {
      fee = (days - 14) * 0.5;
    }

    if (fee > 0 && this.paymentProvider) {
      const result = this.paymentProvider.charge(fee, card);
      if (!result || !result.ok) {
        return { ok: false, error: "Payment has failed" };
      }
      member.fees += fee;
    }

    book.available = false;
    this.bookRepo.save(this.books);
    this.memberRepo.save(this.members);

    this._log(`Checkout: ${book.title} to ${member.name}, fee=${fee} (Linor)`);

    if (this.notifier) {
      this.notifier.send(
        member.email,
        "Book Checkout",
        `You borrowed "${book.title}". Fee: $${fee}`
      );
    }

    return { ok: true, fee, book, member };
  }

  search(term) {
    const t = term.trim().toLowerCase();
    const results = this.books.filter(b =>
      b.title.toLowerCase().includes(t) ||
      b.author.toLowerCase().includes(t)
    );
    this._log(`Search "${term}" → ${results.length} results (Linor)`);
    return results;
  }
}
