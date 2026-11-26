/* ==========================================
              CADASTRO
========================================== */

const formularioCadastro = document.getElementById('formulario-cadastro');

if (formularioCadastro) {
  const campoEmail = document.getElementById('cadastro-email');
  const campoNome = document.getElementById('cadastro-nome');
  const campoSenha = document.getElementById('cadastro-senha');
  const campoTermos = document.getElementById('cadastro-termos');

  const botaoSenha = formularioCadastro.querySelector('.mostrar-senha');
  const botaoTermos = formularioCadastro.querySelector('.botao-termos');
  const janelaTermos = document.getElementById('janela-termos');
  const erroCadastro = document.getElementById('erro-cadastro');
  const sucessoCadastro = document.getElementById('sucesso-cadastro');
  const botaoCadastro = formularioCadastro.querySelector('.botao-principal');

  // Estado de carregamento do cadastro
  function definirCarregamento(carregando) {
    botaoCadastro.disabled = carregando;

    botaoCadastro.textContent = carregando ? 'Criando conta...' : 'Criar conta';

    formularioCadastro.setAttribute('aria-busy', String(carregando));
  }

  // Mostrar e ocultar senha
  botaoSenha.addEventListener('click', () => {
    const senhaVisivel = campoSenha.type === 'text';

    campoSenha.type = senhaVisivel ? 'password' : 'text';

    botaoSenha.setAttribute('aria-pressed', String(!senhaVisivel));
  });

  // Abrir janela de termos
  botaoTermos.addEventListener('click', () => {
    janelaTermos.showModal();
  });

  // Exibir mensagem de erro
  function mostrarErro(campo, idErro, mensagem) {
    const erro = document.getElementById(idErro);

    campo.setAttribute('aria-invalid', 'true');
    erro.textContent = mensagem;
    erro.hidden = false;
  }

  // Remover mensagem de erro
  function limparErro(campo, idErro) {
    const erro = document.getElementById(idErro);

    campo.removeAttribute('aria-invalid');
    erro.textContent = '';
    erro.hidden = true;
  }

  // Validação individual dos campos
  function validarEmail() {
    limparErro(campoEmail, 'erro-email');

    if (!campoEmail.value.trim()) {
      mostrarErro(campoEmail, 'erro-email', 'Informe seu endereço de email.');
      return false;
    }

    if (campoEmail.validity.typeMismatch) {
      mostrarErro(campoEmail, 'erro-email', 'Informe um endereço de email válido.');
      return false;
    }

    return true;
  }

  function validarNome() {
    limparErro(campoNome, 'erro-nome');

    if (!campoNome.value.trim()) {
      mostrarErro(campoNome, 'erro-nome', 'Informe seu nome completo.');
      return false;
    }

    return true;
  }

  function validarSenha() {
    limparErro(campoSenha, 'erro-senha');

    if (!campoSenha.value) {
      mostrarErro(campoSenha, 'erro-senha', 'Informe uma senha.');
      return false;
    }

    if (campoSenha.value.length < 8) {
      mostrarErro(campoSenha, 'erro-senha', 'A senha deve ter no mínimo 8 caracteres.');
      return false;
    }

    return true;
  }

  function validarTermos() {
    limparErro(campoTermos, 'erro-termos');

    if (!campoTermos.checked) {
      mostrarErro(campoTermos, 'erro-termos', 'Você precisa aceitar os termos de uso.');
      return false;
    }

    return true;
  }

  // Atualizar mensagens durante o preenchimento
  campoEmail.addEventListener('input', () => {
    if (campoEmail.hasAttribute('aria-invalid')) {
      validarEmail();
    }
  });

  campoNome.addEventListener('input', () => {
    if (campoNome.hasAttribute('aria-invalid')) {
      validarNome();
    }
  });

  campoSenha.addEventListener('input', () => {
    if (campoSenha.hasAttribute('aria-invalid')) {
      validarSenha();
    }
  });

  campoTermos.addEventListener('change', () => {
    if (campoTermos.hasAttribute('aria-invalid')) {
      validarTermos();
    }
  });

  // Envio do formulário
  formularioCadastro.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (botaoCadastro.disabled) {
      return;
    }

    erroCadastro.hidden = true;
    erroCadastro.textContent = '';
    sucessoCadastro.hidden = true;
    sucessoCadastro.textContent = '';

    const emailValido = validarEmail();
    const nomeValido = validarNome();
    const senhaValida = validarSenha();
    const termosValidos = validarTermos();

    if (!emailValido || !nomeValido || !senhaValida || !termosValidos) {
      formularioCadastro.querySelector('[aria-invalid="true"]').focus();
      return;
    }

    // Integração com Supabase será adicionada posteriormente.
  });
}
