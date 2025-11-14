// Estado global
let currentUser = null;
let userRatings = [];
let favorites = JSON.parse(localStorage.getItem('cineia_favorites')) || [];
let allMovies = [];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 CineIA - Página de avaliações carregada');

    // Verificar se usuário está logado
    checkUserLogin();
    setupModal();
    setupEventListeners();
    setupSearch();
});

// Verificar login do usuário E buscar dados do banco
async function checkUserLogin() {
    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (savedUser) {
        const userData = JSON.parse(savedUser);

        // 🔥 BUSCAR DADOS ATUALIZADOS DO BANCO
        const userInfo = await fetchUserFromDatabase(userData.id);

        if (userInfo) {
            currentUser = userInfo;
            console.log('Usuário logado (dados do banco):', currentUser.username);

            // Atualizar o localStorage/sessionStorage com dados atualizados
            if (localStorage.getItem('user')) {
                localStorage.setItem('user', JSON.stringify(currentUser));
            } else {
                sessionStorage.setItem('user', JSON.stringify(currentUser));
            }

            // 🔥 MOSTRAR NOME DO USUÁRIO
            updateUsernameDisplay(currentUser.username);

            await loadUserRatings();
            await loadAllMovies(); // Carregar todos os filmes para busca
            loadGrid();
        } else {
            // Se não encontrou no banco, fazer logout
            logoutUser();
        }
    } else {
        // Redirecionar para login se não estiver logado
        alert('Por favor, faça login para ver suas avaliações.');
        window.location.href = '/';
    }
}

// 🔥 FUNÇÃO PARA BUSCAR USUÁRIO DO BANCO DE DADOS
async function fetchUserFromDatabase(userId) {
    try {
        const response = await fetch(`/api/user/${userId}`);
        const data = await response.json();

        if (data.success) {
            return data.user;
        } else {
            console.error('Usuário não encontrado no banco:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Erro ao buscar usuário do banco:', error);
        return null;
    }
}

// 🔥 FUNÇÃO PARA FAZER LOGOUT (se usuário não for encontrado)
function logoutUser() {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    localStorage.removeItem('cineia_favorites');
    currentUser = null;
    userRatings = [];
    favorites = [];

    alert('Sessão expirada. Por favor, faça login novamente.');
    window.location.href = '/';
}

// 🔥 FUNÇÃO PARA ATUALIZAR O NOME NA INTERFACE
function updateUsernameDisplay(username) {
    const usernameElements = document.querySelectorAll('.username');
    usernameElements.forEach(element => {
        element.textContent = username;
    });
}

// 🔥 FUNÇÃO PARA ATUALIZAR INFORMAÇÕES DO USUÁRIO (se necessário em outras páginas)
async function refreshUserData() {
    if (!currentUser) return;

    const userInfo = await fetchUserFromDatabase(currentUser.id);
    if (userInfo) {
        currentUser = userInfo;
        updateUsernameDisplay(currentUser.username);

        // Atualizar storage
        if (localStorage.getItem('user')) {
            localStorage.setItem('user', JSON.stringify(currentUser));
        } else {
            sessionStorage.setItem('user', JSON.stringify(currentUser));
        }
    }
}

// Carregar avaliações do usuário da API
async function loadUserRatings() {
    if (!currentUser) return;

    try {
        const response = await fetch(`/api/user/${currentUser.id}/ratings`);
        const data = await response.json();

        if (data.success) {
            userRatings = data.ratings || [];
            console.log(`Carregadas ${userRatings.length} avaliações do usuário`);
        } else {
            console.error('Erro ao carregar avaliações:', data.error);
            userRatings = [];
        }
    } catch (error) {
        console.error('Erro de conexão:', error);
        userRatings = [];
    }
}

// Carregar todos os filmes para busca
async function loadAllMovies() {
    try {
        const response = await fetch('/api/movies');
        const data = await response.json();

        if (data.success) {
            allMovies = data.movies || [];
            console.log(`Carregados ${allMovies.length} filmes para busca`);
        } else {
            console.error('Erro ao carregar filmes:', data.error);
            allMovies = [];
        }
    } catch (error) {
        console.error('Erro de conexão ao carregar filmes:', error);
        allMovies = [];
    }
}

// Carregar grid com avaliações reais
function loadGrid() {
    renderGrid('recommendedGrid', userRatings);
}

// Renderizar grid com dados reais da API
function renderGrid(containerId, ratings) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (ratings.length === 0) {
        container.innerHTML = `
            <div class="no-ratings">
                <i class="fas fa-film"></i>
                <h3>Nenhuma avaliação encontrada</h3>
                <p>Você ainda não avaliou nenhum filme.</p>
                <button class="browse-movies-btn" onclick="window.location.href='../AllMov/mov.html'">
                    Explorar Filmes
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = ratings.map(rating => `
        <div class="movie-card" onclick="openMovieModal(${rating.movie_id})">
            <img src="${rating.poster_url || 'https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'}" 
                 alt="${rating.title}" class="movie-poster"
                 onerror="this.src='https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'">
            <div class="movie-info">
                <h4 class="movie-title">${rating.title}</h4>
                <span class="movie-year">${rating.year}</span>
                <div class="user-rating-badge">
                    <i class="fas fa-star"></i>
                    <span>${rating.user_rating}/10</span>
                </div>
                <div class="movie-actions">
                    <button class="movie-watch" onclick="event.stopPropagation(); openVideoPlayer(${rating.movie_id})">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="movie-favorite ${favorites.includes(rating.movie_id) ? 'active' : ''}" 
                            onclick="event.stopPropagation(); toggleFavorite(${rating.movie_id}, event)">
                        <i class="${favorites.includes(rating.movie_id) ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== FUNÇÕES DO CÓDIGO 1 =====

// Alternar favorito
function toggleFavorite(movieId, event = null) {
    if (event) {
        event.stopPropagation();
    }

    if (!currentUser) {
        alert('Por favor, faça login para adicionar favoritos.');
        return;
    }

    const isCurrentlyFavorite = favorites.includes(movieId);

    if (isCurrentlyFavorite) {
        favorites = favorites.filter(id => id !== movieId);
    } else {
        favorites.push(movieId);
    }

    localStorage.setItem('cineia_favorites', JSON.stringify(favorites));

    // Atualizar interface visual
    updateFavoriteUI(movieId, !isCurrentlyFavorite);

    // Recarregar grid para atualizar ícones
    loadGrid();

    // Feedback
    const movie = userRatings.find(r => r.movie_id === movieId) || allMovies.find(m => m.id === movieId);
    const movieTitle = movie ? movie.title : 'Filme';
    const action = isCurrentlyFavorite ? 'removido dos' : 'adicionado aos';

    showNotification(`"${movieTitle}" ${action} favoritos!`);
}

// Atualizar UI dos favoritos
function updateFavoriteUI(movieId, isFavorite) {
    const favoriteButtons = document.querySelectorAll(`.movie-favorite[onclick*="${movieId}"]`);
    favoriteButtons.forEach(btn => {
        btn.classList.toggle('active', isFavorite);
        btn.innerHTML = `<i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>`;
    });

    const modalFavoriteBtn = document.querySelector('.favorite-btn[onclick*="' + movieId + '"]');
    if (modalFavoriteBtn) {
        modalFavoriteBtn.classList.toggle('active', isFavorite);
        modalFavoriteBtn.innerHTML = `<i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
            ${isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}`;
    }
}

// Abrir modal com dados reais
async function openMovieModal(movieId) {
    try {
        // Buscar detalhes completos do filme
        const response = await fetch(`/api/movies/${movieId}`);
        const data = await response.json();

        if (!data.success) {
            alert('Erro ao carregar detalhes do filme.');
            return;
        }

        const movie = data.movie;
        const userRating = userRatings.find(r => r.movie_id === movieId);

        const modal = document.getElementById('movieModal');
        const detailsContainer = document.getElementById('movieDetails');

        detailsContainer.innerHTML = `
            <div class="movie-detail-hero" style="background-image: url('${movie.backdrop_url || movie.poster_url || 'https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'}')">
                <div class="movie-detail-content">
                    <div class="movie-detail-poster">
                        <img src="${movie.poster_url || 'https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'}" 
                             alt="${movie.title}"
                             onerror="this.src='https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'">
                    </div>
                    <div class="movie-detail-info">
                        <h2>${movie.title} (${movie.year})</h2>
                        
                        <div class="movie-actions-modal">
                            <button class="watch-btn" onclick="openVideoPlayer(${movie.id})">
                                <i class="fas fa-play"></i>
                                Assistir
                            </button>
                            <button class="favorite-btn ${favorites.includes(movieId) ? 'active' : ''}" 
                                    onclick="toggleFavorite(${movieId}, event)">
                                <i class="${favorites.includes(movieId) ? 'fas' : 'far'} fa-heart"></i>
                                ${favorites.includes(movieId) ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
                            </button>
                        </div>
                        
                        <div class="ratings-container">
                            <div class="rating-item">
                                <span class="rating-label">IMDb</span>
                                <span class="rating-value">${movie.imdb_rating || 'N/A'}/10</span>
                            </div>
                            <div class="rating-item">
                                <span class="rating-label">Rotten Tomatoes</span>
                                <span class="rating-value">${movie.rotten_tomatoes_rating || 'N/A'}%</span>
                            </div>
                            <div class="rating-item">
                                <span class="rating-label">Sua Avaliação</span>
                                <span class="rating-value" id="userRatingDisplay">${userRating ? userRating.user_rating + '/10' : 'Não avaliado'}</span>
                            </div>
                        </div>
                        
                        <div class="actors-section">
                            <h4>Elenco Principal</h4>
                            <p>${movie.actors || 'Informação não disponível'}</p>
                        </div>
                        
                        <div class="synopsis-section">
                            <h4>Sinopse</h4>
                            <p>${movie.description || 'Sinopse não disponível.'}</p>
                        </div>
                        
                        <div class="user-rating-section">
                            <h4>${userRating ? 'Alterar Avaliação' : 'Avaliar Filme'}</h4>
                            <div class="star-rating" id="starRating">
                                ${Array.from({length: 10}, (_, i) => `
                                    <span class="star ${userRating ? (i < userRating.user_rating ? 'active' : '') : ''}" 
                                          data-rating="${i + 1}">★</span>
                                `).join('')}
                            </div>
                            <button class="submit-rating" onclick="${userRating ? `updateRating(${movieId})` : `submitNewRating(${movieId})`}">
                                ${userRating ? 'Atualizar Avaliação' : 'Enviar Avaliação'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.style.display = 'block';
        setupStarRating(userRating ? userRating.user_rating : 0);

    } catch (error) {
        console.error('Erro ao carregar detalhes do filme:', error);
        alert('Erro ao carregar detalhes do filme.');
    }
}

// Configurar sistema de estrelas
function setupStarRating(initialRating = 0) {
    const stars = document.querySelectorAll('.star');
    let currentRating = initialRating;

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

// Atualizar avaliação existente
async function updateRating(movieId) {
    if (!currentUser) {
        alert('Por favor, faça login para atualizar avaliações.');
        return;
    }

    const rating = getCurrentStarRating();

    if (rating > 0) {
        await submitRatingToAPI(currentUser.id, movieId, rating, 'atualizada');
    } else {
        alert('Por favor, selecione uma avaliação antes de enviar.');
    }
}

// Enviar nova avaliação
async function submitNewRating(movieId) {
    if (!currentUser) {
        alert('Por favor, faça login para avaliar filmes.');
        return;
    }

    const rating = getCurrentStarRating();

    if (rating > 0) {
        await submitRatingToAPI(currentUser.id, movieId, rating, 'registrada');
    } else {
        alert('Por favor, selecione uma avaliação antes de enviar.');
    }
}

// Obter avaliação atual das estrelas
function getCurrentStarRating() {
    const stars = document.querySelectorAll('.star');
    let rating = 0;

    stars.forEach(star => {
        if (star.classList.contains('active')) {
            rating = Math.max(rating, parseInt(star.getAttribute('data-rating')));
        }
    });

    return rating;
}

// Enviar avaliação para a API (VERSÃO CORRIGIDA)
async function submitRatingToAPI(userId, movieId, rating, actionType = 'registrada') {
    try {
        console.log(`📤 Enviando avaliação: User ${userId}, Movie ${movieId}, Rating ${rating}`);

        const response = await fetch('/api/rate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: parseInt(userId),
                movie_id: parseInt(movieId),
                rating: parseFloat(rating)
            })
        });

        console.log(`📥 Resposta recebida: Status ${response.status}`);

        const data = await response.json();
        console.log('📊 Dados da resposta:', data);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${data.error || 'Erro desconhecido'}`);
        }

        if (data.success) {
            console.log('✅ Avaliação salva com sucesso');
            showNotification(`Avaliação ${actionType} com sucesso!`, 'success');

            // Recarregar avaliações
            await loadUserRatings();
            loadGrid();

            // Fechar modal
            const modal = document.getElementById('movieModal');
            if (modal) {
                modal.style.display = 'none';
            }

            return true;
        } else {
            console.error('❌ Erro na resposta da API:', data.error);
            showNotification('Erro ao enviar avaliação: ' + (data.error || 'Erro desconhecido'), 'error');
            return false;
        }

    } catch (error) {
        console.error('💥 Erro ao enviar avaliação:', error);
        showNotification('Erro de conexão ao enviar avaliação: ' + error.message, 'error');
        return false;
    }
}

// ===== FUNÇÕES DE BUSCA DO CÓDIGO 1 =====

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const searchContainer = document.querySelector('.search-container');

    if (!searchInput || !searchResults || !searchContainer) return;

    let searchTimeout;

    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        if (query.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300);
    });

    document.addEventListener('click', function(e) {
        if (!searchContainer.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    searchInput.addEventListener('focus', function(e) {
        if (this.value.trim().length > 0) {
            performSearch(this.value.trim());
        }
    });

    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            searchResults.style.display = 'none';
            this.blur();
        }
    });
}

function performSearch(query) {
    const searchResults = document.getElementById('searchResults');
    const normalizedQuery = query.toLowerCase().trim();

    if (normalizedQuery.length === 0) {
        searchResults.style.display = 'none';
        return;
    }

    const results = allMovies.filter(movie =>
        movie.title.toLowerCase().includes(normalizedQuery)
    ).slice(0, 8);

    displaySearchResults(results, normalizedQuery);
}

function displaySearchResults(results, query) {
    const searchResults = document.getElementById('searchResults');

    if (results.length === 0) {
        searchResults.innerHTML = '<div class="no-results">Filme não encontrado...</div>';
        searchResults.style.display = 'block';
        return;
    }

    searchResults.innerHTML = results.map(movie => `
        <div class="search-result-item" onclick="selectSearchResult(${movie.id})">
            <img src="${movie.poster_url || 'https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'}" 
                 alt="${movie.title}" class="search-result-poster"
                 onerror="this.src='https://images.unsplash.com/photo-1489599809505-7c8e1c8bfc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'">
            <div class="search-result-info">
                <div class="search-result-title">${highlightMatch(movie.title, query)}</div>
                <div class="search-result-year">${movie.year}</div>
            </div>
        </div>
    `).join('');

    searchResults.style.display = 'block';
}

function highlightMatch(title, query) {
    const index = title.toLowerCase().indexOf(query);
    if (index === -1) return title;

    const before = title.substring(0, index);
    const match = title.substring(index, index + query.length);
    const after = title.substring(index + query.length);

    return `${before}<strong>${match}</strong>${after}`;
}

function selectSearchResult(movieId) {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    searchInput.value = '';
    searchResults.style.display = 'none';
    openMovieModal(movieId);
}

// ===== FUNÇÕES DO PLAYER DE VÍDEO =====

function openVideoPlayer(movieId) {
    const videoPlayerContainer = document.getElementById('videoPlayerContainer');
    const videoFrame = document.getElementById('videoFrame');

    const movie = allMovies.find(m => m.id === movieId) || userRatings.find(r => r.movie_id === movieId);

    // Limpar src anterior para evitar conflitos
    videoFrame.src = '';

    // Pequeno delay para garantir que o iframe seja recarregado
    setTimeout(() => {
        if (movie && movie.trailer_url) {
            videoFrame.src = movie.trailer_url + '?enablejsapi=1&origin=' + window.location.origin;
        } else {
            // URL alternativa mais confiável
            videoFrame.src = "https://www.youtube.com/embed/0q6yphdZhUA?enablejsapi=1&origin=" + window.location.origin;
        }

        videoPlayerContainer.style.display = 'flex';
    }, 100);
}

function closeVideoPlayer() {
    const videoPlayerContainer = document.getElementById('videoPlayerContainer');
    const videoFrame = document.getElementById('videoFrame');

    // Pausar o vídeo antes de fechar
    videoFrame.src = '';
    videoPlayerContainer.style.display = 'none';
}

// ===== FUNÇÕES AUXILIARES =====

// Função auxiliar para mostrar notificações
function showNotification(message, type = 'success') {
    // Remove notificação anterior se existir
    const existingNotification = document.querySelector('.rating-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `rating-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Mostrar animação
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Remover após 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Modal functions
function setupModal() {
    const modal = document.getElementById('movieModal');
    const closeBtn = document.querySelector('.close-modal');

    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        }
    }

    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
}

// Event listeners
function setupEventListeners() {
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeVideoPlayer();
            const modal = document.getElementById('movieModal');
            if (modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        }
    });

    document.getElementById('videoPlayerContainer').addEventListener('click', function(event) {
        if (event.target === this) {
            closeVideoPlayer();
        }
    });
}