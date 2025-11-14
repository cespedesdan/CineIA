document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.querySelector('.login-form');
    const passwordInput = document.querySelector('input[type="password"]');
    const confirmPasswordInput = document.querySelectorAll('input[type="password"]')[1];
    const matchText = document.querySelector('.match-text');
    const termsCheckbox = document.getElementById('terms');
    const usernameInput = document.querySelector('input[type="text"]');

    // Função para mostrar mensagens
    function showMessage(message, type = 'error') {
        // Remove mensagens anteriores
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            padding: 12px;
            margin: 10px 0;
            border-radius: 8px;
            text-align: center;
            font-weight: 500;
            ${type === 'error' ?
            'background: #fee; color: #c33; border: 1px solid #fcc;' :
            'background: #efe; color: #363; border: 1px solid #cfc;'
        }
        `;

        // Insere a mensagem após o header
        const header = document.querySelector('.login-header');
        header.parentNode.insertBefore(messageDiv, header.nextSibling);

        // Remove automaticamente após 5 segundos para erros
        if (type === 'error') {
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
    }

    // Verificação de confirmação de senha
    confirmPasswordInput.addEventListener('input', function() {
        const password = passwordInput.value;
        const confirmPassword = this.value;

        if (confirmPassword === '') {
            matchText.textContent = '';
            matchText.className = 'match-text';
        } else if (password === confirmPassword) {
            matchText.textContent = '✓ Senhas coincidem';
            matchText.className = 'match-text valid';
        } else {
            matchText.textContent = '✗ Senhas não coincidem';
            matchText.className = 'match-text invalid';
        }
    });

    // Função para fazer o registro
    async function handleRegister(username, password) {
        try {
            const registerButton = registerForm.querySelector('.login-button');
            registerButton.textContent = 'Criando conta...';
            registerButton.disabled = true;
            registerButton.style.opacity = '0.8';

            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const data = await response.json();

            if (data.success) {
                showMessage('Conta criada com sucesso! Redirecionando para login...', 'success');

                // Redirecionar para login após sucesso
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);

            } else {
                showMessage(data.error || 'Erro ao criar conta');
                // Restaurar botão
                registerButton.textContent = 'Criar conta';
                registerButton.disabled = false;
                registerButton.style.opacity = '1';
            }

        } catch (error) {
            console.error('Erro:', error);
            showMessage('Erro de conexão. Tente novamente.');

            // Restaurar botão
            const registerButton = registerForm.querySelector('.login-button');
            registerButton.textContent = 'Criar conta';
            registerButton.disabled = false;
            registerButton.style.opacity = '1';
        }
    }

    // Submit do formulário
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // Validações
        if (!username) {
            showMessage('Por favor, digite um nome de usuário');
            usernameInput.focus();
            return;
        }

        if (!password) {
            showMessage('Por favor, digite uma senha');
            passwordInput.focus();
            return;
        }

        if (password.length < 6) {
            showMessage('A senha deve ter pelo menos 6 caracteres');
            passwordInput.focus();
            return;
        }

        if (password !== confirmPassword) {
            showMessage('As senhas não coincidem');
            confirmPasswordInput.focus();
            return;
        }

        if (!termsCheckbox.checked) {
            showMessage('Você deve aceitar os termos de serviço e política de privacidade');
            return;
        }

        // Fazer registro
        handleRegister(username, password);
    });

    // Efeito de foco nos inputs
    const inputs = document.querySelectorAll('.input-field');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'translateY(-2px)';
            this.parentElement.style.borderColor = '#8e2de2';
        });

        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'translateY(0)';
            this.parentElement.style.borderColor = '#e1e5e9';
        });

        // Limpar mensagem de erro quando usuário começar a digitar
        input.addEventListener('input', function() {
            const existingMessage = document.querySelector('.message.error');
            if (existingMessage) {
                existingMessage.remove();
            }
        });
    });

    // Efeito no checkbox de termos
    termsCheckbox.addEventListener('change', function() {
        const checkmark = this.nextElementSibling;
        if (this.checked) {
            checkmark.style.transform = 'scale(1.1)';
            setTimeout(() => {
                checkmark.style.transform = 'scale(1)';
            }, 200);
        }
    });

    // Links para termos e privacidade
    const termsLink = document.querySelector('a[href*="terms"]');
    const privacyLink = document.querySelector('a[href*="privacy"]');

    if (termsLink) {
        termsLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/terms';
        });
    }

    if (privacyLink) {
        privacyLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/privacy';
        });
    }

    // Link para voltar ao login
    const loginLink = document.querySelector('.register-button');
    if (loginLink) {
        loginLink.addEventListener('click', function() {
            this.textContent = 'Redirecionando...';
            this.style.background = 'rgba(142, 45, 226, 0.2)';

            setTimeout(() => {
                window.location.href = '/';
            }, 500);
        });
    }

    // Tecla Enter para submit
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            registerForm.dispatchEvent(new Event('submit'));
        }
    });
});