const books = new BookRepo();
const members = new MemberRepo();
const library = new LibraryService(books, members, payment, notifier);

document.getElementById("add").onclick = function () {
  try {
    library.addBook(
      document.getElementById("id").value,
      document.getElementById("title").value,
      document.getElementById("author").value
    );
    renderInventory();
  } catch (e) {
    alert(e.message);
  }
};

document.getElementById("reg").onclick = function () {
  try {
    library.registerMember(
      document.getElementById("mid").value,
      document.getElementById("mname").value,
      document.getElementById("memail").value
    );
    renderMembers();
  } catch (e) {
    alert(e.message);
  }
};

document.getElementById("checkout").onclick = function () {
  try {
    library.checkoutBook(
      document.getElementById("bookId").value,
      document.getElementById("memberId").value
    );
    renderInventory();
    renderMembers();
  } catch (e) {
    alert(e.message);
  }
};

document.getElementById("search").oninput = function (e) {
  const term = e.target.value;
  renderInventory(library.search(term));
};

document.getElementById("reset").onclick = function () {
  localStorage.clear();
  location.reload();
};


function renderInventory(list) {
  const booksToShow = list || books.getAll();
  const el = document.getElementById("app");

  el.innerHTML =
    "<h3>Inventory</h3><ul>" +
    booksToShow
      .map(
        b =>
          "<li><strong>" +
          (b.available ? "✓" : "✗") +
          "</strong> " +
          b.id +
          ": " +
          b.title +
          " — " +
          b.author +
          "</li>"
      )
      .join("") +
    "</ul>";
}

function renderMembers() {
  const el = document.getElementById("member");
  const list = members.getAll();

  el.innerHTML = list
    .map(
      m =>
        "<h3>" +
        m.name +
        "</h3><p>" +
        m.email +
        "</p><p>Fees: $" +
        m.fees +
        "</p>"
    )
    .join("");
}

document.getElementById("seed").onclick = function () {

  if (books.getAll().length === 0) {
    library.addBook("b1", "Clean Code", "Robert Martin");
    library.addBook("b2", "Design Patterns", "GoF");
    library.addBook("b3", "JavaScript: The Good Parts", "Douglas Crockford");
  }

  if (members.getAll().length === 0) {
    library.registerMember("m1", "Ada", "ada@example.com");
    library.registerMember("m2", "Linus", "linus@example.com");
    library.registerMember("m3", "Alan", "alan@example.com");
  }

  renderInventory();
  renderMembers();
  alert("Demo data seeded!");
};

function renderMembers() {
  const el = document.querySelector('#member');
  const membersList = members.getAll();
  el.innerHTML = membersList
    .map(
      m => `<h3>${m.name} (ID: ${m.id})</h3>
            <p>${m.email}</p>
            <p>Fees: $${m.fees}</p>`
    )
    .join('');
}
 
renderInventory();
renderMembers();
