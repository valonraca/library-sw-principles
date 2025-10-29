export class BookManager {
  constructor(bookStorage, memberStorage, messenger, billing) {
    this.bookStorage = bookStorage;
    this.memberStorage = memberStorage;
    this.messenger = messenger;
    this.billing = billing;
  }

  addNewBook(id, title, author) {
    if (!id || !title) throw new Error("Book ID and Title required.");
    const allBooks = this.bookStorage.fetchAll();
    allBooks.push({ id, title, author, available: true });
    this.bookStorage.saveAll(allBooks);
    return `Added "${title}" by ${author}`;
  }

  createMember(id, name, email) {
    if (!email.includes("@")) throw new Error("Invalid email format.");
    const members = this.memberStorage.fetchAll();
    members.push({ id, name, email, balance: 0 });
    this.memberStorage.saveAll(members);
    this.messenger.email(email, "Welcome to Library", `Hello ${name}, your ID is ${id}.`);
    return `Member registered: ${name}`;
  }

  loanBook(bookId, memberId, duration = 21, card = "4111-1111-1111-1111") {
    const books = this.bookStorage.fetchAll();
    const members = this.memberStorage.fetchAll();

    const book = books.find(b => b.id === bookId);
    const member = members.find(m => m.id === memberId);

    if (!book || !member) throw new Error("Book or member not found.");
    if (!book.available) throw new Error("Book already checked out.");

    let lateFee = duration > 14 ? (duration - 14) * 0.5 : 0;
    if (lateFee > 0) {
      const result = this.billing.process(lateFee, card);
      if (!result.success) throw new Error("Payment failed.");
      member.balance += lateFee;
    }

    book.available = false;
    this.bookStorage.saveAll(books);
    this.memberStorage.saveAll(members);
    this.messenger.email(member.email, "Checkout Confirmation", 
      `You borrowed "${book.title}". Fee: $${lateFee}`);
    return `Loan successful: ${book.title} → ${member.name} (fee=$${lateFee})`;
  }
}
