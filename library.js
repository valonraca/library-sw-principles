export class Library {
    constructor(bookRepo, memberRepo, paymentProvider, notifier) {
        this.bookRepo = bookRepo;
        this.memberRepo = memberRepo;
        this.payment = paymentProvider;
        this.notifier = notifier;
    }

    addBook(id, title, author) {
        if (!id || !title) {
            throw new Error("Missing required fields.");
        }

        const books = this.bookRepo.load();
        books.push({ id, title, author, available: true });
        this.bookRepo.save(books);
    }

    registerMember(id, name, email) {
        if (!email.includes("@")) {
            throw new Error("Invalid email.");
        }

        const members = this.memberRepo.load();
        members.push({ id, name, email, fees: 0 });
        this.memberRepo.save(members);

        this.notifier.send(email, "Welcome!", `Hello ${name}, your ID is ${id}`);
    }

    checkoutBook(bookId, memberId, days = 21, card = "4111") {
        const books = this.bookRepo.load();
        const members = this.memberRepo.load();

        const book = books.find(b => b.id === bookId);
        const member = members.find(m => m.id === memberId);

        if (!book) throw new Error("Book not found.");
        if (!member) throw new Error("Member not found.");
        if (!book.available) throw new Error("Book already checked out.");

        let fee = 0;
        if (days > 14) {
            fee = (days - 14) * 0.5;
        }

        if (fee > 0) {
            const result = this.payment.charge(fee, card);
            if (!result.ok) {
                throw new Error("Payment failed.");
            }
            member.fees += fee;
        }

        book.available = false;

        this.bookRepo.save(books);
        this.memberRepo.save(members);

        this.notifier.send(
            member.email,
            "Checkout Confirmation",
            `You borrowed "${book.title}". Fee: $${fee}`
        );
    }

    searchBooks(term) {
        const t = term.toLowerCase().trim();
        return this.bookRepo
            .load()
            .filter(b =>
                b.title.toLowerCase().includes(t) ||
                b.author.toLowerCase().includes(t)
            );
    }

    getAllBooks() {
        return this.bookRepo.load();
    }

    getMember(id) {
        return this.memberRepo.load().find(m => m.id === id);
    }
}
