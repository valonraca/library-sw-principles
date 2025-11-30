export function registerUIEvents(service, bookRepo, memberRepo, renderUI) {
  const $ = sel => document.querySelector(sel);

  $("#add").onclick = () => {
    const res = service.addBook($("#id").value, $("#title").value, $("#author").value);
    if (!res.ok) alert(res.error);
    renderUI();
  };

  $("#reg").onclick = () => {
    const res = service.registerMember($("#mid").value, $("#mname").value, $("#memail").value);
    if (!res.ok) alert(res.error);
    renderUI();
  };

  $("#checkout").onclick = () => {
    const res = service.checkout($("#bookId").value, $("#memberId").value);
    if (!res.ok) alert(res.error);
    renderUI();
  };

  $("#search").oninput = e => {
    const result = service.search(e.target.value);
    renderUI(result);
  };

  $("#seed").onclick = () => {
    if (bookRepo.books.length === 0) {
      service.addBook("b1", "Clean Code", "Robert C. Martin");
      service.addBook("b2", "Design Patterns", "GoF");
    }
    if (memberRepo.members.length === 0) {
      service.registerMember("m1", "Ada", "ada@example.com");
      service.registerMember("m2", "Linus", "linus@example.com");
    }
    renderUI();
  };

  $("#reset").onclick = () => {
    localStorage.clear();
    location.reload();
  };
}
