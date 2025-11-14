// inicio.js - Script para a página de login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMe = document.getElementById('rememberMe');

    // Função para mostrar mensagens de erro/sucesso
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

        // Remove automaticamente após 5 segundos
        if (type === 'error') {
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
    }

    // Função para fazer login
    async function handleLogin(username, password) {
        try {
            // Mostrar loading
            loginButton.textContent = 'Entrando...';
            loginButton.disabled = true;
            loginButton.style.opacity = '0.8';

            const response = await fetch('/api/login', {
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
                showMessage('Login realizado com sucesso!', 'success');

                // Salvar dados do usuário no localStorage se "Lembre-se de mim" estiver marcado
                if (rememberMe.checked) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                } else {
                    sessionStorage.setItem('user', JSON.stringify(data.user));
                }

                // Redirecionar após sucesso
                setTimeout(() => {
                    if (data.user.is_admin) {
                        window.location.href = '/profile/prof.html'; // Página de admin
                    } else {
                        window.location.href = '/profile/prof.html'; // Página principal de usuário
                    }
                }, 1500);

            } else {
                showMessage(data.error || 'Erro ao fazer login');
                // Restaurar botão
                loginButton.textContent = 'Entrar';
                loginButton.disabled = false;
                loginButton.style.opacity = '1';
            }

        } catch (error) {
            console.error('Erro:', error);
            showMessage('Erro de conexão. Tente novamente.');

            // Restaurar botão
            loginButton.textContent = 'Entrar';
            loginButton.disabled = false;
            loginButton.style.opacity = '1';
        }
    }

    // Verificar se já existe usuário logado (para "Lembre-se de mim")
    // function checkExistingLogin() {
    //     const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    //     if (savedUser) {
    //         const user = JSON.parse(savedUser);
    //         // Preencher automaticamente e redirecionar
    //         usernameInput.value = user.username;
    //         showMessage(`Bem-vindo de volta, ${user.username}! Redirecionando...`, 'success');
    //
    //         setTimeout(() => {
    //             window.location.href = '/profile/prof.html';
    //         }, 1000);
    //     }
    // }

    // Event listener para o formulário
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        // Validações básicas
        if (!username) {
            showMessage('Por favor, digite seu usuário');
            usernameInput.focus();
            return;
        }

        if (!password) {
            showMessage('Por favor, digite sua senha');
            passwordInput.focus();
            return;
        }

        if (password.length < 6) {
            showMessage('A senha deve ter pelo menos 6 caracteres');
            passwordInput.focus();
            return;
        }

        // Fazer login
        handleLogin(username, password);
    });

    // Efeitos visuais nos inputs
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


    // Efeito no checkbox "Lembre-se de mim"
    // rememberMe.addEventListener('change', function() {
    //     const checkmark = this.nextElementSibling;
    //     if (this.checked) {
    //         checkmark.style.transform = 'scale(1.1)';
    //         setTimeout(() => {
    //             checkmark.style.transform = 'scale(1)';
    //         }, 200);
    //     }
    // });

    // Efeito no botão de registro
    const registerButton = document.querySelector('.register-button');
    registerButton.addEventListener('click', function() {
        this.textContent = 'Redirecionando...';
        this.style.background = 'rgba(142, 45, 226, 0.2)';

        setTimeout(() => {
            window.location.href = '/register';
        }, 500);
    });

    // Tecla Enter para submit
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });

    // Verificar login existente ao carregar a página
    checkExistingLogin();
});