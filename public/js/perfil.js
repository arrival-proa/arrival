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

// Aplica atualização da sidebar ao alterar o nome e foto

function atualizarSidebar({ nome, foto } = {}) {
  if (nome) {
    document.querySelectorAll('.usuario__nome').forEach((el) => {
      el.textContent = nome;
    });
  }

  const [primeiro = '', segundo = ''] = (nome || '').trim().split(/\s+/);
  const iniciais = (primeiro[0] || segundo[0] || '?') + (segundo[0] || primeiro[1] || '');

  document.querySelectorAll('.usuario__foto').forEach((el) => {
    el.style.backgroundImage = foto ? `url("${foto}")` : '';
    el.style.backgroundSize = foto ? 'cover' : '';
    el.style.backgroundPosition = foto ? 'center' : '';
    el.textContent = foto ? '' : iniciais.toUpperCase();
  });
}

// Atualização do plano

function atualizarPlano(plano = 'essencial') {
  const mapa = {
    essencial: 'Plano Essencial',
    pro: 'Plano Arrival Pro',
    crew: 'Plano Arrival Crew'
  };
  const chave = String(plano).toLowerCase();
  if (planoTituloEl) planoTituloEl.textContent = mapa[chave] || 'Plano Essencial';
  if (secaoCrewEl) secaoCrewEl.hidden = chave !== 'crew';
}

// A função carregarEstadoLocal() lê os dados salvos no localStorage quando a tela abre e preenche os campos do formulário, a foto, a sidebar e o plano com o estado atual.

function carregarEstadoLocal() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_STORAGE) || 'null');
    if (salvo) {
      estadoAtual = { ...estadoAtual, ...salvo };
    }
  } catch (err) {
    console.warn('Não foi possível ler o perfil local:', err);
  }

  if (nomeInput && estadoAtual.nome) nomeInput.value = estadoAtual.nome;
  if (emailInput && estadoAtual.email) emailInput.value = estadoAtual.email;
  if (fotoImg && estadoAtual.foto) fotoImg.src = estadoAtual.foto;

  atualizarSidebar(estadoAtual);
  atualizarPlano(estadoAtual.plano);
}

// Funcionalidade de fazer um corte na imagem escolhida pelo usuário, centralizando a foto.

function processarImagemQuadrada(arquivo, tamanho = 512, qualidade = 0.85) {
  return new Promise((resolve, reject) => {
    const urlTemp = URL.createObjectURL(arquivo);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(urlTemp);
      const lado = Math.min(img.width, img.height);
      const sx = (img.width - lado) / 2;
      const sy = (img.height - lado) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = tamanho;
      canvas.height = tamanho;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, lado, lado, 0, 0, tamanho, tamanho);
      resolve(canvas.toDataURL('image/webp', qualidade));
    };

    img.onerror = () => {
      URL.revokeObjectURL(urlTemp);
      reject(new Error('Arquivo de imagem inválido.'));
    };

    img.src = urlTemp;
  });
}
