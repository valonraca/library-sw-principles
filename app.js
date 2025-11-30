// =========================
// Repositories
// =========================

class ClassRepo {
  constructor() {
    this.classes = [];
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem("GYM_CLASSES") || "[]");
      this.classes = data;
    } catch (e) {
      this.classes = [];
    }
  }

  save() {
    localStorage.setItem("GYM_CLASSES", JSON.stringify(this.classes));
  }

  addClass(id, name, coach, capacity) {
    this.classes.push({
      id,
      name,
      coach,
      capacity: Number(capacity) || 0,
      spotsTaken: 0,
    });
  }

  findById(id) {
    return this.classes.find((c) => c.id === id);
  }

  all() {
    return this.classes.slice();
  }
}

class MemberRepo {
  constructor() {
    this.members = [];
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem("GYM_MEMBERS") || "[]");
      this.members = data;
    } catch (e) {
      this.members = [];
    }
  }

  save() {
    localStorage.setItem("GYM_MEMBERS", JSON.stringify(this.members));
  }

  addMember(id, name, email) {
    this.members.push({
      id,
      name,
      email,
      active: true,
      fees: 0,
    });
  }

  findById(id) {
    return this.members.find((m) => m.id === id);
  }

  all() {
    return this.members.slice();
  }
}

// =========================
// Infrastructure services
// =========================

class PaymentProvider {
  charge(amount, card) {
    console.log(`[FakePay] Charging $${amount} to card ${card}`);
    return { ok: true };
  }
}

class Mailer {
  send(to, subject, body) {
    console.log(`[Email] to=${to} subject=${subject} body=${body}`);
    return true;
  }
}

class Logger {
  constructor() {
    this.log = [];
  }

  add(msg) {
    const stamp = new Date().toLocaleTimeString();
    const entry = `${stamp} – ${msg}`;
    this.log.push(entry);
    if (this.log.length > 50) {
      this.log.shift();
    }
    console.log("[LOG]", entry);
  }

  recent(count = 5) {
    return this.log.slice(-count);
  }
}

// =========================
// Domain service
// =========================

class GymService {
  constructor(classRepo, memberRepo, payment, mailer, logger) {
    this.classes = classRepo;
    this.members = memberRepo;
    this.payment = payment;
    this.mailer = mailer;
    this.logger = logger;
  }

  addClass(id, name, coach, capacity) {
    if (!id || !name) {
      throw new Error("Class ID and name are required.");
    }
    if (this.classes.findById(id)) {
      throw new Error(`Class with ID ${id} already exists.`);
    }
    this.classes.addClass(id, name, coach || "TBD", capacity || 0);
    this.logger.add(`Class added: ${name} (${id})`);
  }

  registerMember(id, name, email) {
    if (!id || !name || !email) {
      throw new Error("Member ID, name and email are required.");
    }
    if (!email.includes("@")) {
      throw new Error("Invalid email format.");
    }
    if (this.members.findById(id)) {
      throw new Error(`Member with ID ${id} already exists.`);
    }
    this.members.addMember(id, name, email);
    this.mailer.send(
      email,
      "Welcome to the Gym",
      `Hello ${name}, your member id is ${id}.`
    );
    this.logger.add(`Member registered: ${name} (${id})`);
  }

  bookClass(classId, memberId, card = "1111-1111-1111-1111") {
    const cls = this.classes.findById(classId);
    if (!cls) {
      throw new Error("Class not found.");
    }

    const member = this.members.findById(memberId);
    if (!member) {
      throw new Error("Member not found.");
    }

    if (!member.active) {
      throw new Error("Member is not active.");
    }

    if (cls.spotsTaken >= cls.capacity) {
      throw new Error("Class is full.");
    }

    const fee = 10; // flat fee per booking

    const res = this.payment.charge(fee, card);
    if (!res.ok) {
      throw new Error("Payment failed.");
    }

    member.fees += fee;
    cls.spotsTaken += 1;

    this.mailer.send(
      member.email,
      "Class booking confirmed",
      `You booked ${cls.name} with ${cls.coach}. Fee: $${fee}.`
    );

    this.logger.add(
      `Booking: member ${member.id} -> class ${cls.id}, total member fees now $${member.fees}`
    );
  }

  searchClasses(term) {
    const t = term.trim().toLowerCase();
    if (!t) return this.classes.all();
    return this.classes
      .all()
      .filter(
        (c) =>
          c.id.toLowerCase().includes(t) ||
          c.name.toLowerCase().includes(t) ||
          c.coach.toLowerCase().includes(t)
      );
  }
}

// =========================
// Controller / UI
// =========================

class GymController {
  constructor(service, classRepo, memberRepo, logger) {
    this.service = service;
    this.classes = classRepo;
    this.members = memberRepo;
    this.logger = logger;
  }

  renderClasses(sel, filterTerm = "") {
    const el = document.querySelector(sel);
    if (!el) return;

    const classes = this.service.searchClasses(filterTerm);

    el.innerHTML =
      "<h3>Class Schedule</h3>" +
      "<ul>" +
      classes
        .map(
          (c) =>
            `<li><strong>${c.name}</strong> (${c.id}) – Coach: ${c.coach} – ${c.spotsTaken}/${c.capacity} booked</li>`
        )
        .join("") +
      "</ul>" +
      `<div class="muted">${this.logger.recent().join("<br>")}</div>`;
  }

  renderMember(sel, memberId) {
    const el = document.querySelector(sel);
    if (!el) return;

    const member = this.members.findById(memberId);
    if (!member) {
      el.innerHTML = "<em>No member selected.</em>";
      return;
    }

    el.innerHTML = `
      <h3>${member.name}</h3>
      <p>${member.email}</p>
      <p>Outstanding fees: $${member.fees}</p>
    `;
  }

  saveAll() {
    this.classes.save();
    this.members.save();
  }
}

// =========================
// Bootstrap / wiring
// =========================

(function () {
  const classes = new ClassRepo();
  const members = new MemberRepo();
  const logger = new Logger();
  const payment = new PaymentProvider();
  const mailer = new Mailer();

  classes.load();
  members.load();

  const service = new GymService(classes, members, payment, mailer, logger);
  const ui = new GymController(service, classes, members, logger);

  const $ = (s) => document.querySelector(s);

  // Add class
  const addClassBtn = $("#addClassBtn");
  if (addClassBtn) {
    addClassBtn.onclick = () => {
      try {
        service.addClass(
          $("#classId").value,
          $("#className").value,
          $("#classCoach").value,
          $("#classCapacity").value
        );
        ui.saveAll();
        ui.renderClasses("#schedule");
        alert("Class added.");
      } catch (err) {
        alert(err.message);
      }
    };
  }

  // Register member
  const addMemberBtn = $("#addMemberBtn");
  if (addMemberBtn) {
    addMemberBtn.onclick = () => {
      try {
        service.registerMember(
          $("#memberId").value,
          $("#memberName").value,
          $("#memberEmail").value
        );
        ui.saveAll();
        ui.renderMember("#memberInfo", $("#memberId").value);
        alert("Member registered.");
      } catch (err) {
        alert(err.message);
      }
    };
  }

  // Book class
  const bookBtn = $("#bookBtn");
  if (bookBtn) {
    bookBtn.onclick = () => {
      try {
        service.bookClass($("#bookClassId").value, $("#bookMemberId").value);
        ui.saveAll();
        ui.renderClasses("#schedule");
        ui.renderMember("#memberInfo", $("#bookMemberId").value);
        alert("Booking completed.");
      } catch (err) {
        alert(err.message);
      }
    };
  }

  // Search / filter classes
  const searchInput = $("#search");
  if (searchInput) {
    searchInput.oninput = (e) => {
      ui.renderClasses("#schedule", e.target.value);
    };
  }

  // Seed button – add some example data
  const seedBtn = $("#seedBtn");
  if (seedBtn) {
    seedBtn.onclick = () => {
      if (classes.all().length === 0) {
        service.addClass("c1", "Morning Cardio", "Ana", 10);
        service.addClass("c2", "Strength Training", "Blerim", 8);
      }
      if (members.all().length === 0) {
        service.registerMember("m1", "Ada", "ada@example.com");
        service.registerMember("m2", "Linus", "linus@example.com");
      }
      ui.saveAll();
      ui.renderClasses("#schedule");
      alert("Seeded sample data.");
    };
  }

  // Reset button – clear localStorage
  const resetBtn = $("#resetBtn");
  if (resetBtn) {
    resetBtn.onclick = () => {
      localStorage.removeItem("GYM_CLASSES");
      localStorage.removeItem("GYM_MEMBERS");
      location.reload();
    };
  }

  // Initial render
  ui.renderClasses("#schedule");
})();
