// Estado global
let favorites = JSON.parse(localStorage.getItem('cineia_favorites')) || [];
let currentUserId = 1; // ID do usuário atual
let currentUser = null;
let allMovies = [];
let recommendationsTimeout = null;

// Dados do filme em destaque
const featuredMovie = {
    id: 'featured',
    title: 'Duna: Parte Dois',
    year: 2024,
    isFavorite: false
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 CineIA - Página inicial carregada');
    checkUserLogin();
    loadFeaturedMovieState();
    loadRecommendations();
    setupModal();
    setupEventListeners();
    setupSearch();
    addDebugButton();
});

// ========== API INTEGRATIONS ==========

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
            await loadAllMoviesForSearch(); // Carregar filmes para busca
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
        // Simulação - substitua pela sua API real
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
        // Retornar dados mockados para demonstração
        return {
            id: userId,
            username: 'Usuário Demo',
            email: 'demo@cineia.com'
        };
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

// Carregar recomendações da API
async function loadRecommendations() {
    try {
        console.log('🤖 Iniciando carregamento de recomendações...');
        showLoadingState();

        // Timeout de 15 segundos para a IA
        const timeoutPromise = new Promise((_, reject) => {
            recommendationsTimeout = setTimeout(() => {
                reject(new Error('Timeout: A requisição demorou mais de 15 segundos'));
            }, 15000);
        });

        const fetchPromise = fetch(`/api/recommendations/${currentUserId}`);

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Resposta da API de recomendações:', data);

        // Limpar timeout se sucesso
        if (recommendationsTimeout) {
            clearTimeout(recommendationsTimeout);
            recommendationsTimeout = null;
        }

        if (data.success) {
            displayRecommendations(data);
        } else {
            throw new Error(data.error || 'Erro ao carregar recomendações');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar recomendações:', error);

        // Limpar timeout em caso de erro
        if (recommendationsTimeout) {
            clearTimeout(recommendationsTimeout);
            recommendationsTimeout = null;
        }

        // Tentar fallback para recomendações gerais
        await loadFallbackRecommendations();
    }
}

// Carregar recomendações de fallback (apenas filmes do banco)
async function loadFallbackRecommendations() {
    try {
        console.log('🔄 Tentando carregar fallback de recomendações...');
        showLoadingState('Carregando catálogo...');

        const response = await fetch('/api/movies');

        if (!response.ok) {
            throw new Error('Erro ao carregar fallback');
        }

        const data = await response.json();
        console.log('✅ Fallback carregado:', data);

        if (data.success && data.movies && data.movies.length > 0) {
            // Criar estrutura de dados similar à API de recomendações
            const fallbackData = {
                success: true,
                type: 'general',
                message: 'Filmes em destaque',
                recommendations: data.movies.slice(0, 10) // Pegar apenas os primeiros 10
            };
            displayRecommendations(fallbackData);
        } else {
            throw new Error('Nenhum filme disponível');
        }
    } catch (error) {
        console.error('❌ Erro no fallback:', error);
        renderError('Não foi possível carregar recomendações. ' + error.message);
    }
}

// Enviar avaliação para a API
async function submitRatingToAPI(movieId, rating) {
    try {
        console.log(`⭐ Enviando avaliação: Filme ${movieId}, Nota ${rating}`);

        const response = await fetch('/api/rate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUserId,
                movie_id: movieId,
                rating: rating
            })
        });

        if (!response.ok) throw new Error('Erro ao enviar avaliação');

        const data = await response.json();

        if (data.success) {
            console.log('✅ Avaliação registrada com sucesso');
            alert('Avaliação registrada com sucesso!');
            // Recarregar recomendações para refletir a nova avaliação
            loadRecommendations();
        } else {
            throw new Error(data.error || 'Erro desconhecido');
        }
    } catch (error) {
        console.error('❌ Erro ao enviar avaliação:', error);
        alert('Erro ao registrar avaliação. Tente novamente.');
    }
}

// Buscar filme na API
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

        if (!response.ok) throw new Error('Erro na busca');

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Erro ao buscar filme:', error);
        return { success: false, error: error.message };
    }
}

// ========== UI FUNCTIONS ==========

// Atualizar interface com informações do usuário
function updateUserUI() {
    if (!currentUser) return;

    console.log('👤 Atualizando UI do usuário:', currentUser.username);

    const userElements = document.querySelectorAll('.user-name, .username-display');
    userElements.forEach(element => {
        element.textContent = currentUser.username;
    });

    if (currentUser.is_admin) {
        const adminElements = document.querySelectorAll('.admin-badge');
        adminElements.forEach(element => {
            element.style.display = 'inline';
        });
    }
}

// Exibir recomendações na interface
function displayRecommendations(data) {
    const container = document.getElementById('recommendedGrid');
    if (!container) {
        console.error('❌ Container recommendedGrid não encontrado!');
        return;
    }

    console.log('🎬 Exibindo recomendações:', {
        type: data.type,
        count: data.recommendations ? data.recommendations.length : 0,
        message: data.message
    });

    if (!data.recommendations || data.recommendations.length === 0) {
        console.warn('⚠️ Nenhuma recomendação recebida');
        renderNoRecommendations();
        return;
    }

    // Armazenar filmes para uso posterior
    if (data.type === 'general') {
        allMovies = data.recommendations;
    }

    let recommendationsHTML = '';

    if (data.type === 'ai') {
        console.log('🤖 Renderizando recomendações IA');
        // Recomendações da IA
        recommendationsHTML = data.recommendations.map((rec, index) => {
            console.log(`   ${index + 1}. ${rec.title} - ${rec.reason}`);
            const safeTitle = rec.title.replace(/'/g, "\\'");
            return `
            <div class="movie-card" onclick="openAIRecoModal('${safeTitle}')">
                <img src="${rec.poster_url || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'}" 
                     alt="${rec.title}" class="movie-poster">
                <div class="movie-info">
                    <h4 class="movie-title">${rec.title}</h4>
                    ${rec.year ? `<span class="movie-year">${rec.year}</span>` : ''}
                    <div class="ai-badge">
                        <i class="fas fa-robot"></i>
                        Recomendação IA
                    </div>
                    ${rec.reason ? `<div class="ai-reason">"${rec.reason}"</div>` : ''}
                    <div class="movie-actions">
                        <button class="movie-watch" onclick="event.stopPropagation(); openMovieFromRecommendation('${safeTitle}')">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="movie-info-btn" onclick="event.stopPropagation(); openAIRecoModal('${safeTitle}')">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </div>
                </div>
            </div>
        `}).join('');
    } else {
        console.log('🎭 Renderizando recomendações gerais');
        // Recomendações gerais
        recommendationsHTML = data.recommendations.map((movie, index) => {
            console.log(`   ${index + 1}. ${movie.title} (${movie.year})`);
            return `
            <div class="movie-card" onclick="openMovieModalFromAPI(${movie.id})">
                <img src="${movie.poster_url || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'}" 
                     alt="${movie.title}" class="movie-poster">
                <div class="movie-info">
                    <h4 class="movie-title">${movie.title}</h4>
                    <span class="movie-year">${movie.year}</span>
                    <div class="rating-badge">
                        <i class="fas fa-star"></i>
                        ${movie.imdb_rating || 'N/A'}/10
                    </div>
                    <div class="movie-actions">
                        <button class="movie-watch" onclick="event.stopPropagation(); openVideoPlayer(${movie.id})">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="movie-favorite ${favorites.includes(movie.id) ? 'active' : ''}" 
                                onclick="event.stopPropagation(); toggleFavorite(${movie.id})">
                            <i class="${favorites.includes(movie.id) ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `}).join('');
    }

    container.innerHTML = recommendationsHTML;
    console.log('✅ Grid renderizado com sucesso');

    // Adicionar mensagem de tipo de recomendação
    const existingMessage = container.parentNode.querySelector('.recommendation-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageElement = document.createElement('div');
    messageElement.className = 'recommendation-message';
    messageElement.innerHTML = `
        <div class="message-content">
            <i class="fas ${data.type === 'ai' ? 'fa-robot' : 'fa-fire'}"></i>
            <span>${data.message}</span>
            <button class="refresh-btn" onclick="refreshRecommendations()" title="Recarregar recomendações">
                <i class="fas fa-sync-alt"></i>
            </button>
        </div>
    `;
    container.parentNode.insertBefore(messageElement, container);
}

// ========== MODAL FUNCTIONS ==========

// Configurar modal
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

// Abrir modal para filme da API
async function openMovieModalFromAPI(movieId) {
    try {
        console.log(`🎬 Abrindo modal do filme ID: ${movieId}`);
        const response = await fetch(`/api/movies/${movieId}`);

        if (!response.ok) throw new Error('Filme não encontrado');

        const data = await response.json();

        if (data.success) {
            showMovieModal(data.movie);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('❌ Erro ao abrir modal:', error);
        alert('Erro ao carregar informações do filme');
    }
}

// Abrir modal para recomendação IA
async function openMovieFromRecommendation(title) {
    try {
        console.log(`🎬 Buscando filme: ${title}`);
        const data = await searchMovieInAPI(title);

        if (data.success) {
            showMovieModal(data.movie);
        } else {
            // Se não encontrar na API, mostrar modal básico
            openBasicMovieModal(title);
        }
    } catch (error) {
        console.error('❌ Erro ao abrir filme:', error);
        openBasicMovieModal(title);
    }
}

// Mostrar modal com dados do filme
function showMovieModal(movieData) {
    const modal = document.getElementById('movieModal');
    const detailsContainer = document.getElementById('movieDetails');

    if (!detailsContainer) {
        console.error('❌ Container de detalhes não encontrado');
        return;
    }

    const posterUrl = movieData.poster_url || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80';
    const backdropUrl = movieData.poster_url || posterUrl;

    detailsContainer.innerHTML = `
        <div class="movie-detail-hero" style="background-image: url('${backdropUrl}')">
            <div class="movie-detail-content">
                <div class="movie-detail-poster">
                    <img src="${posterUrl}" alt="${movieData.title}">
                </div>
                <div class="movie-detail-info">
                    <h2>${movieData.title} (${movieData.year})</h2>
                    
                    <div class="movie-actions-modal">
                        <button class="watch-btn" onclick="openVideoPlayerFromTitle('${movieData.title}')">
                            <i class="fas fa-play"></i>
                            Assistir
                        </button>
                        <button class="favorite-btn" onclick="addToFavorites('${movieData.title}')">
                            <i class="far fa-heart"></i>
                            Adicionar aos Favoritos
                        </button>
                    </div>
                    
                    <div class="ratings-container">
                        <div class="rating-item">
                            <span class="rating-label">IMDb</span>
                            <span class="rating-value">${movieData.imdb_rating || 'N/A'}/10</span>
                        </div>
                        <div class="rating-item">
                            <span class="rating-label">Rotten Tomatoes</span>
                            <span class="rating-value">${movieData.rotten_tomatoes_rating || 'N/A'}%</span>
                        </div>
                        <div class="rating-item">
                            <span class="rating-label">Avaliação dos Usuários</span>
                            <span class="rating-value">${movieData.user_rating || 'N/A'}/10</span>
                        </div>
                    </div>
                    
                    ${movieData.actors ? `
                    <div class="actors-section">
                        <h4>Elenco Principal</h4>
                        <p>${movieData.actors}</p>
                    </div>
                    ` : ''}
                    
                    ${movieData.description ? `
                    <div class="synopsis-section">
                        <h4>Sinopse</h4>
                        <p>${movieData.description}</p>
                    </div>
                    ` : ''}
                    
                    ${movieData.genre ? `
                    <div class="genre-section">
                        <h4>Gênero</h4>
                        <p>${movieData.genre}</p>
                    </div>
                    ` : ''}
                    
                    <div class="user-rating-section">
                        <h4>Avaliar Filme</h4>
                        <div class="star-rating" id="starRating">
                            ${Array.from({length: 10}, (_, i) => `
                                <span class="star" data-rating="${i + 1}">★</span>
                            `).join('')}
                        </div>
                        <button class="submit-rating" onclick="submitRatingFromModal(${movieData.id})">Avaliar Filme</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'block';
    setupStarRating(0);
}

// Modal para recomendações IA
function openAIRecoModal(title) {
    const modal = document.getElementById('movieModal');
    const detailsContainer = document.getElementById('movieDetails');

    detailsContainer.innerHTML = `
        <div class="movie-detail-hero" style="background-image: url('https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')">
            <div class="movie-detail-content">
                <div class="movie-detail-poster">
                    <img src="https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="${title}">
                </div>
                <div class="movie-detail-info">
                    <h2>${title}</h2>
                    
                    <div class="ai-recommendation-info">
                        <div class="ai-badge-large">
                            <i class="fas fa-robot"></i>
                            Recomendação por Inteligência Artificial
                        </div>
                        <p>Este filme foi recomendado especialmente para você com base no seu histórico de visualização.</p>
                    </div>
                    
                    <div class="movie-actions-modal">
                        <button class="watch-btn" onclick="openMovieFromRecommendation('${title.replace(/'/g, "\\'")}')">
                            <i class="fas fa-play"></i>
                            Ver Detalhes e Assistir
                        </button>
                        <button class="favorite-btn" onclick="addToFavorites('${title}')">
                            <i class="far fa-heart"></i>
                            Adicionar aos Favoritos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

// Modal básico para filmes não encontrados
function openBasicMovieModal(title) {
    const modal = document.getElementById('movieModal');
    const detailsContainer = document.getElementById('movieDetails');

    detailsContainer.innerHTML = `
        <div class="movie-detail-hero" style="background-image: url('https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')">
            <div class="movie-detail-content">
                <div class="movie-detail-poster">
                    <img src="https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="${title}">
                </div>
                <div class="movie-detail-info">
                    <h2>${title}</h2>
                    
                    <div class="info-message">
                        <i class="fas fa-info-circle"></i>
                        <p>Informações detalhadas deste filme serão carregadas em breve.</p>
                    </div>
                    
                    <div class="movie-actions-modal">
                        <button class="watch-btn" onclick="openVideoPlayerFromTitle('${title}')">
                            <i class="fas fa-play"></i>
                            Assistir
                        </button>
                        <button class="favorite-btn" onclick="addToFavorites('${title}')">
                            <i class="far fa-heart"></i>
                            Adicionar aos Favoritos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

// ========== RATING SYSTEM ==========

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

// Enviar avaliação do modal
function submitRatingFromModal(movieId) {
    const stars = document.querySelectorAll('.star');
    let rating = 0;

    stars.forEach(star => {
        if (star.classList.contains('active')) {
            rating = Math.max(rating, parseInt(star.getAttribute('data-rating')));
        }
    });

    if (rating > 0) {
        submitRatingToAPI(movieId, rating);

        // Fechar modal
        const modal = document.getElementById('movieModal');
        if (modal) {
            modal.style.display = 'none';
        }
    } else {
        alert('Por favor, selecione uma avaliação antes de enviar.');
    }
}

// ========== FAVORITES SYSTEM ==========

// Carregar estado do filme em destaque
function loadFeaturedMovieState() {
    const featuredFav = localStorage.getItem('cineia_featured_favorite');
    if (featuredFav !== null) {
        featuredMovie.isFavorite = JSON.parse(featuredFav);
    }
    updateFeaturedFavoriteUI();
}

// Atualizar UI do filme destacado
function updateFeaturedFavoriteUI() {
    const featuredFavoriteBtn = document.querySelector('.favorite-btn[onclick*="featured"]');
    if (featuredFavoriteBtn) {
        featuredFavoriteBtn.classList.toggle('active', featuredMovie.isFavorite);
        const icon = featuredMovie.isFavorite ? 'fas' : 'far';
        featuredFavoriteBtn.innerHTML = `<i class="${icon} fa-heart"></i> ${featuredMovie.isFavorite ? 'Remover dos Favoritos' : 'Favoritar'}`;
    }
}

// Alternar favorito
function toggleFavorite(movieId, event = null) {
    if (event) {
        event.stopPropagation();
    }

    // Caso especial para o filme destacado
    if (movieId === 'featured') {
        featuredMovie.isFavorite = !featuredMovie.isFavorite;
        localStorage.setItem('cineia_featured_favorite', JSON.stringify(featuredMovie.isFavorite));
        updateFeaturedFavoriteUI();
            }

    // Para filmes normais
    const index = favorites.indexOf(movieId);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(movieId);
    }

    localStorage.setItem('cineia_favorites', JSON.stringify(favorites));

    // Recarregar a UI
    const movie = allMovies.find(m => m.id === movieId);
    const action = index > -1 ? 'removido dos' : 'adicionado aos';
    if (movie) {
        alert(`"${movie.title}" ${action} favoritos!`);
    }

    // Atualizar botões na interface
    updateFavoriteButtons(movieId, index === -1);
}

// Adicionar aos favoritos por título
function addToFavorites(title) {
    alert(`"${title}" adicionado aos favoritos!`);
    // Aqui você pode implementar a lógica para salvar favoritos por título
}

// Atualizar botões de favorito na interface
function updateFavoriteButtons(movieId, isFavorite) {
    const buttons = document.querySelectorAll(`.movie-favorite[onclick*="${movieId}"]`);
    buttons.forEach(btn => {
        btn.classList.toggle('active', isFavorite);
        btn.innerHTML = `<i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>`;
    });
}

// ========== VIDEO PLAYER ==========

// Abrir player de vídeo
function openVideoPlayer(movieId) {
    const videoPlayerContainer = document.getElementById('videoPlayerContainer');
    const videoFrame = document.getElementById('videoFrame');

    if (!videoPlayerContainer || !videoFrame) {
        console.error('❌ Elementos do player não encontrados');
        return;
    }

    // URL padrão do trailer
    videoFrame.src = "https://www.youtube.com/embed/dQw4w9WgXcQ";
    videoPlayerContainer.style.display = 'flex';
}

// Abrir player por título
function openVideoPlayerFromTitle(title) {
    openVideoPlayer(0); // Usar função existente
}

// Fechar player de vídeo
function closeVideoPlayer() {
    const videoPlayerContainer = document.getElementById('videoPlayerContainer');
    const videoFrame = document.getElementById('videoFrame');

    if (videoFrame) {
        videoFrame.src = '';
    }
    if (videoPlayerContainer) {
        videoPlayerContainer.style.display = 'none';
    }
}

// ========== SEARCH SYSTEM ==========

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

    // Buscar nos filmes carregados
    const results = allMovies.filter(movie =>
        movie.title.toLowerCase().includes(normalizedQuery)
    ).slice(0, 8);

    displaySearchResults(results, normalizedQuery);
}

// Mostrar resultados da busca
function displaySearchResults(results, query) {
    const searchResults = document.getElementById('searchResults');

    if (results.length === 0) {
        searchResults.innerHTML = '<div class="no-results">Nenhum filme encontrado...</div>';
        searchResults.style.display = 'block';
        return;
    }

    searchResults.innerHTML = results.map(movie => `
        <div class="search-result-item" onclick="selectSearchResult(${movie.id})">
            <img src="${movie.poster_url || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'}" 
                 alt="${movie.title}" class="search-result-poster">
            <div class="search-result-info">
                <div class="search-result-title">${highlightMatch(movie.title, query)}</div>
                <div class="search-result-year">${movie.year}</div>
            </div>
        </div>
    `).join('');

    searchResults.style.display = 'block';
}

// Destacar correspondências na busca
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
    openMovieModalFromAPI(movieId);
}

// ========== UTILITY FUNCTIONS ==========

// Estado de carregamento
function showLoadingState(message = 'Carregando recomendações...') {
    const container = document.getElementById('recommendedGrid');
    if (!container) return;

    console.log('⏳ Mostrando estado de carregamento:', message);

    container.innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin fa-3x"></i>
            <h3>${message}</h3>
            <p>Isso pode levar alguns segundos...</p>
            <div class="loading-progress">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            </div>
        </div>
    `;
}

// Sem recomendações
function renderNoRecommendations() {
    const container = document.getElementById('recommendedGrid');
    if (!container) return;

    console.log('📭 Nenhuma recomendação disponível');

    container.innerHTML = `
        <div class="no-recommendations-message">
            <i class="fas fa-film fa-3x"></i>
            <h3>Nenhuma recomendação disponível</h3>
            <p>Avalie alguns filmes para receber recomendações personalizadas!</p>
            <div class="action-buttons">
                <button class="explore-btn" onclick="window.location.href='/movies'">Explorar Filmes</button>
                <button class="retry-btn" onclick="loadRecommendations()">Tentar Novamente</button>
            </div>
        </div>
    `;
}

// Mensagem de erro
function renderError(message) {
    const container = document.getElementById('recommendedGrid');
    if (!container) return;

    console.error('💥 Renderizando erro:', message);

    container.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle fa-3x"></i>
            <h3>Erro ao carregar recomendações</h3>
            <p>${message}</p>
            <div class="action-buttons">
                <button class="retry-btn" onclick="loadRecommendations()">
                    <i class="fas fa-sync-alt"></i>
                    Tentar Novamente
                </button>
                <button class="fallback-btn" onclick="loadFallbackRecommendations()">
                    <i class="fas fa-film"></i>
                    Ver Catálogo Completo
                </button>
            </div>
        </div>
    `;
}

// Recarregar recomendações
function refreshRecommendations() {
    console.log('🔄 Recarregando recomendações...');
    loadRecommendations();
}

// Abrir filme em destaque
function openFeaturedMovie() {
    console.log('🎬 Abrindo filme em destaque');
    openBasicMovieModal(featuredMovie.title);
}

// ========== DEBUG FUNCTIONS ==========

// Debug: Verificar estado atual
function debugState() {
    console.group('🔍 Debug do Estado');
    console.log('👤 Usuário:', currentUser);
    console.log('🎬 Total de filmes carregados:', allMovies.length);
    console.log('⭐ Favoritos:', favorites);
    console.log('🎯 Filme em destaque:', featuredMovie);
    console.log('⏰ Timeout ativo:', recommendationsTimeout !== null);
    console.log('🔍 Primeiros 3 filmes:', allMovies.slice(0, 3));
    console.groupEnd();
}

// Adicionar botão de debug
function addDebugButton() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const debugBtn = document.createElement('button');
        debugBtn.innerHTML = '🐛 Debug';
        debugBtn.className = 'debug-btn';
        debugBtn.onclick = debugState;
        document.body.appendChild(debugBtn);
    }
}

// ========== EVENT LISTENERS ==========

// Configurar event listeners
function setupEventListeners() {
    // Fechar player de vídeo com ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeVideoPlayer();
        }
    });

    // Fechar player de vídeo clicando fora
    const videoContainer = document.getElementById('videoPlayerContainer');
    if (videoContainer) {
        videoContainer.addEventListener('click', function(event) {
            if (event.target === this) {
                closeVideoPlayer();
            }
        });
    }
}


console.log('🚀 CineIA inicializado com todas as integrações de API');

