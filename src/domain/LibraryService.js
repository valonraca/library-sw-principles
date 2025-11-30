export class LibraryService {
  constructor(bookRepo, memberRepo, notifier, payment) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.notifier = notifier;
    this.payment = payment;
  }

  addBook(id, title, author) {
    if (!id || !title) return { ok: false, error: "Missing book fields" };
    const book = { id, title, author, available: true };
    this.bookRepo.add(book);
    return { ok: true, book };
  }

  registerMember(id, name, email) {
    if (!email || !email.includes("@")) {
      return { ok: false, error: "Invalid email" };
    }

    const member = { id, name, email, fees: 0 };
    this.memberRepo.add(member);

    this.notifier.send(email, "Welcome", `Hi ${name}, your ID is ${id}`);
    return { ok: true, member };
  }

  checkout(bookId, memberId, days = 21, card = "4111-1111") {
    const book = this.bookRepo.get(bookId);
    const member = this.memberRepo.get(memberId);

    if (!book) return { ok: false, error: "Book not found" };
    if (!member) return { ok: false, error: "Member not found" };
    if (!book.available) return { ok: false, error: "Book unavailable" };

    let fee = 0;
    if (days > 14) fee = (days - 14) * 0.5;

    if (fee > 0) {
      const res = this.payment.charge(fee, card);
      if (!res.ok) return { ok: false, error: "Payment failed" };
      member.fees += fee;
      this.memberRepo.update(member);
    }

    book.available = false;
    this.bookRepo.update(book);

    this.notifier.send(
      member.email,
      "Checkout",
      `You borrowed ${book.title}. Fee: $${fee}`
    );

    return { ok: true, book, member, fee };
  }

  search(term) {
    return this.bookRepo.search(term.toLowerCase());
  }
}

