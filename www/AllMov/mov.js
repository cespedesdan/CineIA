// Estado global
let favorites = JSON.parse(localStorage.getItem('cineia_favorites')) || [];
let currentUser = null;
let allMovies = []; // Cache de todos os filmes

// Inicialização - ATUALIZADA
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 CineIA - Página de filmes carregada');
    checkUserLogin();
    setupModal();
    setupEventListeners();
    setupSearch();

    // Inicializar estado do banner após carregar filmes
    setTimeout(() => {
        initializeBannerFavorite();
    }, 1000);
});

// ===== FUNÇÕES DO CÓDIGO 1 TRANSFERIDAS =====

// Configurar sistema de busca
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

// Executar busca
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

// Exibir resultados da busca
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

// Destacar correspondência no texto
function highlightMatch(title, query) {
    const index = title.toLowerCase().indexOf(query);
    if (index === -1) return title;

    const before = title.substring(0, index);
    const match = title.substring(index, index + query.length);
    const after = title.substring(index + query.length);

    return `${before}<strong>${match}</strong>${after}`;
}

// Selecionar resultado da busca
function selectSearchResult(movieId) {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    searchInput.value = '';
    searchResults.style.display = 'none';
    openMovieModal(movieId);
}

// Alternar favorito - VERSÃO CORRIGIDA
function toggleFavorite(movieId, event = null) {
    if (event) {
        event.stopPropagation();
    }

    // Caso especial para o filme destacado
    if (movieId === 'featured') {
        // Para o filme destacado, vamos usar um ID fixo ou buscar o filme real
        const featuredMovie = allMovies.find(movie => movie.title === "Duna: Parte Dois");

        if (featuredMovie) {
            movieId = featuredMovie.id;
        } else {
            // Se não encontrar o filme, usar um ID temporário para o destacado
            const featuredMovieId = 'featured_movie';
            const isCurrentlyFavorite = favorites.includes(featuredMovieId);

            if (isCurrentlyFavorite) {
                favorites = favorites.filter(id => id !== featuredMovieId);
                updateFavoriteUI(featuredMovieId, false);
            } else {
                favorites.push(featuredMovieId);
                updateFavoriteUI(featuredMovieId, true);
            }

            localStorage.setItem('cineia_favorites', JSON.stringify(favorites));
            return;
        }
    }

    // Para filmes normais
    const movie = allMovies.find(m => m.id === movieId);
    if (movie) {
        const isCurrentlyFavorite = favorites.includes(movieId);

        if (isCurrentlyFavorite) {
            favorites = favorites.filter(id => id !== movieId);
        } else {
            favorites.push(movieId);
        }

        localStorage.setItem('cineia_favorites', JSON.stringify(favorites));

        // Atualizar interface visual
        updateFavoriteUI(movieId, !isCurrentlyFavorite);

        // Recarregar grid se necessário
        loadUserRatings();
    }
}

// Atualizar UI dos favoritos - VERSÃO CORRIGIDA
function updateFavoriteUI(movieId, isFavorite) {
    // Atualizar botões dos cards de filme
    const favoriteButtons = document.querySelectorAll(`.movie-favorite[onclick*="${movieId}"]`);
    favoriteButtons.forEach(btn => {
        btn.classList.toggle('active', isFavorite);
        btn.innerHTML = `<i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>`;
    });

    // Atualizar botão no modal
    const modalFavoriteBtn = document.querySelector('.favorite-btn[onclick*="' + movieId + '"]');
    if (modalFavoriteBtn) {
        modalFavoriteBtn.classList.toggle('active', isFavorite);
        modalFavoriteBtn.innerHTML = `<i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
            ${isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}`;
    }

    // 🔥 ATUALIZAR BOTÃO DO BANNER (ADICIONE ESTA PARTE)
    const bannerFavoriteBtn = document.querySelector('.banner-actions .favorite-btn');
    if (bannerFavoriteBtn && (movieId === 'featured' || movieId === 'featured_movie')) {
        bannerFavoriteBtn.classList.toggle('active', isFavorite);
        bannerFavoriteBtn.innerHTML = `<i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
            ${isFavorite ? 'Favoritado' : 'Favoritar'}`;
    }
}

// Abrir modal do filme
async function openMovieModal(movieId) {
    try {
        const movie = allMovies.find(m => m.id === movieId);
        if (!movie) {
            alert('Filme não encontrado no catálogo');
            return;
        }

        // Buscar avaliação específica do usuário
        const userRating = await getUserRatingForMovie(movieId);
        await showMovieModal(movie, userRating);

    } catch (error) {
        console.error('Erro ao abrir modal:', error);
        alert('Erro ao carregar informações do filme');
    }
}

// ===== FUNÇÕES DO CÓDIGO 2 MANTIDAS =====

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

            await loadAllMovies();
        } else {
            // Se não encontrou no banco, fazer logout
            logoutUser();
        }
    } else {
        // Redirecionar para login se não estiver logado
        alert('Por favor, faça login para ver os filmes.');
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

// Carregar todos os filmes da API
async function loadAllMovies() {
    try {
        showLoadingState();

        const response = await fetch('/api/movies');

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            allMovies = data.movies || [];
            loadUserRatings();
        } else {
            throw new Error(data.error || 'Erro ao carregar filmes');
        }
    } catch (error) {
        console.error('Erro ao carregar filmes:', error);
        renderError('Erro ao carregar catálogo: ' + error.message);
    }
}

// Carregar avaliações do usuário
async function loadUserRatings() {
    try {
        if (!currentUser) return;

        const response = await fetch(`/api/user/${currentUser.id}/ratings`);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            if (data.ratings && data.ratings.length > 0) {
                renderUserRatings(data.ratings);
            } else {
                renderAllMovies();
            }
        } else {
            throw new Error(data.error || 'Erro ao carregar avaliações');
        }
    } catch (error) {
        console.error('Erro ao carregar avaliações:', error);
        renderAllMovies();
    }
}

// Renderizar todos os filmes
function renderAllMovies() {
    const container = document.getElementById('recommendedGrid');
    if (!container) return;

    console.log(`🎬 Renderizando ${allMovies.length} filmes`);

    container.innerHTML = allMovies.map(movie => {
        return createMovieCard(movie, 0);
    }).join('');
}

// Renderizar avaliações do usuário
function renderUserRatings(ratings) {
    const container = document.getElementById('recommendedGrid');
    if (!container) return;

    console.log(`🎬 Renderizando ${allMovies.length} filmes com ${ratings.length} avaliações`);

    // Mostrar todos os filmes, com indicação de quais foram avaliados
    container.innerHTML = allMovies.map(movie => {
        // Buscar se o usuário avaliou este filme
        const userRating = ratings.find(r => r.movie_id === movie.id);
        const hasRating = userRating && userRating.user_rating > 0;

        console.log(`📝 ${movie.title}: ${hasRating ? `Avaliado (${userRating.user_rating}/10)` : 'Não avaliado'}`);

        return createMovieCard(movie, userRating ? userRating.user_rating : 0);
    }).join('');
}

// Criar card do filme com dados completos
function createMovieCard(movie, userRating) {
    const posterUrl = movie.poster_url || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80';

    return `
        <div class="movie-card" onclick="openMovieModal(${movie.id})">
            <img src="${posterUrl}" alt="${movie.title}" class="movie-poster">
            <div class="movie-info">
                <h4 class="movie-title">${movie.title}</h4>
                <span class="movie-year">${movie.year}</span>
                ${userRating > 0 ? `
                <div class="rating-badge">
                    <i class="fas fa-star"></i>
                    ${userRating}/10
                </div>
                ` : ''}
                <div class="movie-actions">
                    <button class="movie-watch" onclick="event.stopPropagation(); openVideoPlayer(${movie.id})">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="movie-favorite ${favorites.includes(movie.id) ? 'active' : ''}" 
                            onclick="event.stopPropagation(); toggleFavorite(${movie.id}, event)">
                        <i class="${favorites.includes(movie.id) ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Mostrar estado de carregamento
function showLoadingState() {
    const container = document.getElementById('recommendedGrid');
    if (!container) return;

    container.innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i>
            <h3>Carregando filmes...</h3>
        </div>
    `;
}

// Renderizar mensagem de erro
function renderError(message) {
    const container = document.getElementById('recommendedGrid');
    if (!container) return;

    container.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Erro ao carregar</h3>
            <p>${message}</p>
            <button class="retry-btn" onclick="loadAllMovies()">Tentar Novamente</button>
        </div>
    `;
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

// Mostrar modal com dados completos do filme
async function showMovieModal(movie, userRating) {
    const modal = document.getElementById('movieModal');
    const detailsContainer = document.getElementById('movieDetails');

    if (!detailsContainer) {
        console.error('Container de detalhes do filme não encontrado');
        return;
    }

    const posterUrl = movie.poster_url || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80';
    const backdropUrl = movie.backdrop_url || movie.poster_url || posterUrl;

    const hasExistingRating = userRating > 0;
    const buttonText = hasExistingRating ? 'Atualizar Avaliação' : 'Avaliar Filme';
    const sectionTitle = hasExistingRating ? 'Alterar Avaliação' : 'Avaliar Filme';

    detailsContainer.innerHTML = `
        <div class="movie-detail-hero" style="background-image: url('${backdropUrl}')">
            <div class="movie-detail-content">
                <div class="movie-detail-poster">
                    <img src="${posterUrl}" alt="${movie.title}">
                </div>
                <div class="movie-detail-info">
                    <h2>${movie.title} (${movie.year})</h2>
                    
                    <div class="movie-actions-modal">
                        <button class="watch-btn" onclick="openVideoPlayer(${movie.id})">
                            <i class="fas fa-play"></i>
                            Assistir
                        </button>
                        <button class="favorite-btn ${favorites.includes(movie.id) ? 'active' : ''}" onclick="toggleFavorite(${movie.id}, event)">
                            <i class="${favorites.includes(movie.id) ? 'fas' : 'far'} fa-heart"></i>
                            ${favorites.includes(movie.id) ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
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
                            <span class="rating-value" id="userRatingDisplay">${hasExistingRating ? userRating + '/10' : 'Não avaliado'}</span>
                        </div>
                    </div>
                    
                    ${movie.actors ? `
                    <div class="actors-section">
                        <h4>Elenco Principal</h4>
                        <p>${movie.actors}</p>
                    </div>
                    ` : ''}
                    
                    ${movie.description ? `
                    <div class="synopsis-section">
                        <h4>Sinopse</h4>
                        <p>${movie.description}</p>
                    </div>
                    ` : ''}
                    
                    ${movie.genre ? `
                    <div class="genre-section">
                        <h4>Gênero</h4>
                        <p>${movie.genre}</p>
                    </div>
                    ` : ''}
                    
                    <div class="user-rating-section">
                        <h4>${sectionTitle}</h4>
                        <div class="star-rating" id="starRating">
                            ${Array.from({length: 10}, (_, i) => `
                                <span class="star ${i < userRating ? 'active' : ''}" data-rating="${i + 1}">★</span>
                            `).join('')}
                        </div>
                        <button class="submit-rating" onclick="submitRating(${movie.id})">${buttonText}</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'block';
    setupStarRating(userRating);
}

// Buscar avaliação do usuário para um filme específico
async function getUserRatingForMovie(movieId) {
    try {
        if (!currentUser) return 0;

        const response = await fetch(`/api/user/${currentUser.id}/ratings`);
        if (!response.ok) return 0;

        const data = await response.json();
        console.log('📊 Avaliações do usuário:', data);

        if (data.success && data.ratings) {
            const userRating = data.ratings.find(r => r.movie_id === movieId);
            console.log(`🎯 Avaliação encontrada para filme ${movieId}:`, userRating);
            return userRating ? userRating.user_rating : 0;
        }
        return 0;
    } catch (error) {
        console.error('❌ Erro ao buscar avaliação do usuário:', error);
        return 0;
    }
}

// Sistema de avaliação com estrelas
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
            const userRatingDisplay = document.getElementById('userRatingDisplay');
            if (userRatingDisplay) {
                userRatingDisplay.textContent = `${currentRating}/10`;
            }
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
async function submitRating(movieId) {
    try {
        if (!currentUser) {
            alert('Por favor, faça login para avaliar filmes.');
            return;
        }

        const stars = document.querySelectorAll('.star');
        let rating = 0;

        // Determinar avaliação selecionada
        stars.forEach(star => {
            if (star.classList.contains('active')) {
                rating = Math.max(rating, parseInt(star.getAttribute('data-rating')));
            }
        });

        if (rating > 0) {
            console.log(`📤 Enviando avaliação: user=${currentUser.id}, movie=${movieId}, rating=${rating}`);

            // Enviar para API C++
            const response = await fetch('/api/rate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    movie_id: movieId,
                    rating: rating
                })
            });

            console.log(`📥 Status da resposta: ${response.status}`);
            const data = await response.json();
            console.log('📊 Resposta da API:', data);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${data.error || 'Erro desconhecido'}`);
            }

            if (!data.success) {
                throw new Error(data.error || 'Erro ao registrar avaliação');
            }

            console.log('✅ Avaliação registrada com sucesso');

            // Atualizar interface
            updateUIAfterRating(movieId, rating, data.message);

        } else {
            alert('Por favor, selecione uma avaliação antes de enviar.');
        }
    } catch (error) {
        console.error('❌ Erro detalhado ao enviar avaliação:', error);
        alert('Erro ao atualizar avaliação: ' + error.message);
    }
}

// Função auxiliar para atualizar a UI após avaliação
function updateUIAfterRating(movieId, rating, message) {
    // Atualizar display no modal
    const userRatingDisplay = document.getElementById('userRatingDisplay');
    if (userRatingDisplay) {
        userRatingDisplay.textContent = `${rating}/10`;
    }

    // Atualizar badge na lista de filmes
    updateMovieCardRating(movieId, rating);

    // Mostrar mensagem de sucesso
    const successMessage = message || `Avaliação atualizada para ${rating} estrelas!`;
    alert(successMessage);

    // Recarregar lista de avaliações para atualizar todos os dados
    setTimeout(async () => {
        await loadUserRatings();
    }, 1000);

    // Fechar modal após delay
    setTimeout(() => {
        const modal = document.getElementById('movieModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }, 1500);
}

// Atualizar rating no card do filme
function updateMovieCardRating(movieId, rating) {
    const movieCards = document.querySelectorAll('.movie-card');
    movieCards.forEach(card => {
        // Encontrar o card correto pelo movieId
        const movieTitle = card.querySelector('.movie-title');
        if (movieTitle) {
            const movie = allMovies.find(m => m.id === movieId);
            if (movie && movieTitle.textContent.includes(movie.title)) {
                let ratingBadge = card.querySelector('.rating-badge');
                if (!ratingBadge && rating > 0) {
                    // Criar badge se não existir
                    const movieInfo = card.querySelector('.movie-info');
                    ratingBadge = document.createElement('div');
                    ratingBadge.className = 'rating-badge';
                    movieInfo.insertBefore(ratingBadge, movieInfo.querySelector('.movie-actions'));
                }
                if (ratingBadge) {
                    ratingBadge.innerHTML = `<i class="fas fa-star"></i> ${rating}/10`;
                    console.log(`✅ Card atualizado: ${movie.title} - ${rating}/10`);
                }
            }
        }
    });
}

// Funções do player de vídeo
function openVideoPlayer(movieId) {
    const videoPlayerContainer = document.getElementById('videoPlayerContainer');
    const videoFrame = document.getElementById('videoFrame');

    if (!videoPlayerContainer || !videoFrame) {
        console.error('Elementos do player de vídeo não encontrados');
        return;
    }

    const movie = allMovies.find(m => m.id === movieId);

    // Limpar src anterior para evitar conflitos
    videoFrame.src = '';

    // Pequeno delay para garantir que o iframe seja recarregado
    setTimeout(() => {
        if (movie && movie.trailer_url) {
            videoFrame.src = movie.trailer_url + '?enablejsapi=1&origin=' + window.location.origin;
        } else {
            // URL alternativa
            videoFrame.src = "https://www.youtube.com/embed/0q6yphdZhUA?enablejsapi=1&origin=" + window.location.origin;
        }

        videoPlayerContainer.style.display = 'flex';
    }, 100);
}

function closeVideoPlayer() {
    const videoPlayerContainer = document.getElementById('videoPlayerContainer');
    const videoFrame = document.getElementById('videoFrame');

    if (videoFrame) videoFrame.src = '';
    if (videoPlayerContainer) videoPlayerContainer.style.display = 'none';
}

// Função para o filme em destaque - ATUALIZADA
function openFeaturedMovie() {
    console.log('Abrir detalhes do filme em destaque');
    // Pausar/despausar o vídeo quando clicar no poster
    toggleVideoPlayback();
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

    const videoContainer = document.getElementById('videoPlayerContainer');
    if (videoContainer) {
        videoContainer.addEventListener('click', function(event) {
            if (event.target === this) {
                closeVideoPlayer();
            }
        });
    }
}

// Adicione esta função e a chame no DOMContentLoaded
function initializeBannerFavorite() {
    const featuredMovie = allMovies.find(movie => movie.title === "Duna: Parte Dois");
    const bannerFavoriteBtn = document.querySelector('.banner-actions .favorite-btn');

    if (bannerFavoriteBtn && featuredMovie) {
        const isFavorite = favorites.includes(featuredMovie.id);
        bannerFavoriteBtn.classList.toggle('active', isFavorite);
        bannerFavoriteBtn.innerHTML = `<i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
            ${isFavorite ? 'Favoritado' : 'Favoritar'}`;
    }
}

// Variáveis para controle do vídeo do banner
let isVideoMuted = true;
let isVideoPaused = false;

// Inicializar o vídeo do banner
function initializeBannerVideo() {
    const videoWrapper = document.getElementById('videoWrapper');
    if (videoWrapper) {
        videoWrapper.addEventListener('click', toggleVideoPlayback);
    }

    updateSoundControl();

    // Forçar redimensionamento para garantir tela cheia
    setTimeout(resizeVideoForFullscreen, 100);
}

// Redimensionar vídeo para tela cheia
function resizeVideoForFullscreen() {
    const iframe = document.getElementById('bannerVideo');
    const videoWrapper = document.getElementById('videoWrapper');

    if (iframe && videoWrapper) {
        // Ajustar dinamicamente baseado na tela
        const screenRatio = window.innerWidth / window.innerHeight;
        const videoRatio = 16 / 9; // Ratio do vídeo

        if (screenRatio > videoRatio) {
            // Tela mais larga que o vídeo - aumentar altura
            iframe.style.width = '100%';
            iframe.style.height = '120%';
            iframe.style.transform = 'translate(-50%, -50%) scale(1.45)';
        } else {
            // Tela mais alta que o vídeo - aumentar largura
            iframe.style.width = '120%';
            iframe.style.height = '100%';
            iframe.style.transform = 'translate(-50%, -50%) scale(1.45)';
        }
    }
}

// Alternar entre play/pause do vídeo
function toggleVideoPlayback() {
    const iframe = document.getElementById('bannerVideo');
    const videoWrapper = document.getElementById('videoWrapper');
    const playIndicator = document.querySelector('.play-pause-indicator i');

    if (!iframe || !videoWrapper) return;

    if (isVideoPaused) {
        // Retomar o vídeo
        iframe.src = iframe.src.replace('&pause=1', '') + '&autoplay=1';
        videoWrapper.classList.remove('paused');
        if (playIndicator) {
            playIndicator.className = 'fas fa-play';
        }
    } else {
        // Pausar o vídeo
        iframe.src = iframe.src.replace('&autoplay=1', '') + '&pause=1';
        videoWrapper.classList.add('paused');
        if (playIndicator) {
            playIndicator.className = 'fas fa-pause';
        }
    }

    isVideoPaused = !isVideoPaused;
}

// Alternar som do vídeo
function toggleVideoSound() {
    const iframe = document.getElementById('bannerVideo');
    if (!iframe) return;

    isVideoMuted = !isVideoMuted;

    if (isVideoMuted) {
        iframe.src = iframe.src.replace('&mute=0', '&mute=1');
    } else {
        iframe.src = iframe.src.replace('&mute=1', '&mute=0');
    }

    updateSoundControl();
}

// Atualizar ícone do controle de som
function updateSoundControl() {
    const soundControl = document.getElementById('soundControl');
    if (soundControl) {
        if (isVideoMuted) {
            soundControl.classList.remove('unmuted');
            soundControl.classList.add('muted');
            soundControl.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else {
            soundControl.classList.remove('muted');
            soundControl.classList.add('unmuted');
            soundControl.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    }
}

// Adicionar redimensionamento responsivo
window.addEventListener('resize', resizeVideoForFullscreen);

// Atualize a inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 CineIA - Página de filmes carregada');
    checkUserLogin();
    setupModal();
    setupEventListeners();
    setupSearch();
    initializeBannerVideo();

    setTimeout(() => {
        initializeBannerFavorite();
    }, 1000);
});