// Domain-only LibraryService — NO DOM, NO storage, NO alerts

export class LibraryService {
  constructor(bookRepo, memberRepo, notifier, payment) {
    this.books = bookRepo;
    this.members = memberRepo;
    this.notifier = notifier;
    this.payment = payment;
  }

  addBook(id, title, author) {
    if (!id || !title) {
      return { error: "Missing fields" };
    }
    const book = { id, title, author, available: true };
    this.books.add(book);
    return { ok: true, book };
  }

  registerMember(id, name, email) {
    if (!email || !email.includes("@")) {
      return { error: "Invalid email" };
    }

    const member = { id, name, email, fees: 0 };
    this.members.add(member);

    this.notifier.send(email, "Welcome", `Hi ${name}, your id is ${id}`);
    return { ok: true, member };
  }

  checkoutBook(bookId, memberId, days = 21, card = "4111-1111") {
    const book = this.books.get(bookId);
    const member = this.members.get(memberId);

    if (!book) return { error: "Book not found" };
    if (!member) return { error: "Member not found" };
    if (!book.available) return { error: "Book already checked out" };

    let fee = 0;
    if (days > 14) {
      fee = (days - 14) * 0.5;
      const res = this.payment.charge(fee, card);
      if (!res.ok) return { error: "Payment failed" };
      member.fees += fee;
    }

    book.available = false;
    this.books.update(bookId, book);
    this.members.update(memberId, member);

    this.notifier.send(
      member.email,
      "Checkout",
      `You borrowed ${book.title}. Fee: $${fee}`
    );

    return { ok: true, book, member, fee };
  }

  search(term) {
    const t = term.trim().toLowerCase();
    return this.books
      .all()
      .filter(
        b =>
          b.title.toLowerCase().includes(t) ||
          b.author.toLowerCase().includes(t)
      );
  }
}
