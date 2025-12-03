function LibraryService(bookRepo, memberRepo, payment, notifier) {

  this.addBook = function (id, title, author) {
    if (!id || !title) throw new Error("Missing fields");
    bookRepo.add({ id, title, author, available: true });
  };

  this.registerMember = function (id, name, email) {
    if (!email || !email.includes("@")) throw new Error("Invalid email");

    const member = { id, name, email, fees: 0 };
    memberRepo.add(member);
    notifier.send(email, "Welcome", "Hi " + name + ", your id is " + id);
  };

  this.checkoutBook = function (bookId, memberId, days = 21, card = "4111-1111") {
    const book = bookRepo.find(bookId);
    const member = memberRepo.find(memberId);

    if (!book) throw new Error("Book not found");
    if (!member) throw new Error("Member not found");
    if (!book.available) throw new Error("Book already checked out");

    let fee = Math.max(0, (days - 14) * 0.5);

    if (fee > 0) {
      const result = payment.charge(fee, card);
      if (!result.ok) throw new Error("Payment failed");
      member.fees += fee;
      memberRepo.update(member);
    }

    book.available = false;
    bookRepo.update(book);
    notifier.send(member.email, "Checkout", "You borrowed " + book.title + ". Fee: $" + fee);
  };

  this.search = function (term) {
    const t = term.toLowerCase();
    return bookRepo.getAll().filter(
      b =>
        b.title.toLowerCase().includes(t) ||
        b.author.toLowerCase().includes(t)
    );
  };
}
