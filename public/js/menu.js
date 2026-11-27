// Side bar

const sidebar = document.getElementById("menu-lateral");
const botaoAlternar = document.querySelector(".menu-lateral__alternar");

if (sidebar && botaoAlternar) {
    botaoAlternar.setAttribute("aria-expanded", "false");

    botaoAlternar.addEventListener("click", function(){
        const estaAberta = sidebar.classList.toggle("aberto");
        botaoAlternar.setAttribute("aria-expanded", String(estaAberta));
    })
}

//sincroniza nome e foto salvos nas demais paginas

document.addEventListener('DOMContentLoaded', () => {
  try {
    const { nome, foto } = JSON.parse(localStorage.getItem('arrival_perfil_local') || '{}');
    if (!nome && !foto) return;

    if (nome) {
      document.querySelectorAll('.usuario__nome').forEach((el) => {
        el.textContent = nome;
      });
    }

    const partes = (nome || '').trim().split(/\s+/);
    const iniciais = ((partes[0]?.[0] || '') + (partes[1]?.[0] || partes[0]?.[1] || '') || '?').toUpperCase();

    document.querySelectorAll('.usuario__foto').forEach((el) => {
      el.style.background = foto ? `url("${foto}") center / cover no-repeat` : '';
      el.textContent = foto ? '' : iniciais;
    });
  } catch (err) {
    console.warn('Erro ao carregar dados do usuário:', err);
  }
});