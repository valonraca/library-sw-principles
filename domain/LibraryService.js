export class LibraryService {
  constructor(bookRepo, memberRepo, paymentProvider, notifier) {
    this.bookRepo = bookRepo;
    this.memberRepo = memberRepo;
    this.paymentProvider = paymentProvider;
    this.notifier = notifier;
  }

  addBook(id, title, author) {
    if (!id || !title) return { error: "Missing fields" };
    const book = { id, title, author, available: true };
    this.bookRepo.save(book);
    return { ok: true, book };
  }

  registerMember(id, name, email) {
    if (!email?.includes("@")) return { error: "Invalid email" };
    const member = { id, name, email, fees: 0 };
    this.memberRepo.save(member);
    this.notifier.send(email, "Welcome", `Hi ${name}, your id is ${id}`);
    return { ok: true, member };
  }

  checkoutBook(bookId, memberId, days = 21, card = "4111-1111") {
    const book = this.bookRepo.find(bookId);
    const member = this.memberRepo.find(memberId);

    if (!book) return { error: "Book not found" };
    if (!member) return { error: "Member not found" };
    if (!book.available) return { error: "Book already checked out" };

    let fee = 0;
    if (days > 14) fee = (days - 14) * 0.5;

    if (fee > 0) {
      const result = this.paymentProvider.charge(fee, card);
      if (!result.ok) return { error: "Payment failed" };
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
    const t = term.trim().toLowerCase();
    return this.bookRepo
      .all()
      .filter(
        b =>
          b.title.toLowerCase().includes(t) ||
          b.author.toLowerCase().includes(t)
      );
  }
}
