/****************************************************
 * Linor-ui.js
 * All DOM rendering functions
 ****************************************************/

export function renderInventory(service, logger) {
  const el    = document.querySelector("#app");
  const books = service.getBooks();

  el.innerHTML =
    "<h3>Library Inventory</h3>" +
    "<ul>" +
    books.map(b =>
      `<li>${b.available ? "✓" : "✗"} ${b.id}: ${b.title} — ${b.author}</li>`
    ).join("") +
    "</ul>" +
    `<small>Recent (Linor):<br>${logger.recent().join("<br>")}</small>`;
}

export function renderMemberView(service, memberId) {
  const member = service.getMemberById(memberId);
  const el     = document.querySelector("#member");

  el.innerHTML = member
    ? `<h3>${member.name}</h3>
       <p>${member.email}</p>
       <p>Fees: $${member.fees}</p>`
    : `<i>No member selected (Linor UI)</i>`;
}
