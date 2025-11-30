/****************************************************
 * Linor-app.js
 * Wires everything and connects to browser UI
 ****************************************************/

import { LibraryService } from "./Linor-libraryService.js";
import { LocalStorageBookRepo, LocalStorageMemberRepo } from "./Linor-repositories.js";
import { FakeStripePaymentProvider, ConsoleEmailNotifier, InMemoryLogger } from "./Linor-ports.js";
import { renderInventory, renderMemberView } from "./Linor-ui.js";

// Setup dependencies
const logger    = new InMemoryLogger();
const bookRepo  = new LocalStorageBookRepo();
const memberRepo= new LocalStorageMemberRepo();
const payment   = new FakeStripePaymentProvider();
const notifier  = new ConsoleEmailNotifier();

// Core service (domain)
const service = new LibraryService(bookRepo, memberRepo, payment, notifier, logger);

const $ = sel => document.querySelector(sel);

function refresh(memberId) {
  renderInventory(service, logger);
  if (memberId) {
    renderMemberView(service, memberId);
  }
}

// initial render
refresh();

// --- UI handlers (no domain logic here) ---

$("#add").onclick = () => {
  const result = service.addBook(
    $("#id").value,
    $("#title").value,
    $("#author").value
  );
  if (!result.ok) alert(result.error);
  refresh();
};

$("#reg").onclick = () => {
  const mid = $("#mid").value;
  const result = service.registerMember(
    mid,
    $("#mname").value,
    $("#memail").value
  );
  if (!result.ok) alert(result.error);
  refresh(mid);
};

$("#checkout").onclick = () => {
  const mid = $("#memberId").value;
  const result = service.checkoutBook($("#bookId").value, mid);
  if (!result.ok) alert(result.error);
  refresh(mid);
};

$("#search").oninput = e => {
  service.search(e.target.value); // we just log; UI shows full inventory
  refresh();
};

$("#seed").onclick = () => {
  if (!service.getBooks().length) {
    service.addBook("b1", "Clean Code", "Martin");
    service.addBook("b2", "Design Patterns", "GoF");
  }
  if (!service.getMembers().length) {
    service.registerMember("m1", "Ada", "ada@mail.com");
    service.registerMember("m2", "Linus", "linus@mail.com");
  }
  alert("Seeded (Linor)");
  refresh();
};

$("#reset").onclick = () => {
  localStorage.removeItem("LIB_DATA");
  location.reload();
};
