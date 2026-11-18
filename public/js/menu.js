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