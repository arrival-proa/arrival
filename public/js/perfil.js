/* =====================================
                VARIAVÉIS 
======================================= */

const CHAVE_STORAGE = 'arrival_perfil_local';

const fotoImg = document.getElementById('perfil-foto');
const arquivoInput = document.getElementById('perfil-arquivo-foto');
const formPerfil = document.getElementById('formulario-perfil');
const nomeInput = document.getElementById('perfil-nome');
const emailInput = document.getElementById('perfil-email');
const senhaInput = document.getElementById('perfil-nova-senha');
const avisoEl = document.getElementById('aviso-perfil');
const botaoMostrarSenha = document.querySelector('.mostrar-senha');
const botaoTermos = document.querySelector('.botao-termos');
const janelaTermos = document.getElementById('janela-termos');
const planoTituloEl = document.getElementById('plano-atual');
const secaoCrewEl = document.getElementById('secao-crew');

const TIPOS_PERMITIDOS = [
    'image/jpeg', 
    'image/png', 
    'image/webp'
];
const TAMANHO_MAX_MB = 8;

let fotoDataUrlPendente = null;
let estadoAtual = {
  nome: '',
  email: '',
  foto: '',
  plano: 'essencial'
};

//FUNÇÃO MOSTRAR AVISO PARA FEEDBACK VISUAL

function mostrarAviso(mensagem, tipo = 'info') {
  if (!avisoEl) return;
  avisoEl.textContent = mensagem;
  avisoEl.dataset.tipo = tipo;
  avisoEl.hidden = !mensagem;
}