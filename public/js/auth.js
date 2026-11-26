/* ==========================================
              CADASTRO
========================================== */

const formularioCadastro = document.getElementById('formulario-cadastro');

if (formularioCadastro) {
  const campoSenha = document.getElementById('cadastro-senha');
  const botaoSenha = formularioCadastro.querySelector('.mostrar-senha');

  // Mostrar e ocultar senha
  botaoSenha.addEventListener('click', () => {
    const senhaVisivel = campoSenha.type === 'text';

    campoSenha.type = senhaVisivel ? 'password' : 'text';

    botaoSenha.setAttribute('aria-pressed', String(!senhaVisivel));
  });

  // Abrir janela de termos
  const botaoTermos = formularioCadastro.querySelector('.botao-termos');
  const janelaTermos = document.getElementById('janela-termos');

  botaoTermos.addEventListener('click', () => {
    janelaTermos.showModal();
  });

  // Validação do cadastro
  const campoEmail = document.getElementById('cadastro-email');
  const campoNome = document.getElementById('cadastro-nome');
  const campoTermos = document.getElementById('cadastro-termos');
  const erroCadastro = document.getElementById('erro-cadastro');

  formularioCadastro.addEventListener('submit', (evento) => {
    evento.preventDefault();

    erroCadastro.hidden = true;
    erroCadastro.textContent = '';

    const email = campoEmail.value.trim();
    const nome = campoNome.value.trim();
    const senha = campoSenha.value;

    if (!email || !nome || !senha) {
      erroCadastro.textContent = 'Preencha todos os campos.';
    } else if (senha.length < 8) {
      erroCadastro.textContent = 'A senha deve ter no mínimo 8 caracteres.';
    } else if (!campoTermos.checked) {
      erroCadastro.textContent = 'Você precisa aceitar os termos de uso.';
    }

    if (erroCadastro.textContent) {
      erroCadastro.hidden = false;
      return;
    }

    // Integração com Supabase será adicionada posteriormente.
  });
}
