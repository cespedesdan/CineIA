// Dados dos filmes
const moviesData = [
    {
        id: 1, title: "Gostinho de Amor", year: 2024,
        poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
        backdrop: "https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
        actors: ["Ator A", "Atriz B", "Ator C"], rating: { imdb: 7.8, rotten: 85, user: 4 },
        synopsis: "Uma comédia romântica sobre encontros inesperados e segundas chances.", category: "recommended", isFavorite: true,
        trailer: "https://www.youtube.com/watch?v=1LfVeg0FxpY&list=RD1LfVeg0FxpY&start_radio=1"
    },
    {
        id: 2, title: "Nove Opções", year: 2024,
        poster: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
        backdrop: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        actors: ["Arturo 1", "Atriz D", "Ator E"], rating: { imdb: 8.1, rotten: 78, user: 8 },
        synopsis: "Um thriller psicológico sobre escolhas e consequências.", category: "recommended", isFavorite: false,
        trailer: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1"
    },
    {
        id: 3, title: "Horizonte Perdido", year: 2024,
        poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
        backdrop: "https://images.unsplash.com/photo-1534447677768-be436bb09401?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        actors: ["Atriz F", "Ator G", "Ator H"], rating: { imdb: 7.5, rotten: 82, user: 7 },
        synopsis: "Aventura em mundos desconhecidos além da imaginação.", category: "recommended", isFavorite: true,
        trailer: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1"
    },
    {
        id: 4, title: "Ecos do Amanhã", year: 2023,
        poster: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
        backdrop: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        actors: ["Ator I", "Atriz J", "Ator K"], rating: { imdb: 8.3, rotten: 91, user: 0 },
        synopsis: "Ficção científica sobre viagens no tempo e paradoxos.", category: "recommended", isFavorite: false,
        trailer: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1"
    },
    {
        id: 5, title: "Silêncio na Montanha", year: 2024,
        poster: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
        backdrop: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        actors: ["Atriz L", "Ator M", "Ator N"], rating: { imdb: 7.9, rotten: 87, user: 0 },
        synopsis: "Drama familiar nas montanhas isoladas do interior.", category: "recommended", isFavorite: true,
        trailer: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1"
    },
    {
        id: 6, title: "Conexão Paris", year: 2023,
        poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
        backdrop: "https://images.unsplash.com/photo-1485846234645-a62644f84728?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        actors: ["Ator O", "Atriz P", "Ator Q"], rating: { imdb: 8.0, rotten: 83, user: 0 },
        synopsis: "Romance em Paris com reviravoltas inesperadas.", category: "recommended", isFavorite: false,
        trailer: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1"
    }
];

// Dados do filme em destaque
const featuredMovie = {
    id: 'featured',
    title: 'Duna: Parte Dois',
    year: 2024,
    isFavorite: false
};

// Estado global
let favorites = JSON.parse(localStorage.getItem('cineia_favorites')) || [];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 CineIA - Página de avaliações carregada');
    loadFeaturedMovieState();
    loadGrid();
    setupModal();
    setupEventListeners();
    setupSearch();
});

// Carregar estado do filme destacado
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
        featuredFavoriteBtn.innerHTML = `<i class="${icon} fa-heart"></i> Favoritar`;
    }
}

// Carregar grid
function loadGrid() {
    const ratedMovies = moviesData.filter(m => m.rating.user > 0);
    renderGrid('recommendedGrid', ratedMovies);
}

// Renderizar grid
function renderGrid(containerId, movies) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="openMovieModal(${movie.id})">
            <img src="${movie.poster}" alt="${movie.title}" class="movie-poster">
            <div class="movie-info">
                <h4 class="movie-title">${movie.title}</h4>
                <span class="movie-year">${movie.year}</span>
                <div class="movie-actions">
                    <button class="movie-watch" onclick="event.stopPropagation(); openVideoPlayer(${movie.id})">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="movie-favorite ${movie.isFavorite ? 'active' : ''}" 
                            onclick="toggleFavorite(${movie.id}, event)">
                        <i class="${movie.isFavorite ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
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
        return;
    }
    
    // Para filmes normais
    const movie = moviesData.find(m => m.id === movieId);
    if (movie) {
        movie.isFavorite = !movie.isFavorite;
        
        // Atualizar no localStorage
        if (movie.isFavorite) {
            if (!favorites.includes(movieId)) {
                favorites.push(movieId);
            }
        } else {
            const index = favorites.indexOf(movieId);
            if (index > -1) {
                favorites.splice(index, 1);
            }
        }
        localStorage.setItem('cineia_favorites', JSON.stringify(favorites));
        
        // Atualizar interface visual
        updateFavoriteUI(movieId, movie.isFavorite);
        loadGrid();
    }
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

// Modal functions
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

function openMovieModal(movieId) {
    const movie = moviesData.find(m => m.id === movieId);
    if (!movie) return;
    
    const modal = document.getElementById('movieModal');
    const detailsContainer = document.getElementById('movieDetails');
    
    // Determinar o texto do botão baseado na avaliação atual
    const ratingButtonText = movie.rating.user === 0 ? 'Avaliar Filme' : 'Atualizar Avaliação';
    const ratingSectionTitle = movie.rating.user === 0 ? 'Avaliar Filme' : 'Alterar Avaliação';
    
    detailsContainer.innerHTML = `
        <div class="movie-detail-hero" style="background-image: url('${movie.backdrop}')">
            <div class="movie-detail-content">
                <div class="movie-detail-poster">
                    <img src="${movie.poster}" alt="${movie.title}">
                </div>
                <div class="movie-detail-info">
                    <h2>${movie.title} (${movie.year})</h2>
                    
                    <div class="movie-actions-modal">
                        <button class="watch-btn" onclick="openVideoPlayer(${movie.id})">
                            <i class="fas fa-play"></i>
                            Assistir
                        </button>
                        <button class="favorite-btn ${movie.isFavorite ? 'active' : ''}" onclick="toggleFavorite(${movie.id}, event)">
                            <i class="${movie.isFavorite ? 'fas' : 'far'} fa-heart"></i>
                            ${movie.isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
                        </button>
                    </div>
                    
                    <div class="ratings-container">
                        <div class="rating-item">
                            <span class="rating-label">IMDb</span>
                            <span class="rating-value">${movie.rating.imdb}/10</span>
                        </div>
                        <div class="rating-item">
                            <span class="rating-label">Rotten Tomatoes</span>
                            <span class="rating-value">${movie.rating.rotten}%</span>
                        </div>
                        <div class="rating-item">
                            <span class="rating-label">Sua Avaliação</span>
                            <span class="rating-value" id="userRatingDisplay">${
                                movie.rating.user === 0 ? 'Não avaliado' : movie.rating.user + '/10'
                            }</span>
                        </div>
                    </div>
                    
                    <div class="actors-section">
                        <h4>Elenco Principal</h4>
                        <p>${movie.actors.join(', ')}</p>
                    </div>
                    
                    <div class="synopsis-section">
                        <h4>Sinopse</h4>
                        <p>${movie.synopsis}</p>
                    </div>
                    
                    <div class="user-rating-section">
                        <h4>${ratingSectionTitle}</h4>
                        <div class="star-rating" id="starRating">
                            ${Array.from({length: 10}, (_, i) => `
                                <span class="star ${i < movie.rating.user ? 'active' : ''}" data-rating="${i + 1}">★</span>
                            `).join('')}
                        </div>
                        <button class="submit-rating" onclick="submitRating(${movie.id})">${ratingButtonText}</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
    setupStarRating(movie.rating.user);
}
    
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

function submitRating(movieId) {
    const stars = document.querySelectorAll('.star');
    let rating = 0;
    
    stars.forEach(star => {
        if (star.classList.contains('active')) {
            rating = Math.max(rating, parseInt(star.getAttribute('data-rating')));
        }
    });
    
    if (rating > 0) {
        const movie = moviesData.find(m => m.id === movieId);
        if (movie) {
            const wasRated = movie.rating.user > 0; // Verifica se já tinha avaliação
            movie.rating.user = rating;
            
            // Atualizar o display da avaliação
            document.getElementById('userRatingDisplay').textContent = `${rating}/10`;
            
            // Mostrar mensagem diferente baseado se é primeira avaliação ou atualização
            if (wasRated) {
                alert(`Avaliação atualizada! Você deu ${rating} estrelas para "${movie.title}"!`);
            } else {
                alert(`Obrigado pela avaliação! Você deu ${rating} estrelas para "${movie.title}"!`);
            }
            
            // Atualizar o texto do botão se necessário
            const submitButton = document.querySelector('.submit-rating');
            if (submitButton) {
                submitButton.textContent = 'Atualizar Avaliação';
            }
            
            // Atualizar o título da seção se necessário
            const ratingSection = document.querySelector('.user-rating-section h4');
            if (ratingSection && !wasRated) {
                ratingSection.textContent = 'Alterar Avaliação';
            }
        }
    } else {
        alert('Por favor, selecione uma avaliação antes de enviar.');
    }
}


// Funções do player de vídeo
function openVideoPlayer(movieId) {
    const videoPlayerContainer = document.getElementById('videoPlayerContainer');
    const videoFrame = document.getElementById('videoFrame');
    
    const movie = moviesData.find(m => m.id === movieId);
    
    // Limpar src anterior para evitar conflitos
    videoFrame.src = '';
    
    // Pequeno delay para garantir que o iframe seja recarregado
    setTimeout(() => {
        if (movie && movie.trailer) {
            videoFrame.src = movie.trailer + '?enablejsapi=1&origin=' + window.location.origin;
        } else {
            // URL alternativa mais confiável
            videoFrame.src = "https://www.youtube.com/watch?v=1LfVeg0FxpY&list=RD1LfVeg0FxpY&start_radio=1" + window.location.origin;
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

// Funções de busca
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
    
    const results = moviesData.filter(movie => 
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
            <img src="${movie.poster}" alt="${movie.title}" class="search-result-poster">
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

// Event listeners
function setupEventListeners() {
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeVideoPlayer();
        }
    });
    
    document.getElementById('videoPlayerContainer').addEventListener('click', function(event) {
        if (event.target === this) {
            closeVideoPlayer();
        }
    });
}

// Função para o filme em destaque
function openFeaturedMovie() {
    // Você pode implementar esta função se quiser
    console.log('Abrir detalhes do filme em destaque');
}

// Carregar grid
function loadGrid() {
    // Mostrar todos os filmes recomendados, mesmo os não avaliados
    const recommendedMovies = moviesData; // Remove o filtro para mostrar todos
    renderGrid('recommendedGrid', recommendedMovies);
}