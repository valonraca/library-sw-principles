import { LibraryService } from "./domain/LibraryService.js";
import { LocalStorageBookRepo } from "./infrastructure/LocalStorageBookRepo.js";
import { LocalStorageMemberRepo } from "./infrastructure/LocalStorageMemberRepo.js";
import { FakeStripe } from "./infrastructure/FakeStripe.js";
import { EmailNotifier } from "./infrastructure/EmailNotifier.js";

const service = new LibraryService(
  new LocalStorageBookRepo(),
  new LocalStorageMemberRepo(),
  FakeStripe,
  EmailNotifier
);

function renderInventory() {
  const books = service.search("");

  document.querySelector("#app").innerHTML =
    `<h3>Inventory</h3>
     <ul>
       ${books.map(b =>
         `<li>${b.available ? "<span class='ok'>✓</span>" : "<span class='no'>✗</span>"} 
            ${b.id}: ${b.title} — ${b.author}
          </li>`
       ).join("")}
     </ul>`;
}

document.querySelector("#add").onclick = () => {
  const res = service.addBook(id.value, title.value, author.value);
  if (res.error) alert(res.error);
  renderInventory();
};

document.querySelector("#reg").onclick = () => {
  const res = service.registerMember(mid.value, mname.value, memail.value);
  if (res.error) alert(res.error);
};

document.querySelector("#checkout").onclick = () => {
  const res = service.checkoutBook(bookId.value, memberId.value);
  if (res.error) alert(res.error);
  renderInventory();
};

document.querySelector("#search").oninput = () => {
  renderInventory();
};

renderInventory();
