// Estado global
let favorites = JSON.parse(localStorage.getItem('cineia_favorites')) || [];
let currentUserId = null;
let currentUser = null;
let allMovies = [];

// 🔥 FUNÇÃO DE SEGURANÇA PARA GARANTIR ID
function getCurrentUserId() {
    if (currentUserId) {
        return currentUserId;
    }
    if (currentUser && currentUser.id) {
        currentUserId = currentUser.id;
        return currentUserId;
    }

    // Fallback: tentar obter do storage
    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            currentUserId = userData.id;
            return currentUserId;
        } catch (error) {
            console.error('Erro ao parsear usuário do storage:', error);
        }
    }

    console.warn('⚠️ Nenhum ID de usuário encontrado, usando fallback 1');
    return 1; // Fallback absoluto
}


// ✅ INICIALIZAÇÃO NO COMEÇO
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 CineIA - Página carregada');
    initializeProfile();
});

// No initializeProfile():
async function initializeProfile() {
    console.log('🚀 Iniciando profile...');

    // 1. Carregar usuário
    await checkUserLogin();

    // 2. Atualizar nome IMEDIATAMENTE
    updateUsernameDisplay(currentUser.username);

    // 3. Configurar resto
    setupModal();
    setupEventListeners();
    checkAdminStatus(currentUser);

    // 4. Carregar avaliações e contador
    await loadRatedMovies();
    await updateMoviesCount(); // ✅ CHAMADA DIRETA

    loadSavedProfile();
    console.log('✅ Profile inicializado');
}

// ======================================
// =======FUNÇÕES INTERNAS DO SISTEMA====
// ======================================

// 🎯 VERSÃO ULTRA SIMPLIFICADA
// 🔥 OBTER QUANTIDADE DE FILMES AVALIADOS (CORRIGIDA)
async function getRatedMoviesCount() {
    try {
        const userId = getCurrentUserId();
        console.log('🔢 Buscando TOTAL de avaliações para usuário ID:', userId);

        // ✅ USAR O ENDPOINT QUE RETORNA O TOTAL, NÃO APENAS OS RECENTES
        const response = await fetch(`/api/user/${userId}/ratings/count`);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('📊 Resposta da API de contagem TOTAL:', data);

        if (data.success) {
            console.log('✅ Total de avaliações:', data.count);
            return data.count;
        } else {
            throw new Error(data.error || 'Erro ao obter contagem total');
        }
    } catch (error) {
        console.error('❌ Erro ao obter quantidade total de filmes:', error);

        // ✅ FALLBACK: Se o endpoint de count não existir, usar o total de recent-ratings
        try {
            const fallbackResponse = await fetch(`/api/user/${getCurrentUserId()}/recent-ratings`);
            const fallbackData = await fallbackResponse.json();
            return fallbackData.count || 0;
        } catch (fallbackError) {
            return 0;
        }
    }
}

// 🔥 ATUALIZAR CONTADOR NA INTERFACE (CORRIGIDA)
async function updateMoviesCount() {
    try {
        const count = await getRatedMoviesCount();

        // ✅ AGUARDAR UM POUCO PARA GARANTIR QUE O DOM ESTÁ PRONTO
        setTimeout(() => {
            const moviesCountElement = document.getElementById('moviesCount');

            console.log('🔍 Procurando elemento moviesCount:', moviesCountElement);
            console.log('🎯 Quantidade obtida:', count);

            if (moviesCountElement) {
                moviesCountElement.textContent = `${count} FILMES AVALIADOS`;
                console.log('✅ Contador atualizado com sucesso');
            } else {
                console.error('❌ Elemento moviesCount não encontrado no DOM');

                // ✅ TENTAR NOVAMENTE APÓS MAIS TEMPO
                setTimeout(() => {
                    const retryElement = document.getElementById('moviesCount');
                    if (retryElement) {
                        retryElement.textContent = `${count} FILMES AVALIADOS`;
                        console.log('✅ Contador atualizado na segunda tentativa');
                    }
                }, 500);
            }
        }, 200);

    } catch (error) {
        console.error('❌ Erro ao atualizar contador:', error);
    }
}

// 🔥 FUNÇÃO PARA ATUALIZAR O NOME NA INTERFACE (CORRIGIDA)
function updateUsernameDisplay(username) {
    console.log('👤 Atualizando display do usuário:', username);

    // ✅ FUNÇÃO SIMPLIFICADA E DIRETA
    function updateUsername() {
        const userDisplayElements = document.querySelectorAll(
            '#userName, .user-name, .username-display, [data-username]'
        );

        console.log(`🔍 Encontrados ${userDisplayElements.length} elementos para username`);

        let updated = false;
        userDisplayElements.forEach(element => {
            console.log('📝 Atualizando elemento:', element.id || element.className);
            element.textContent = username;
            element.style.display = 'inline';
            element.style.visibility = 'visible';
            updated = true;
        });

        if (!updated) {
            console.log('⚠️ Nenhum elemento de username encontrado');
        }
    }

    // ✅ TENTATIVAS EM DIFERENTES TIMINGS
    // updateUsername(); // Tentativa imediata

    // setTimeout(updateUsername, 100); // Tentativa rápida
    setTimeout(updateUsername, 300); // Tentativa após DOM carregar
}


// 🔥 FUNÇÃO setupEventListeners
function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');

    // Adicione aqui todos os event listeners básicos
    // Exemplo:
    const changeProfileBtn = document.getElementById('changeProfileBtn');
    if (changeProfileBtn) {
        changeProfileBtn.addEventListener('click', () => {
            // Sua lógica para abrir modal de perfil
        });
    }

    // Outros event listeners necessários...
    console.log('✅ Event listeners configurados');
}

// Verificar login do usuário E buscar dados do banco
// 🔥 FUNÇÃO checkUserLogin
async function checkUserLogin() {
    return new Promise(async (resolve) => {
        try {
            console.log('🔐 Verificando login do usuário...');
            const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');

            if (savedUser) {
                const userData = JSON.parse(savedUser);
                console.log('✅ Usuário encontrado no storage:', userData);

                // BUSCAR DADOS ATUALIZADOS DO BANCO
                const userInfo = await fetchUserFromDatabase(userData.id);

                if (userInfo) {
                    currentUser = userInfo;
                    currentUserId = userInfo.id;
                    console.log('✅ Usuário carregado do banco:', currentUser.username, 'ID:', currentUserId);

                    // Atualizar storage
                    if (localStorage.getItem('user')) {
                        localStorage.setItem('user', JSON.stringify(currentUser));
                    } else {
                        sessionStorage.setItem('user', JSON.stringify(currentUser));
                    }

                    resolve(true);
                } else {
                    console.error('❌ Usuário não encontrado no banco');
                    logoutUser();
                    resolve(false);
                }
            } else {
                console.log('⚠️ Usuário não logado, usando modo demo');
                currentUser = {
                    id: 1,
                    username: 'Usuário Demo',
                    is_admin: false
                };
                currentUserId = 1;
                resolve(true);
            }
        } catch (error) {
            console.error('❌ Erro ao verificar login:', error);
            currentUser = { id: 1, username: 'Usuário', is_admin: false };
            currentUserId = 1;
            resolve(true);
        }
    });
}

// 🔥 FUNÇÃO PARA BUSCAR USUÁRIO DO BANCO DE DADOS
async function fetchUserFromDatabase(userId) {
    try {
        const response = await fetch(`/api/user/${userId}`);
        const data = await response.json();

        if (data.success) {
            // 🔥 GARANTIR QUE is_admin SEJA BOOLEAN
            const user = data.user;
            if (user.is_admin !== undefined) {
                user.is_admin = Boolean(user.is_admin);
            }
            return user;
        } else {
            console.error('Usuário não encontrado no banco:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Erro ao buscar usuário do banco:', error);
        return null;
    }
}

// 🔥 VERIFICAR SE O USUÁRIO É ADMINISTRADOR
// 🔥 VERIFICAR STATUS ADMIN
function checkAdminStatus(user) {
    console.log('👑 Verificando status admin...', user);

    if (!user) {
        console.log('❌ Usuário não definido');
        return;
    }

    // DEBUG DETALHADO
    console.log('🔍 Debug detalhado:');
    console.log('user.is_admin:', user.is_admin);
    console.log('Tipo:', typeof user.is_admin);
    console.log('Valor booleano:', Boolean(user.is_admin));
    console.log('Comparação com true:', user.is_admin === true);
    console.log('Comparação com "true":', user.is_admin === "true");

    // 🔥 CORREÇÃO: Verificação mais robusta
    const isAdmin = Boolean(user.is_admin) === true;
    console.log('🎯 Resultado final - É admin?', isAdmin);

    if (isAdmin) {
        console.log('✅ USUÁRIO É ADMINISTRADOR');

        // Salvar no localStorage
        localStorage.setItem('userIsAdmin', 'true');

        // Mostrar elementos de admin
        const adminBadge = document.getElementById('adminBadge');
        const adminSection = document.getElementById('adminSection');
        const addMoviesBtn = document.getElementById('addMoviesBtn');

        console.log('🔍 Elementos encontrados:', {
            adminBadge: !!adminBadge,
            adminSection: !!adminSection,
            addMoviesBtn: !!addMoviesBtn
        });

        if (adminBadge) {
            adminBadge.style.display = 'flex';
            console.log('✅ Badge admin mostrado');
        }
        if (adminSection) {
            adminSection.style.display = 'block';
            console.log('✅ Seção admin mostrada');
        }
        if (addMoviesBtn) {
            addMoviesBtn.style.display = 'flex';
            console.log('✅ Botão adicionar filmes mostrado');
        }

    } else {
        console.log('❌ USUÁRIO NÃO É ADMIN');
        localStorage.setItem('userIsAdmin', 'false');
    }
}

// 🔥 FUNÇÃO PARA FAZER LOGOUT
document.getElementById('logoutBtn').addEventListener('click', logoutUser);
document.querySelectorAll('.username').forEach(element => {
    element.addEventListener('click', logoutUser);
});

function logoutUser() {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    localStorage.removeItem('cineia_favorites');
    localStorage.removeItem('userIsAdmin');
    currentUser = null;
    userRatings = [];
    favorites = [];

    alert('Sessão expirada. Por favor, faça login novamente.');
    window.location.href = '/';
}

// 🔥 FORMATAR DATA (FUNÇÃO AUXILIAR)
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    } catch (error) {
        return dateString;
    }
}



// ================================================
// ========== FUNÇÕES DE USUÁRIO E ADMIN ==========
// ================================================

// 🔥 FUNÇÃO - CARREGAR FILMES AVALIADOS
// 🔥 CARREGAR AVALIAÇÕES DO USUÁRIO (VERSÃO CORRIGIDA)
async function loadRatedMovies() {
    try {
        const userId = getCurrentUserId();
        console.log('🎬 Carregando avaliações (6 mais recentes) para usuário ID:', userId);

        const ratedMoviesContainer = document.getElementById('ratedMovies');
        if (!ratedMoviesContainer) {
            console.error('❌ Container ratedMovies não encontrado');
            return;
        }

        const response = await fetch(`/api/user/${userId}/recent-ratings`);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('📊 Dados das avaliações:', data);

        if (data.success && data.recent_ratings && data.recent_ratings.length > 0) {
            // ✅ MOSTRAR APENAS OS 6 PRIMEIROS (MAIS RECENTES)
            const recentMovies = data.recent_ratings.slice(0, 6);
            console.log(`✅ ${recentMovies.length} filmes recentes de ${data.recent_ratings.length} totais`);

            displayRatedMovies(recentMovies);

            // ✅ ATUALIZAR CONTADOR COM O TOTAL (não apenas os 6)
            await updateMoviesCount();
        } else {
            console.log('📭 Nenhuma avaliação encontrada');
            showNoRatingsMessage();
            updateMoviesCountDisplay(0);
        }

    } catch (error) {
        console.error('❌ Erro ao carregar filmes avaliados:', error);
        showErrorLoadingRatings();
        updateMoviesCountDisplay(0);
    }
}

// ✅ FUNÇÃO AUXILIAR PARA ATUALIZAÇÃO DIRETA
function updateMoviesCountDisplay(count) {
    const element = document.getElementById('moviesCount');
    if (element) {
        element.textContent = `${count} FILMES AVALIADOS`;
    }
}

// 🔥 DISPLAYRATEDMOVIES - MOSTRA APENAS 6 FILMES
function displayRatedMovies(ratings) {
    const container = document.getElementById('ratedMovies');
    if (!container) return;

    console.log('🎯 Exibindo avaliações recentes (máx 6):', ratings.length);

    // Limpar container
    container.innerHTML = '';

    // ✅ MOSTRAR APENAS OS FILMES RECEBIDOS (já limitados a 6)
    ratings.forEach(rating => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';
        movieCard.innerHTML = `
            <img src="${rating.poster_url || 'https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'}" 
                 alt="${rating.title}" 
                 class="movie-poster"
                 onerror="this.src='https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'">
            <div class="movie-info">
                <h3 class="movie-title">${rating.title}</h3>
                <div class="movie-rating">
                    ${generateStarRating(rating.user_rating)}
                </div>
                <div class="rating-badge">
                    <i class="fas fa-star"></i>
                    <span>${rating.user_rating}/10</span>
                </div>
                ${rating.rating_date ? `
                <div class="rating-date">
                    <small>${formatDate(rating.rating_date)}</small>
                </div>
                ` : ''}
            </div>
        `;

        movieCard.addEventListener('click', () => {
            openMovieModal(rating.movie_id);
        });

        container.appendChild(movieCard);
    });

    console.log(`✅ ${ratings.length} avaliações recentes exibidas`);
}

// 🔥 GERAR AVALIAÇÃO EM ESTRELAS
function generateStarRating(rating) {
    const numericRating = Math.round(rating / 2); // Converter de 10 para 5 estrelas
    const stars = '★'.repeat(numericRating) + '☆'.repeat(5 - numericRating);
    return stars;
}

// 🔥 MENSAGEM QUANDO NÃO HÁ AVALIAÇÕES
function showNoRatingsMessage() {
    const container = document.getElementById('ratedMovies');
    if (container) {
        container.innerHTML = `
            <div class="no-ratings">
                <i class="fas fa-film"></i>
                <h3>Nenhuma avaliação encontrada</h3>
                <p>Comece avaliando alguns filmes!</p>
            </div>
        `;
    }
}

// 🔥 MENSAGEM DE ERRO
function showErrorLoadingRatings() {
    const container = document.getElementById('ratedMovies');
    if (container) {
        container.innerHTML = `
            <div class="no-ratings">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar avaliações</h3>
                <p>Tente recarregar a página.</p>
            </div>
        `;
    }
}

// 🔥 ATUALIZAR CONTADOR NA INTERFACE
async function updateMoviesCount() {
    try {
        // ✅ BUSCAR O TOTAL REAL DE AVALIAÇÕES
        const totalCount = await getRatedMoviesCount();
        const moviesCountElement = document.getElementById('moviesCount');

        console.log('🔍 Procurando elemento moviesCount:', moviesCountElement);
        console.log('🎯 Total de avaliações:', totalCount);

        if (moviesCountElement) {
            moviesCountElement.textContent = `${totalCount} FILMES AVALIADOS`;
            console.log('✅ Contador atualizado com TOTAL:', totalCount);
        } else {
            console.error('❌ Elemento moviesCount não encontrado no DOM');
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar contador:', error);
    }
}

// 🔥 FORMATAR DATA (MELHORADA)
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}
// 🔥 FUNÇÃO PARA VER TODOS OS FILMES (OPCIONAL)
function setupSeeMoreButton() {
    const seeMoreBtn = document.getElementById('seeMoreRatings');
    if (seeMoreBtn) {
        seeMoreBtn.addEventListener('click', async () => {
            // Carregar e mostrar TODOS os filmes
            await loadAllRatings();
        });
    }
}

// 🔥 CARREGAR TODOS OS FILMES (OPCIONAL)
async function loadAllRatings() {
    try {
        const userId = getCurrentUserId();
        const response = await fetch(`/api/user/${userId}/recent-ratings`);
        const data = await response.json();

        if (data.success && data.recent_ratings) {
            // Mostrar TODOS os filmes, não apenas 6
            displayRatedMovies(data.recent_ratings);
            console.log(`🎬 Mostrando todos os ${data.recent_ratings.length} filmes`);
        }
    } catch (error) {
        console.error('Erro ao carregar todos os filmes:', error);
    }
}


// ===================== PARTE APENAS DE ADMIN
// ====================================================
// ====================================================
// ========== API DE BUSCA DE FILMES (ADMIN) ==========

// 🔥 BUSCAR FILME NA API OMDB
async function searchMovieInAPI(title) {
    try {
        console.log(`🔍 Buscando filme: ${title}`);
        const response = await fetch('/api/search-movie', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title: title })
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('📊 Resultado da busca:', data);

        return data;
    } catch (error) {
        console.error('❌ Erro ao buscar filme:', error);
        return { success: false, error: error.message };
    }
}

// 🔥 ADICIONAR FILME AO BANCO (ADMIN)
async function addMovieToDatabase(movieData) {
    try {
        console.log('🎬 Adicionando filme ao banco:', movieData.title);
        const response = await fetch('/api/movies', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(movieData)
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('📊 Resposta da API:', data);

        return data;
    } catch (error) {
        console.error('❌ Erro ao adicionar filme:', error);
        return { success: false, error: error.message };
    }
}

// ========== ATUALIZAÇÃO DAS FUNÇÕES EXISTENTES ==========

// 🔥 ATUALIZAR A FUNÇÃO simulateMovieSearch PARA USAR A API REAL
async function searchMovie(title) {
    console.log('🎬 Iniciando busca por:', title);

    if (!title) {
        alert('Por favor, digite o título do filme!');
        return;
    }

    // Mostrar loading
    const searchResultsModal = document.getElementById('searchResultsModal');
    if (searchResultsModal) {
        searchResultsModal.innerHTML = `
            <div class="loading-message">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Buscando filme...</p>
            </div>
        `;
        searchResultsModal.style.display = 'block';
    }

    try {
        const result = await searchMovieInAPI(title);

        if (result.success) {
            displayMovieSearchResult(result.movie);
        } else {
            alert(`Filme não encontrado: ${result.error}`);
            if (searchResultsModal) {
                searchResultsModal.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Erro na busca:', error);
        alert('Erro ao buscar filme. Tente novamente.');
        if (searchResultsModal) {
            searchResultsModal.style.display = 'none';
        }
    }
}

// 🔥 ATUALIZAR A FUNÇÃO displayMovieSearchResult
function displayMovieSearchResult(movie) {
    const searchResultsModal = document.getElementById('searchResultsModal');
    if (!searchResultsModal) return;

    searchResultsModal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal" id="closeSearchResultsBtn">&times;</span>
            <h2>Resultado da Busca</h2>
            
            <div class="movie-result">
                <div class="movie-result-poster">
                    <img src="${movie.poster_url || 'https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'}" 
                         alt="${movie.title}"
                         onerror="this.src='https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'">
                </div>
                <div class="movie-result-details">
                    <h3 class="movie-result-title">${movie.title}</h3>
                    
                    <div class="movie-info-grid">
                        <div class="info-item">
                            <label>Ano:</label>
                            <span id="resultYear">${movie.year || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <label>Gênero:</label>
                            <span id="resultGenre">${movie.genre || 'Não especificado'}</span>
                        </div>
                        <div class="info-item">
                            <label>IMDb:</label>
                            <span id="resultImdb">${movie.imdb_rating || 'N/A'}/10</span>
                        </div>
                        <div class="info-item">
                            <label>Rotten Tomatoes:</label>
                            <span id="resultTomatoes">${movie.rotten_tomatoes_rating || 'N/A'}%</span>
                        </div>
                    </div>
                    
                    <div class="synopsis-section">
                        <h4>Sinopse</h4>
                        <p id="resultSynopsis">${movie.description || 'Sinopse não disponível.'}</p>
                    </div>
                    
                    <div class="cast-section">
                        <h4>Elenco</h4>
                        <p id="resultCast">${movie.actors || 'Elenco não disponível'}</p>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn-secondary" id="backToSearchBtn">
                            <i class="fas fa-arrow-left"></i>
                            Voltar
                        </button>
                        <button class="btn-primary" id="confirmAddMovieBtn">
                            <i class="fas fa-plus"></i>
                            Adicionar Filme
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Reconfigurar event listeners
    setupSearchResultsModal();
}

// 🔥 ATUALIZAR A FUNÇÃO DE CONFIRMAR ADIÇÃO DE FILME
function setupSearchResultsModal() {
    const confirmAddMovieBtn = document.getElementById('confirmAddMovieBtn');
    const backToSearchBtn = document.getElementById('backToSearchBtn');
    const closeSearchResultsBtn = document.getElementById('closeSearchResultsBtn');

    if (confirmAddMovieBtn) {
        confirmAddMovieBtn.addEventListener('click', async () => {
            const title = document.querySelector('.movie-result-title')?.textContent;
            const poster = document.querySelector('.movie-result-poster img')?.src;
            const year = document.getElementById('resultYear')?.textContent;
            const genre = document.getElementById('resultGenre')?.textContent;
            const description = document.getElementById('resultSynopsis')?.textContent;
            const actors = document.getElementById('resultCast')?.textContent;
            const imdb_rating = parseFloat(document.getElementById('resultImdb')?.textContent) || 0;
            const rotten_tomatoes_rating = parseInt(document.getElementById('resultTomatoes')?.textContent) || 0;

            if (title) {
                const movieData = {
                    title: title,
                    genre: genre,
                    year: parseInt(year) || 2023,
                    actors: actors,
                    description: description,
                    poster_url: poster,
                    imdb_rating: imdb_rating,
                    rotten_tomatoes_rating: rotten_tomatoes_rating
                };

                const result = await addMovieToDatabase(movieData);

                if (result.success) {
                    alert(`Filme "${title}" adicionado com sucesso! ID: ${result.movie_id}`);

                    // Fechar modais
                    const searchResultsModal = document.getElementById('searchResultsModal');
                    const addMoviesModal = document.getElementById('addMoviesModal');
                    if (searchResultsModal) searchResultsModal.style.display = 'none';
                    if (addMoviesModal) addMoviesModal.style.display = 'none';

                    // Limpar campo de busca
                    const titleInput = document.getElementById('movieTitle');
                    if (titleInput) titleInput.value = '';

                    // Recarregar filmes
                    await loadAllMovies();

                } else {
                    alert(`Erro ao adicionar filme: ${result.error}`);
                }
            }
        });
    }

    // Configurar outros botões...
    if (backToSearchBtn) {
        backToSearchBtn.addEventListener('click', () => {
            const searchResultsModal = document.getElementById('searchResultsModal');
            const addMoviesModal = document.getElementById('addMoviesModal');
            if (searchResultsModal) searchResultsModal.style.display = 'none';
            if (addMoviesModal) addMoviesModal.style.display = 'block';
        });
    }

    if (closeSearchResultsBtn) {
        closeSearchResultsBtn.addEventListener('click', () => {
            const searchResultsModal = document.getElementById('searchResultsModal');
            if (searchResultsModal) searchResultsModal.style.display = 'none';
        });
    }
}


// Abrir filme em destaque
function openFeaturedMovie() {
    openMovieModal(1); // Abre o primeiro filme (Horizonte Perdido)
}

// Configurar modal
function setupModal() {
    const modal = document.getElementById('movieModal');
    const closeBtn = document.querySelector('.close-modal');

    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
}

// Alternar favorito
function toggleFavorite(movieId) {
    if (movieId === 'featured') {
        // Para o filme em destaque no banner
        const favoriteBtn = document.querySelector('.favorite-btn');
        const icon = favoriteBtn.querySelector('i');

        favoriteBtn.classList.toggle('active');
        if (favoriteBtn.classList.contains('active')) {
            icon.className = 'fas fa-heart';
            alert('Filme adicionado aos favoritos!');
        } else {
            icon.className = 'far fa-heart';
            alert('Filme removido dos favoritos!');
        }
        return;
    }

    const movie = moviesData.find(m => m.id === movieId);
    if (movie) {
        movie.isFavorite = !movie.isFavorite;

        // Atualizar no localStorage
        if (movie.isFavorite) {
            if (!favorites.includes(movieId)) {
                favorites.push(movieId);
            }
        } else {
            favorites = favorites.filter(id => id !== movieId);
        }
        localStorage.setItem('cineia_favorites', JSON.stringify(favorites));

        // Recarregar grid para atualizar ícones
        loadGrid();

        // Feedback
        const action = movie.isFavorite ? 'adicionado aos' : 'removido dos';
        alert(`"${movie.title}" ${action} favoritos!`);
    }
}

// Abrir modal do filme
function openMovieModal(movieId) {
    const movie = ratedMoviesData.find(m => m.id === movieId);
    if (!movie) return;

    const modal = document.getElementById('movieModal');
    const detailsContainer = document.getElementById('movieModalContent');

    detailsContainer.innerHTML = `
        <div class="movie-detail-hero" style="background-image: url('${movie.background}')">
            <div class="movie-detail-content">
                <div class="movie-detail-poster">
                    <img src="${movie.poster}" alt="${movie.title}">
                </div>
                <div class="movie-detail-info">
                    <h2>${movie.title} (${movie.year})</h2>
                    
                    <div class="ratings-container">
                        <div class="rating-item">
                            <span class="rating-label">IMDB</span>
                            <span class="rating-value">${movie.imdb}</span>
                        </div>
                        <div class="rating-item">
                            <span class="rating-label">ROTTEN TOMATOES</span>
                            <span class="rating-value">${movie.rottenTomatoes}</span>
                        </div>
                        <div class="rating-item">
                            <span class="rating-label">AVALIAÇÃO DO USUÁRIO</span>
                            <span class="rating-value" id="userRatingDisplay">${movie.userRating}</span>
                        </div>
                    </div>
                    
                    <div class="actors-section">
                        <h4>Elenco Principal</h4>
                        <p>${movie.cast}</p>
                    </div>
                    
                    <div class="synopsis-section">
                        <h4>Sinopse</h4>
                        <p>${movie.synopsis}</p>
                    </div>
                    
                    <div class="user-rating-section">
                        <h4>Sua Avaliação</h4>
                        <div class="star-rating" id="starRating">
                            ${Array.from({length: 10}, (_, i) => `
                                <span class="star" data-rating="${i + 1}">★</span>
                            `).join('')}
                        </div>
                        <button class="submit-rating" onclick="submitRating(${movie.id})">Enviar Avaliação</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'block';
    setupStarRating();
}

// Configurar sistema de estrelas
function setupStarRating() {
    const stars = document.querySelectorAll('.star');
    let currentRating = 0;

    stars.forEach(star => {
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(rating);
        });

        star.addEventListener('mouseout', function() {
            highlightStars(currentRating);
        });

        star.addEventListener('click', function() {
            currentRating = parseInt(this.getAttribute('data-rating'));
            highlightStars(currentRating);
        });
    });

    function highlightStars(rating) {
        stars.forEach(star => {
            const starRating = parseInt(star.getAttribute('data-rating'));
            star.classList.toggle('active', starRating <= rating);
        });
    }
}

// Enviar avaliação
// Enviar avaliação
function submitRating(movieId) {
    const stars = document.querySelectorAll('.star');
    let rating = 0;

    stars.forEach(star => {
        if (star.classList.contains('active')) {
            rating = Math.max(rating, parseInt(star.getAttribute('data-rating')));
        }
    });

    if (rating > 0) {
        const movie = ratedMoviesData.find(m => m.id === movieId);
        if (movie) {
            // Atualizar a avaliação do usuário no formato correto
            movie.userRating = `${rating}/10`;
            document.getElementById('userRatingDisplay').textContent = `${rating}/10`;

            // Atualizar também a avaliação no grid principal
            movie.rating = Math.ceil(rating / 2); // Converter de 10 para 5 estrelas

            // ATUALIZAÇÃO: Gerar novo ID/timestamp para reordenar como mais recente
            movie.id = Date.now();

            alert(`Obrigado! Você avaliou "${movie.title}" com ${rating} estrelas!`);

            // Fechar o modal
            movieModal.style.display = 'none';

            // Recarregar os filmes para atualizar as avaliações e ordenação
            loadRatedMovies();
        }
    } else {
        alert('Por favor, selecione uma avaliação antes de enviar.');
    }
}

// Abrir modal de alteração de perfil
changeProfileBtn.addEventListener('click', () => {
    // Preencher os campos com os valores atuais
    bannerInput.value = userBanner.style.backgroundImage ?
        userBanner.style.backgroundImage.replace('url("', '').replace('")', '') : '';
    avatarInput.value = userAvatar.src;

    profileModal.style.display = 'block';
});

// Fechar modais
cancelBtn.addEventListener('click', () => {
    profileModal.style.display = 'none';
});

closeProfileBtn.addEventListener('click', () => {
    profileModal.style.display = 'none';
});

closeMovieBtn.addEventListener('click', () => {
    movieModal.style.display = 'none';
});

// Salvar alterações do perfil
saveBtn.addEventListener('click', () => {
    if (bannerInput.value) {
        userBanner.style.backgroundImage = `url('${bannerInput.value}')`;
        // Salvar no localStorage
        localStorage.setItem('userBanner', bannerInput.value);
    }

    if (avatarInput.value) {
        userAvatar.src = avatarInput.value;
        // Salvar no localStorage
        localStorage.setItem('userAvatar', avatarInput.value);
    }


    // Limpar campos
    bannerInput.value = '';
    avatarInput.value = '';

    profileModal.style.display = 'none';
});

// Fechar modal ao clicar fora dele
window.addEventListener('click', (event) => {
    if (event.target === profileModal) {
        profileModal.style.display = 'none';
    }
    if (event.target === movieModal) {
        movieModal.style.display = 'none';
    }
});

// Carregar dados salvos do localStorage
function loadSavedProfile() {
    const savedBanner = localStorage.getItem('userBanner');
    const savedAvatar = localStorage.getItem('userAvatar');
    const savedName = localStorage.getItem('userName');

    if (savedBanner) {
        userBanner.style.backgroundImage = `url('${savedBanner}')`;
    }

    if (savedAvatar) {
        userAvatar.src = savedAvatar;
    }

    if (savedName) {
        userName.textContent = savedName;
    }
}

// Inicializar modal
setupModal();

// Carregar dados iniciais
loadRatedMovies();
loadSavedProfile();

// Elementos do DOM para funcionalidade admin
const adminBadge = document.getElementById('adminBadge');
const adminSection = document.getElementById('adminSection');
const addMoviesBtn = document.getElementById('addMoviesBtn');
const addMoviesModal = document.getElementById('addMoviesModal');
const searchResultsModal = document.getElementById('searchResultsModal');

// Verificar se o usuário é administrador
// 🔥 FUNÇÃO SIMPLIFICADA - VERIFICAR STATUS ADMIN
function checkAdminStatus(user) {
    console.log('👑 Verificando status admin...', user);

    if (!user || !user.is_admin) {
        console.log('❌ Usuário não é admin');
        return;
    }

    console.log('✅ USUÁRIO É ADMINISTRADOR - Mostrando elementos...');

    // Elementos diretos (já declarados no topo)
    if (adminBadge) adminBadge.style.display = 'flex';
    if (adminSection) adminSection.style.display = 'block';
    if (addMoviesBtn) addMoviesBtn.style.display = 'flex';

    localStorage.setItem('userIsAdmin', 'true');
}

// 🔥 INICIALIZAR FUNCIONALIDADES ADMIN
function initAdminFeatures() {
    console.log('👑 Inicializando features admin...');

    // Elementos dos modais
    const addMoviesBtn = document.getElementById('addMoviesBtn');
    const closeAddMoviesBtn = document.getElementById('closeAddMoviesBtn');
    const cancelAddMovieBtn = document.getElementById('cancelAddMovieBtn');
    const searchMovieBtn = document.getElementById('searchMovieBtn');
    const addMoviesModal = document.getElementById('addMoviesModal');
    const searchResultsModal = document.getElementById('searchResultsModal');
    const closeSearchResultsBtn = document.getElementById('closeSearchResultsBtn');
    const backToSearchBtn = document.getElementById('backToSearchBtn');
    const confirmAddMovieBtn = document.getElementById('confirmAddMovieBtn');

    // 🔥 ABRIR MODAL DE ADICIONAR FILMES
    if (addMoviesBtn && addMoviesModal) {
        addMoviesBtn.addEventListener('click', () => {
            console.log('🎬 Abrindo modal de adicionar filmes');
            addMoviesModal.style.display = 'block';
        });
    }

    // 🔥 FECHAR MODAL DE ADICIONAR FILMES
    if (closeAddMoviesBtn && addMoviesModal) {
        closeAddMoviesBtn.addEventListener('click', () => {
            addMoviesModal.style.display = 'none';
        });
    }

    if (cancelAddMovieBtn && addMoviesModal) {
        cancelAddMovieBtn.addEventListener('click', () => {
            addMoviesModal.style.display = 'none';
        });
    }

    // 🔥 BUSCAR FILME (INTEGRAÇÃO COM API)
    if (searchMovieBtn) {
        searchMovieBtn.addEventListener('click', async () => {
            const titleInput = document.getElementById('movieTitle');
            if (titleInput) {
                const title = titleInput.value.trim();

                if (!title) {
                    alert('Por favor, digite o título do filme!');
                    return;
                }

                console.log(`🔍 Buscando filme: "${title}"`);

                // Mostrar loading
                if (addMoviesModal) addMoviesModal.style.display = 'none';
                if (searchResultsModal) {
                    searchResultsModal.style.display = 'block';
                }

                // Buscar na API
                await searchAndDisplayMovie(title);
            }
        });
    }

    // 🔥 VOLTAR PARA BUSCA
    if (backToSearchBtn && searchResultsModal && addMoviesModal) {
        backToSearchBtn.addEventListener('click', () => {
            searchResultsModal.style.display = 'none';
            addMoviesModal.style.display = 'block';
        });
    }

    // 🔥 FECHAR RESULTADOS DA BUSCA
    if (closeSearchResultsBtn && searchResultsModal) {
        closeSearchResultsBtn.addEventListener('click', () => {
            searchResultsModal.style.display = 'none';
        });
    }

    // 🔥 CONFIRMAR ADIÇÃO DO FILME
    if (confirmAddMovieBtn) {
        confirmAddMovieBtn.addEventListener('click', async () => {
            const title = document.getElementById('resultYear')?.previousElementSibling?.textContent.includes('Título') ?
                document.querySelector('.movie-result-title')?.textContent :
                document.querySelector('.movie-result-title')?.textContent;

            if (!title) {
                alert('Erro: Não foi possível obter o título do filme');
                return;
            }

            console.log('🎬 Confirmando adição do filme:', title);
            await confirmAddMovie(title);
        });
    }

    // 🔥 FECHAR MODAIS AO CLICAR FORA
    window.addEventListener('click', (event) => {
        if (event.target === addMoviesModal) {
            addMoviesModal.style.display = 'none';
        }
        if (event.target === searchResultsModal) {
            searchResultsModal.style.display = 'none';
        }
    });

    // 🔥 ENTER PARA BUSCAR
    const movieTitleInput = document.getElementById('movieTitle');
    if (movieTitleInput && searchMovieBtn) {
        movieTitleInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                searchMovieBtn.click();
            }
        });
    }

    // 🔥 INICIALIZAR RECOMENDAÇÕES IA
    initRecommendationFeatures();
}

// 🔥 BUSCAR E EXIBIR FILME (API REAL)
async function searchAndDisplayMovie(title) {
    try {
        const response = await fetch('/api/search-movie', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title: title })
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('📊 Resultado da busca:', data);

        if (data.success) {
            displayMovieSearchResult(data.movie);
        } else {
            throw new Error(data.error || 'Filme não encontrado');
        }

    } catch (error) {
        console.error('❌ Erro na busca:', error);
        showSearchError(error.message);
    }
}

// 🔥 EXIBIR RESULTADO DA BUSCA (ADAPTADO PARA SEU HTML)
function displayMovieSearchResult(movie) {
    const searchResultsModal = document.getElementById('searchResultsModal');
    if (!searchResultsModal) return;

    // Atualizar os elementos do seu HTML existente
    const posterImg = searchResultsModal.querySelector('.movie-result-poster img');
    const titleElement = searchResultsModal.querySelector('.movie-result-title');
    const yearElement = document.getElementById('resultYear');
    const genreElement = document.getElementById('resultGenre');
    const imdbElement = document.getElementById('resultImdb');
    const tomatoesElement = document.getElementById('resultTomatoes');
    const castElement = document.getElementById('resultCast');
    const synopsisElement = document.getElementById('resultSynopsis');

    if (posterImg) {
        posterImg.src = movie.poster_url || 'https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80';
        posterImg.alt = movie.title;
    }
    if (titleElement) titleElement.textContent = movie.title;
    if (yearElement) yearElement.textContent = movie.year || 'N/A';
    if (genreElement) genreElement.textContent = movie.genre || 'Não especificado';
    if (imdbElement) imdbElement.textContent = movie.imdb_rating ? `${movie.imdb_rating}/10` : 'N/A';
    if (tomatoesElement) tomatoesElement.textContent = movie.rotten_tomatoes_rating ? `${movie.rotten_tomatoes_rating}%` : 'N/A';
    if (castElement) castElement.textContent = movie.actors || 'Elenco não disponível';
    if (synopsisElement) synopsisElement.textContent = movie.description || 'Sinopse não disponível';

    // Mostrar modal
    searchResultsModal.style.display = 'block';
}

// 🔥 CONFIRMAR ADIÇÃO DO FILME
async function confirmAddMovie(title) {
    try {
        const searchResultsModal = document.getElementById('searchResultsModal');
        if (!searchResultsModal) return;

        // Coletar dados do modal
        const year = document.getElementById('resultYear')?.textContent;
        const genre = document.getElementById('resultGenre')?.textContent;
        const imdb = document.getElementById('resultImdb')?.textContent;
        const tomatoes = document.getElementById('resultTomatoes')?.textContent;
        const cast = document.getElementById('resultCast')?.textContent;
        const synopsis = document.getElementById('resultSynopsis')?.textContent;
        const poster = searchResultsModal.querySelector('.movie-result-poster img')?.src;

        const movieData = {
            title: title,
            genre: genre || 'Não especificado',
            year: parseInt(year) || 2023,
            actors: cast || 'Elenco não disponível',
            description: synopsis || 'Sinopse não disponível',
            poster_url: poster || 'https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
            imdb_rating: parseFloat(imdb) || 0,
            rotten_tomatoes_rating: parseInt(tomatoes) || 0
        };

        console.log('🎬 Dados do filme para adicionar:', movieData);

        const result = await addMovieToDatabase(movieData);

        if (result.success) {
            alert(`✅ Filme "${title}" adicionado com sucesso! ID: ${result.movie_id}`);

            // Fechar modais
            searchResultsModal.style.display = 'none';
            const addMoviesModal = document.getElementById('addMoviesModal');
            if (addMoviesModal) addMoviesModal.style.display = 'none';

            // Limpar campo de busca
            const titleInput = document.getElementById('movieTitle');
            if (titleInput) titleInput.value = '';

        } else {
            alert(`❌ Erro ao adicionar filme: ${result.error}`);
        }

    } catch (error) {
        console.error('❌ Erro ao confirmar adição:', error);
        alert('Erro ao adicionar filme. Tente novamente.');
    }
}

// 🔥 ADICIONAR FILME AO BANCO
async function addMovieToDatabase(movieData) {
    try {
        console.log('🎬 Enviando filme para o banco:', movieData.title);
        const response = await fetch('/api/movies', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(movieData)
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('📊 Resposta da API:', data);
        return data;

    } catch (error) {
        console.error('❌ Erro ao adicionar filme:', error);
        return { success: false, error: error.message };
    }
}

// 🔥 MOSTRAR ERRO NA BUSCA
function showSearchError(message) {
    const searchResultsModal = document.getElementById('searchResultsModal');
    if (!searchResultsModal) return;

    // Usar alert simples por enquanto
    alert(`Erro na busca: ${message}`);

    // Voltar para o modal de busca
    searchResultsModal.style.display = 'none';
    const addMoviesModal = document.getElementById('addMoviesModal');
    if (addMoviesModal) addMoviesModal.style.display = 'block';
}

// 🔥 INICIALIZAR RECOMENDAÇÕES IA ANTIGO

// function initRecommendationFeatures() {
//     const addRecommendationBtn = document.getElementById('addRecommendationBtn');
//     const recommendationModal = document.getElementById('recommendationModal');
//     const closeRecommendationBtn = document.getElementById('closeRecommendationBtn');
//     const cancelRecommendationBtn = document.getElementById('cancelRecommendationBtn');
//     const refazerBtn = document.getElementById('refazerBtn');
//     const selectBtn = document.getElementById('selectBtn');
//
//     if (addRecommendationBtn && recommendationModal) {
//         addRecommendationBtn.addEventListener('click', () => {
//             console.log('🤖 Abrindo recomendações IA');
//             recommendationModal.style.display = 'block';
//         });
//     }
//
//     if (closeRecommendationBtn && recommendationModal) {
//         closeRecommendationBtn.addEventListener('click', () => {
//             recommendationModal.style.display = 'none';
//         });
//     }
//
//     if (cancelRecommendationBtn && recommendationModal) {
//         cancelRecommendationBtn.addEventListener('click', () => {
//             recommendationModal.style.display = 'none';
//         });
//     }
//
//     // Fechar modal ao clicar fora
//     if (recommendationModal) {
//         window.addEventListener('click', (event) => {
//             if (event.target === recommendationModal) {
//                 recommendationModal.style.display = 'none';
//             }
//         });
//     }
//
//     // 🔥 TODO: Implementar funcionalidades das recomendações IA
//     console.log('✅ Funcionalidades de recomendação IA inicializadas');
// }

// 🔥 INICIALIZAR RECOMENDAÇÕES IA NOVO
// 🔥 ATUALIZAR A INICIALIZAÇÃO DAS RECOMENDAÇÕES
// function initRecommendationFeatures() {
//     const addRecommendationBtn = document.getElementById('addRecommendationBtn');
//     const recommendationModal = document.getElementById('recommendationModal');
//     const closeRecommendationBtn = document.getElementById('closeRecommendationBtn');
//     const cancelRecommendationBtn = document.getElementById('cancelRecommendationBtn');
//     const refazerBtn = document.getElementById('refazerBtn');
//     const selectBtn = document.getElementById('selectBtn');
//     const recommendationsGrid = document.getElementById('recommendationsGrid');
//
//     // Variáveis para controle
//     let selectedMovie = null;
//     let currentRecommendationSet = 0;
//
//     // 🔥 ABRIR MODAL DE RECOMENDAÇÕES
//     if (addRecommendationBtn && recommendationModal) {
//         addRecommendationBtn.addEventListener('click', async () => {
//             console.log('🤖 Abrindo recomendações IA');
//
//             // Resetar estado
//             selectedMovie = null;
//             if (selectBtn) selectBtn.disabled = true;
//             currentRecommendationSet = 0;
//
//             // Mostrar loading
//             if (recommendationsGrid) {
//                 recommendationsGrid.innerHTML = `
//                     <div class="loading-recommendations">
//                         <i class="fas fa-robot fa-spin fa-2x"></i>
//                         <p>Gerando recomendações inteligentes...</p>
//                     </div>
//                 `;
//             }
//
//             recommendationModal.style.display = 'block';
//
//             // Adicionar debug temporário
//             addSelectionDebug();
//
//             // Carregar recomendações reais
//             await loadRealRecommendations();
//         });
//     }
// }
// function initRecommendationFeatures() {
//     const addRecommendationBtn = document.getElementById('addRecommendationBtn');
//     const recommendationModal = document.getElementById('recommendationModal');
//     const closeRecommendationBtn = document.getElementById('closeRecommendationBtn');
//     const cancelRecommendationBtn = document.getElementById('cancelRecommendationBtn');
//     const refazerBtn = document.getElementById('refazerBtn');
//     const selectBtn = document.getElementById('selectBtn');
//     const recommendationsGrid = document.getElementById('recommendationsGrid');
//
//     // Variáveis para controle
//     let selectedMovie = null;
//     let currentRecommendationSet = 0;
//
//     // 🔥 ABRIR MODAL DE RECOMENDAÇÕES
//     if (addRecommendationBtn && recommendationModal) {
//         addRecommendationBtn.addEventListener('click', async () => {
//             console.log('🤖 Abrindo recomendações IA');
//
//             // Resetar estado
//             selectedMovie = null;
//             if (selectBtn) selectBtn.disabled = true;
//             currentRecommendationSet = 0;
//
//             // Mostrar loading
//             if (recommendationsGrid) {
//                 recommendationsGrid.innerHTML = `
//                     <div class="loading-recommendations">
//                         <i class="fas fa-robot fa-spin fa-2x"></i>
//                         <p>Gerando recomendações inteligentes...</p>
//                     </div>
//                 `;
//             }
//
//             recommendationModal.style.display = 'block';
//
//             // Adicionar debug temporário
//             addSelectionDebug();
//
//             // Carregar recomendações reais
//             await loadRealRecommendations();
//         });
//     }


// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 CineIA - Página carregada');

    initializeProfile();
});


// Variável para armazenar o filme selecionado
let selectedMovie = null;


// // 🔥 INICIALIZAR RECOMENDAÇÕES IA (FUNÇÃO COMPLETA E REAL)
// function initRecommendationFeatures() {
//     const addRecommendationBtn = document.getElementById('addRecommendationBtn');
//     const recommendationModal = document.getElementById('recommendationModal');
//     const closeRecommendationBtn = document.getElementById('closeRecommendationBtn');
//     const cancelRecommendationBtn = document.getElementById('cancelRecommendationBtn');
//     const refazerBtn = document.getElementById('refazerBtn');
//     const selectBtn = document.getElementById('selectBtn');
//     const recommendationsGrid = document.getElementById('recommendationsGrid');
//
//     // Variáveis para controle
//     let selectedMovie = null;
//     let currentRecommendationSet = 0;
//
//     // 🔥 ABRIR MODAL DE RECOMENDAÇÕES
//     if (addRecommendationBtn && recommendationModal) {
//         addRecommendationBtn.addEventListener('click', async () => {
//             console.log('🤖 Abrindo recomendações IA');
//
//             // Resetar estado
//             selectedMovie = null;
//             selectBtn.disabled = true;
//             currentRecommendationSet = 0;
//
//             // Mostrar loading
//             recommendationsGrid.innerHTML = `
//                 <div class="loading-recommendations">
//                     <i class="fas fa-robot fa-spin fa-2x"></i>
//                     <p>Gerando recomendações inteligentes...</p>
//                 </div>
//             `;
//
//             recommendationModal.style.display = 'block';
//
//             // Carregar recomendações reais
//             await loadRealRecommendations();
//         });
//     }
//
//     // 🔥 FECHAR MODAL
//     if (closeRecommendationBtn && recommendationModal) {
//         closeRecommendationBtn.addEventListener('click', () => {
//             recommendationModal.style.display = 'none';
//         });
//     }
//
//     if (cancelRecommendationBtn && recommendationModal) {
//         cancelRecommendationBtn.addEventListener('click', () => {
//             recommendationModal.style.display = 'none';
//         });
//     }
//
//     // 🔥 REFAZER RECOMENDAÇÕES
//     if (refazerBtn) {
//         refazerBtn.addEventListener('click', async () => {
//             console.log('🔄 Refazendo recomendações...');
//             selectedMovie = null;
//             selectBtn.disabled = true;
//             currentRecommendationSet++;
//
//             // Mostrar loading
//             recommendationsGrid.innerHTML = `
//                 <div class="loading-recommendations">
//                     <i class="fas fa-sync fa-spin fa-2x"></i>
//                     <p>Buscando novas recomendações...</p>
//                 </div>
//             `;
//
//             await loadRealRecommendations();
//         });
//     }
//
//     // 🔥 SELECIONAR FILME RECOMENDADO
//     if (selectBtn) {
//         selectBtn.addEventListener('click', async () => {
//             if (selectedMovie) {
//                 await addRecommendedMovie(selectedMovie);
//             }
//         });
//     }
//
//     // Fechar modal ao clicar fora
//     window.addEventListener('click', (event) => {
//         if (event.target === recommendationModal) {
//             recommendationModal.style.display = 'none';
//         }
//     });
// }

// 🔥 INICIALIZAR RECOMENDAÇÕES IA (FUNÇÃO COMPLETA)
function initRecommendationFeatures() {
    const addRecommendationBtn = document.getElementById('addRecommendationBtn');
    const recommendationModal = document.getElementById('recommendationModal');
    const closeRecommendationBtn = document.getElementById('closeRecommendationBtn');
    const cancelRecommendationBtn = document.getElementById('cancelRecommendationBtn');
    const refazerBtn = document.getElementById('refazerBtn');
    const selectBtn = document.getElementById('selectBtn');
    const recommendationsGrid = document.getElementById('recommendationsGrid');

    // Variáveis para controle
    let selectedMovie = null;
    let currentRecommendationSet = 0;

    // 🔥 ABRIR MODAL DE RECOMENDAÇÕES
    if (addRecommendationBtn && recommendationModal) {
        addRecommendationBtn.addEventListener('click', async () => {
            console.log('🤖 Abrindo recomendações IA');

            // Resetar estado
            selectedMovie = null;
            if (selectBtn) selectBtn.disabled = true;
            currentRecommendationSet = 0;

            // Mostrar loading
            if (recommendationsGrid) {
                recommendationsGrid.innerHTML = `
                    <div class="loading-recommendations">
                        <i class="fas fa-robot fa-spin fa-2x"></i>
                        <p>Gerando recomendações inteligentes...</p>
                    </div>
                `;
            }

            recommendationModal.style.display = 'block';

            // Adicionar debug temporário
            addSelectionDebug();

            // Carregar recomendações reais
            await loadRealRecommendations();
        });
    }

    // 🔥 FECHAR MODAL
    if (closeRecommendationBtn && recommendationModal) {
        closeRecommendationBtn.addEventListener('click', () => {
            recommendationModal.style.display = 'none';
        });
    }

    if (cancelRecommendationBtn && recommendationModal) {
        cancelRecommendationBtn.addEventListener('click', () => {
            recommendationModal.style.display = 'none';
        });
    }

    // 🔥 REFAZER RECOMENDAÇÕES
    if (refazerBtn) {
        refazerBtn.addEventListener('click', async () => {
            console.log('🔄 Refazendo recomendações...');
            selectedMovie = null;
            if (selectBtn) selectBtn.disabled = true;
            currentRecommendationSet++;

            // Mostrar loading
            if (recommendationsGrid) {
                recommendationsGrid.innerHTML = `
                    <div class="loading-recommendations">
                        <i class="fas fa-sync fa-spin fa-2x"></i>
                        <p>Buscando novas recomendações...</p>
                    </div>
                `;
            }

            await loadRealRecommendations();
        });
    }

    // 🔥 CONFIGURAR BOTÃO SELECIONAR
    if (selectBtn) {
        selectBtn.addEventListener('click', async function() {
            console.log('🎯 Botão SELECIONAR clicado');
            console.log('selectedMovie:', selectedMovie);

            if (selectedMovie) {
                await addRecommendedMovie(selectedMovie);
            } else {
                alert('❌ Por favor, selecione um filme primeiro.');
            }
        });
    }

    // 🔥 FECHAR MODAL AO CLICAR FORA
    window.addEventListener('click', (event) => {
        if (event.target === recommendationModal) {
            recommendationModal.style.display = 'none';
        }
    });
}

// 🔥 CARREGAR RECOMENDAÇÕES REAIS DA IA
async function loadRealRecommendations() {
    try {
        console.log('🎯 Buscando recomendações da IA...');

        const response = await fetch(`/api/recommendations/${currentUserId}`);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('📊 Resposta da API de recomendações:', data);

        if (data.success && data.recommendations && data.recommendations.length > 0) {
            displayRealRecommendations(data.recommendations, data.type);
        } else {
            throw new Error(data.error || 'Nenhuma recomendação disponível');
        }

    } catch (error) {
        console.error('❌ Erro ao carregar recomendações IA:', error);
        await loadFallbackRecommendations();
    }
}

// 🔥 EXIBIR RECOMENDAÇÕES REAIS
function displayRealRecommendations(recommendations, type) {
    const recommendationsGrid = document.getElementById('recommendationsGrid');
    if (!recommendationsGrid) return;

    console.log(`🎬 Exibindo ${recommendations.length} recomendações (tipo: ${type})`);

    if (recommendations.length === 0) {
        recommendationsGrid.innerHTML = `
            <div class="no-recommendations">
                <i class="fas fa-robot"></i>
                <p>Nenhuma recomendação disponível no momento.</p>
            </div>
        `;
        return;
    }

    recommendationsGrid.innerHTML = recommendations.map((rec, index) => {
        const posterUrl = rec.poster_url || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80';
        const year = rec.year || 'N/A';
        const genre = rec.genre || 'Não especificado';

        return `
            <div class="recommendation-item" data-movie-id="${index}">
                <div class="movie-poster-container">
                    <img src="${posterUrl}" alt="${rec.title}" class="recommendation-poster"
                         onerror="this.src='https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'">
                </div>
                <div class="recommendation-info">
                    <h3 class="recommendation-title">${rec.title}</h3>
                    <div class="recommendation-genre">${genre}</div>
                    ${rec.reason ? `<p class="recommendation-reason">"${rec.reason}"</p>` : ''}
                    ${rec.mood ? `<div class="recommendation-mood">🎭 ${rec.mood}</div>` : ''}
                    ${year !== 'N/A' ? `<div class="recommendation-year">📅 ${year}</div>` : ''}
                    ${rec.imdb_rating ? `<div class="recommendation-rating">⭐ ${rec.imdb_rating}/10</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Adicionar eventos de clique
    setupRecommendationEvents(recommendations);
}

// 🔥 CONFIGURAR EVENTOS DE SELEÇÃO
function setupRecommendationEvents(recommendations) {
    const recommendationItems = document.querySelectorAll('.recommendation-item');
    const selectBtn = document.getElementById('selectBtn');

    recommendationItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            // Remover seleção anterior
            document.querySelectorAll('.recommendation-item').forEach(i => {
                i.classList.remove('selected');
            });

            // Adicionar seleção atual
            item.classList.add('selected');
            selectedMovie = recommendations[index];
            selectBtn.disabled = false;

            console.log('🎯 Filme selecionado:', selectedMovie.title);
        });
    });
}

// 🔥 FALLBACK PARA RECOMENDAÇÕES
async function loadFallbackRecommendations() {
    console.log('🔄 Carregando fallback de recomendações...');

    try {
        // Buscar filmes populares do banco
        const response = await fetch('/api/movies');
        const data = await response.json();

        if (data.success && data.movies && data.movies.length > 0) {
            // Pegar 3 filmes aleatórios como fallback
            const shuffled = data.movies.sort(() => 0.5 - Math.random());
            const fallbackRecommendations = shuffled.slice(0, 3).map(movie => ({
                title: movie.title,
                poster_url: movie.poster_url,
                year: movie.year,
                genre: movie.genre,
                imdb_rating: movie.imdb_rating,
                reason: "Recomendado baseado em popularidade",
                mood: "Popular"
            }));

            displayRealRecommendations(fallbackRecommendations, 'fallback');
        } else {
            throw new Error('Nenhum filme disponível para fallback');
        }

    } catch (error) {
        console.error('❌ Erro no fallback:', error);
        showRecommendationError();
    }
}

// 🔥 ADICIONAR FILME RECOMENDADO
async function addRecommendedMovie(movie) {
    try {
        console.log('🎬 Iniciando adição do filme recomendado:', movie.title);

        // Buscar detalhes completos do filme na API OMDB
        console.log('🔍 Buscando detalhes do filme na OMDB...');
        const searchResult = await searchMovieInAPI(movie.title);

        let movieData;

        if (searchResult.success) {
            // Usar dados da OMDB
            movieData = {
                title: searchResult.movie.title,
                genre: searchResult.movie.genre || 'Não especificado',
                year: searchResult.movie.year || 2023,
                actors: searchResult.movie.actors || 'Elenco não disponível',
                description: searchResult.movie.description || movie.reason || 'Filme recomendado pela IA',
                poster_url: searchResult.movie.poster_url || 'https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
                imdb_rating: searchResult.movie.imdb_rating || 0,
                rotten_tomatoes_rating: searchResult.movie.rotten_tomatoes_rating || 0
            };
            console.log('✅ Dados obtidos da OMDB');
        } else {
            // Usar dados básicos da recomendação
            movieData = {
                title: movie.title,
                genre: movie.genre || 'Não especificado',
                year: movie.year || 2023,
                actors: movie.cast || 'Elenco não disponível',
                description: movie.reason || movie.synopsis || 'Filme recomendado pela IA',
                poster_url: movie.poster_url || movie.poster || 'https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80',
                imdb_rating: movie.imdb_rating || 0,
                rotten_tomatoes_rating: movie.rotten_tomatoes_rating || 0
            };
            console.log('⚠️ Usando dados básicos da recomendação');
        }

        console.log('📝 Dados finais do filme:', movieData);

        // Adicionar ao banco
        console.log('💾 Enviando para o banco de dados...');
        const result = await addMovieToDatabase(movieData);

        if (result.success) {
            console.log('✅ Filme adicionado com sucesso! ID:', result.movie_id);
            alert(`✅ "${movie.title}" adicionado ao catálogo com sucesso!`);

            // Fechar modal
            const recommendationModal = document.getElementById('recommendationModal');
            if (recommendationModal) {
                recommendationModal.style.display = 'none';
                console.log('✅ Modal fechado');
            }

            // Recarregar filmes
            await loadRatedMovies();
            console.log('✅ Catálogo recarregado');

        } else {
            throw new Error(result.error || 'Erro desconhecido ao adicionar filme');
        }

    } catch (error) {
        console.error('❌ Erro detalhado ao adicionar filme recomendado:', error);
        alert(`❌ Erro ao adicionar "${movie.title}": ${error.message}`);
    }
}

// 🔥 ADICIONAR DEBUG TEMPORÁRIO PARA VERIFICAR SELEÇÃO
function addSelectionDebug() {
    const selectBtn = document.getElementById('selectBtn');
    if (selectBtn) {
        // Remover event listener antigo se existir
        selectBtn.replaceWith(selectBtn.cloneNode(true));

        // Novo event listener com debug
        const newSelectBtn = document.getElementById('selectBtn');
        newSelectBtn.addEventListener('click', async function() {
            console.group('🔍 DEBUG - BOTÃO SELECIONAR CLICADO');
            console.log('Botão habilitado:', !this.disabled);
            console.log('selectedMovie:', selectedMovie);

            if (selectedMovie) {
                console.log('Filme selecionado:', selectedMovie.title);
                await addRecommendedMovie(selectedMovie);
            } else {
                console.error('❌ Nenhum filme selecionado!');
                alert('Por favor, selecione um filme primeiro.');
            }
            console.groupEnd();
        });

        console.log('✅ Debug do botão selecionar adicionado');
    }
}

// 🔥 MOSTRAR ERRO NAS RECOMENDAÇÕES
function showRecommendationError() {
    const recommendationsGrid = document.getElementById('recommendationsGrid');
    if (!recommendationsGrid) return;

    recommendationsGrid.innerHTML = `
        <div class="error-recommendations">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Erro ao carregar recomendações</h4>
            <p>Não foi possível conectar com o serviço de IA no momento.</p>
            <button class="retry-btn" onclick="loadRealRecommendations()">
                <i class="fas fa-redo"></i>
                Tentar Novamente
            </button>
        </div>
    `;
}

// 🔥 CSS TEMPORÁRIO (adicionar ao seu CSS)
const recommendationStyles = `
.loading-recommendations {
    text-align: center;
    padding: 40px;
    color: #ccc;
}

.loading-recommendations i {
    margin-bottom: 15px;
    color: #e50914;
}

.no-recommendations {
    text-align: center;
    padding: 40px;
    color: #666;
}

.error-recommendations {
    text-align: center;
    padding: 30px;
    color: #ff6b6b;
}

.error-recommendations i {
    font-size: 3rem;
    margin-bottom: 15px;
}

.recommendation-reason {
    font-style: italic;
    color: #888;
    margin: 8px 0;
    font-size: 0.9rem;
}

.recommendation-mood {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    display: inline-block;
    margin: 5px 0;
}

.recommendation-year, .recommendation-rating {
    color: #ccc;
    font-size: 0.8rem;
    margin: 2px 0;
}

.retry-btn {
    background: #e50914;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    margin-top: 15px;
}

.retry-btn:hover {
    background: #f40612;
}
`;

// Adicionar estilos
const styleSheet = document.createElement("style");
styleSheet.textContent = recommendationStyles;
document.head.appendChild(styleSheet);

