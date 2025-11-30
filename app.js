import { LibraryService } from "./domain/LibraryService.js";
import { BookRepo } from "./repos/BookRepo.js";
import { MemberRepo } from "./repos/MemberRepo.js";
import { LocalStorageAdapter } from "./storage/LocalStorageAdapter.js";
import { EmailNotifier } from "./services/EmailNotifier.js";
import { PaymentProvider } from "./services/PaymentProvider.js";
import { renderInventory, renderMember } from "./ui/render.js";
import { registerUIEvents } from "./ui/events.js";

const bookRepo = new BookRepo(LocalStorageAdapter);
const memberRepo = new MemberRepo(LocalStorageAdapter);

const service = new LibraryService(
  bookRepo,
  memberRepo,
  EmailNotifier,
  PaymentProvider
);

function renderUI(searchResults = null) {
  const list = searchResults || bookRepo.books;
  document.querySelector("#app").innerHTML = renderInventory(list);

  const memberId = document.querySelector("#memberId").value;
  const m = memberRepo.get(memberId);
  document.querySelector("#member").innerHTML = renderMember(m);
}

registerUIEvents(service, bookRepo, memberRepo, renderUI);
renderUI();

