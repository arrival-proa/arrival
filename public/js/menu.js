// Side bar

const CHAVE_SIDEBAR = "arrival_sidebar_aberta";
const CHAVE_CONVERSA_SELECIONADA = "arrival_conversa_selecionada";

const sidebar = document.getElementById("menu-lateral");
const botaoAlternar = document.querySelector(".menu-lateral__alternar");
const listaConversas = document.getElementById("lista-conversas");
const botaoNovoChat = document.getElementById("botao-novo-chat");

// LocalStorage 

const CHAVE_TITULOS = "arrival_titulos_conversas";      // { "1": "Novo nome" }
const CHAVE_EXCLUIDAS = "arrival_conversas_excluidas";   // ["2", "3"]

function lerJSON(chave, padrao) {
  try { return JSON.parse(lerStorage(chave)) ?? padrao; } catch { return padrao; }
}
function salvarJSON(chave, valor) {
  salvarStorage(chave, JSON.stringify(valor));
}

function lerStorage(chave) {
  try { return localStorage.getItem(chave); } catch { return null; }
}
function salvarStorage(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch {}
}
function removerStorage(chave) {
  try { localStorage.removeItem(chave); } catch {}
}

/* ---------- Estado da sidebar ---------- */

function aplicarEstadoSidebar(aberta, { animar = true } = {}) {
  if (!sidebar) return;

  if (!animar) sidebar.classList.add("sem-transicao");

  sidebar.classList.toggle("aberto", aberta);
  botaoAlternar?.setAttribute("aria-expanded", String(aberta));

  if (!animar) {
    void sidebar.offsetWidth; // força reflow antes de religar a transição
    sidebar.classList.remove("sem-transicao");
  }

  if (!aberta) fecharOpcoes();
}

function carregarEstadoSidebar() {
  if (!sidebar || !botaoAlternar) return;
  const aberta = lerStorage(CHAVE_SIDEBAR) === "true";
  aplicarEstadoSidebar(aberta, { animar: false }); // sem animação ao carregar
}

/* ---------- Conversa selecionada ---------- */

function extrairIdConversa(href) {
  if (!href) return null;
  try {
    const url = new URL(href, window.location.href);
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
    if (encontrou) salvarStorage(CHAVE_CONVERSA_SELECIONADA, idDaUrl);
    return;
  }

  const idSalvo = lerStorage(CHAVE_CONVERSA_SELECIONADA);
  if (idSalvo) destacarConversaPorId(idSalvo);
}

/* ---------- Menu de opções (...) ---------- */

function fecharOpcoes() {
  document
    .querySelectorAll('.conversa__mais[aria-expanded="true"]')
    .forEach((botao) => {
      botao.setAttribute("aria-expanded", "false");
      document
        .getElementById(botao.getAttribute("aria-controls"))
        ?.setAttribute("hidden", "");
    });
}

function abrirOpcoes(botao) {
  const opcoes = document.getElementById(botao.getAttribute("aria-controls"));
  if (!opcoes) return;

  opcoes.removeAttribute("hidden");
  botao.setAttribute("aria-expanded", "true");

  // position: fixed, para não ser cortado pelo overflow da sidebar/lista
  const r = botao.getBoundingClientRect();
  const alturaMenu = opcoes.offsetHeight;
  const cabeEmbaixo = r.bottom + 4 + alturaMenu < window.innerHeight;

  opcoes.style.left = `${r.left - 6}px`;
  opcoes.style.top = cabeEmbaixo
    ? `${r.bottom + 4}px`
    : `${r.top - alturaMenu - 4}px`;

  opcoes.querySelector("button")?.focus();
}

function iniciarRenomear(item) {
  const link = item.querySelector(".conversa__link");
  if (!link || item.querySelector(".conversa__renomear")) return;

  const id = extrairIdConversa(link.getAttribute("href"));
  const tituloAtual = link.textContent.trim();

  const campo = document.createElement("input");
  campo.type = "text";
  campo.className = "conversa__renomear";
  campo.value = tituloAtual;
  campo.maxLength = 60;
  campo.setAttribute("aria-label", "Novo nome da conversa");

  link.hidden = true;
  link.after(campo);
  campo.focus();
  campo.select();

  let finalizado = false;

  function concluir(salvar) {
    if (finalizado) return;
    finalizado = true;

    const novo = campo.value.trim();
    if (salvar && novo && novo !== tituloAtual) {
      link.textContent = novo;
      if (id) {
        const titulos = lerJSON(CHAVE_TITULOS, {});
        titulos[id] = novo;
        salvarJSON(CHAVE_TITULOS, titulos);
        // TODO: enviar o novo nome para o backend
      }
    }

    campo.remove();
    link.hidden = false;
  }

  campo.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") concluir(true);
    if (e.key === "Escape") concluir(false);
  });
  campo.addEventListener("blur", () => concluir(true));
}

function executarAcao(acao, item) {
  const link = item.querySelector(".conversa__link");
  const href = link?.getAttribute("href");

  switch (acao) {
    case "renomear": {
      iniciarRenomear(item);
      break;
    }
    case "compartilhar": {
      // ainda não implementado
      break;
    }
    case "excluir": {
      if (!confirm("Excluir esta conversa?")) break;

      const id = extrairIdConversa(href);
      if (id) {
        const excluidas = lerJSON(CHAVE_EXCLUIDAS, []);
        if (!excluidas.includes(id)) excluidas.push(id);
        salvarJSON(CHAVE_EXCLUIDAS, excluidas);
        // TODO: pedir ao backend para excluir a conversa

        if (id === lerStorage(CHAVE_CONVERSA_SELECIONADA)) {
          removerStorage(CHAVE_CONVERSA_SELECIONADA);
        }
      }

      item.remove();

      // Se era a conversa aberta, volta para um chat novo
      const idDaUrl = new URLSearchParams(window.location.search).get("conversa");
      if (id && id === idDaUrl) window.location.href = "index.html";
      break;
    }
  }
}

/* ---------- Personalizações (renomear / excluir) ---------- */

function aplicarPersonalizacoes() {
  if (!listaConversas) return;

  const titulos = lerJSON(CHAVE_TITULOS, {});
  const excluidas = lerJSON(CHAVE_EXCLUIDAS, []);

  listaConversas.querySelectorAll(".conversa").forEach((item) => {
    const link = item.querySelector(".conversa__link");
    const id = extrairIdConversa(link?.getAttribute("href"));
    if (!id) return;

    if (excluidas.includes(id)) {
      item.remove();
    } else if (titulos[id]) {
      link.textContent = titulos[id];
    }
  });
}

/* ---------- Eventos ---------- */

botaoAlternar?.addEventListener("click", () => {
  if (!sidebar) return;
  const vaiAbrir = !sidebar.classList.contains("aberto");
  aplicarEstadoSidebar(vaiAbrir);
  salvarStorage(CHAVE_SIDEBAR, String(vaiAbrir));
});

listaConversas?.addEventListener("click", (event) => {
  // 1) botão dos três pontinhos
  const botaoMais = event.target.closest(".conversa__mais");
  if (botaoMais) {
    const jaAberto = botaoMais.getAttribute("aria-expanded") === "true";
    fecharOpcoes();
    if (!jaAberto) abrirOpcoes(botaoMais);
    return;
  }

  // 2) item do menu (Renomear / Compartilhar / Excluir)
  const botaoAcao = event.target.closest("[data-acao]");
  if (botaoAcao) {
    fecharOpcoes();                                                      // <- antes
    executarAcao(botaoAcao.dataset.acao, botaoAcao.closest(".conversa"));
    return;
  }

  if (event.target.closest(".conversa__opcoes")) return;

  // 3) clique na conversa
  const item = event.target.closest(".conversa");
  if (!item) return;

  const href = item.querySelector(".conversa__link")?.getAttribute("href");
  const idConversa = extrairIdConversa(href);

  if (idConversa) {
    salvarStorage(CHAVE_CONVERSA_SELECIONADA, idConversa);
    destacarConversaPorId(idConversa);
  }
});



// Fecha o menu de opções ao clicar fora, com Esc ou ao rolar a lista
document.addEventListener("click", (event) => {
  if (!event.target.closest(".conversa__mais, .conversa__opcoes")) fecharOpcoes();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const aberto = document.querySelector('.conversa__mais[aria-expanded="true"]');
  fecharOpcoes();
  aberto?.focus();
});

listaConversas?.addEventListener("scroll", fecharOpcoes);
window.addEventListener("resize", fecharOpcoes);

botaoNovoChat?.addEventListener("click", () => {
  removerStorage(CHAVE_CONVERSA_SELECIONADA);
  limparSelecaoConversas();
});

/* ---------- Estado de login ---------- */

// Troque por sua verificação real (token, sessão, API...)
function usuarioEstaLogado() {
  return lerStorage("arrival_logado") === "true";
}

function atualizarRodapeUsuario() {
  const rodape = document.querySelector(".menu-lateral__usuario");
  rodape?.setAttribute("data-logado", String(usuarioEstaLogado()));
}

/* ---------- Início ---------- */

function iniciarMenu() {
  carregarEstadoSidebar();
  aplicarPersonalizacoes();
  sincronizarConversaAtiva();
  atualizarRodapeUsuario();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarMenu);
} else {
  iniciarMenu();
}




