// Side bar

const CHAVE_SIDEBAR = "arrival_sidebar_aberta";
const CHAVE_CONVERSA_SELECIONADA = "arrival_conversa_selecionada";

const sidebar = document.getElementById("menu-lateral");
const botaoAlternar = document.querySelector(".menu-lateral__alternar");
const listaConversas = document.getElementById("lista-conversas");
const botaoNovoChat = document.getElementById("botao-novo-chat");

function aplicarEstadoSidebar(aberta) {
  if (!sidebar) return;
  sidebar.classList.toggle("aberto", aberta);
  botaoAlternar?.setAttribute("aria-expanded", String(aberta));
}

function carregarEstadoSidebar() {
  if (!sidebar || !botaoAlternar) return;
  const salvo = localStorage.getItem(CHAVE_SIDEBAR);
  const aberta = salvo === "true";
  aplicarEstadoSidebar(aberta);
}

function extrairIdConversa(href) {
  if (!href) return null;
  try {
    const url = new URL(href, window.location.origin);
    return url.searchParams.get("conversa");
  } catch {
    return null;
  }
}

function limparSelecaoConversas() {
  if (!listaConversas) return;
  listaConversas.querySelectorAll(".conversa.selecionada").forEach((item) => {
    item.classList.remove("selecionada");
  });
}

function destacarConversaPorId(idConversa) {
  if (!listaConversas || !idConversa) return false;

  const itens = Array.from(listaConversas.querySelectorAll(".conversa"));
  const alvo = itens.find((item) => {
    const href = item.querySelector(".conversa__link")?.getAttribute("href");
    return extrairIdConversa(href) === String(idConversa);
  });

  if (!alvo) return false;

  limparSelecaoConversas();
  alvo.classList.add("selecionada");
  return true;
}

function sincronizarConversaAtiva() {
  if (!listaConversas) return;

  const params = new URLSearchParams(window.location.search);
  const idDaUrl = params.get("conversa");

  if (idDaUrl) {
    const encontrou = destacarConversaPorId(idDaUrl);
    if (encontrou) {
      localStorage.setItem(CHAVE_CONVERSA_SELECIONADA, idDaUrl);
    }
    return;
  }

  const idSalvo = localStorage.getItem(CHAVE_CONVERSA_SELECIONADA);
  if (idSalvo) {
    destacarConversaPorId(idSalvo);
  }
}

botaoAlternar?.addEventListener("click", () => {
  if (!sidebar) return;
  const vaiAbrir = !sidebar.classList.contains("aberto");
  aplicarEstadoSidebar(vaiAbrir);
  localStorage.setItem(CHAVE_SIDEBAR, String(vaiAbrir));
});

listaConversas?.addEventListener("click", (event) => {
  const clicouNoMenu = event.target.closest(".conversa__mais, .conversa__opcoes");
  if (clicouNoMenu) return;

  const item = event.target.closest(".conversa");
  if (!item) return;

  const href = item.querySelector(".conversa__link")?.getAttribute("href");
  const idConversa = extrairIdConversa(href);

  if (idConversa) {
    localStorage.setItem(CHAVE_CONVERSA_SELECIONADA, idConversa);
    destacarConversaPorId(idConversa);
  }
});

botaoNovoChat?.addEventListener("click", () => {
  localStorage.removeItem(CHAVE_CONVERSA_SELECIONADA);
  limparSelecaoConversas();
});

function iniciarMenu() {
  carregarEstadoSidebar();
  sincronizarConversaAtiva();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarMenu);
} else {
  iniciarMenu();
}



