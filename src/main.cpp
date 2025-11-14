#include <iostream>
#include <iomanip>
#include <limits>
#include <algorithm>
#include <vector>
#include <map>
#include <thread>
#include <mutex>
#include <fstream>
#include <sstream>
#include "database.h"
#include "auth.h"
#include <ctime>
#include <cctype>
#include <regex>
#include <sstream>
#include <curl/curl.h>
#include "movie_api.h"
#include <cstdlib>
#include <locale>
#include "crow_all.h"

#ifdef _WIN32
    #include <windows.h>
    #include <conio.h>
    #define WIN32_LEAN_AND_MEAN
#else
    #include <termios.h>
    #include <unistd.h>
#endif

using namespace std;

using namespace std;

// ===== ESTRUTURAS PARA RECOMENDAÇÕES =====
struct AIReco {
    std::string title;
    std::string reason;
    double match_score;
};


// ===== VARIÁVEIS GLOBAIS COMPARTILHADAS =====
Database* global_db = nullptr;
MovieAPI* global_movie_api = nullptr;
std::mutex db_mutex;


// ===== FUNÇÕES AUXILIARES PARA ARQUIVOS =====
std::string readFile(const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        return "Arquivo não encontrado: " + filename;
    }
    std::stringstream buffer;
    buffer << file.rdbuf();
    return buffer.str();
}

std::string getMimeType(const std::string& filename) {
    std::string extension = filename.substr(filename.find_last_of(".") + 1);
    if (extension == "html") return "text/html";
    if (extension == "css") return "text/css";
    if (extension == "js") return "application/javascript";
    if (extension == "json") return "application/json";
    if (extension == "png") return "image/png";
    if (extension == "jpg" || extension == "jpeg") return "image/jpeg";
    if (extension == "gif") return "image/gif";
    if (extension == "svg") return "image/svg+xml";
    return "text/plain";
}


// ===== FUNÇÕES DO SERVIDOR WEB CROW =====
void setupWebServer(int port = 8081) {
    crow::SimpleApp app;

    // API - Obter quantidade de filmes avaliados pelo usuário
    CROW_ROUTE(app, "/api/user/<int>/ratings/count")
    ([](int user_id) {
        std::lock_guard<std::mutex> lock(db_mutex);

        crow::json::wvalue response;

        // Obter apenas as avaliações do usuário
        std::vector<Rating> user_ratings = global_db->getUserRatings(user_id);
        int ratings_count = user_ratings.size();

        response["success"] = true;
        response["count"] = ratings_count;

        return crow::response{response};
    });



    // API - Avaliar filme (VERSÃO CORRIGIDA)
CROW_ROUTE(app, "/api/rate").methods("POST"_method)
([](const crow::request& req) {
    std::cout << "📝 Recebendo avaliação: " << req.body << std::endl;

    auto json = crow::json::load(req.body);
    if (!json) {
        std::cout << "❌ JSON inválido" << std::endl;
        return crow::response(400, "{\"success\": false, \"error\": \"JSON inválido\"}");
    }

    try {
        int user_id = json["user_id"].i();
        int movie_id = json["movie_id"].i();
        double rating = json["rating"].d();

        std::cout << "🎯 Dados recebidos - User: " << user_id
                  << ", Movie: " << movie_id
                  << ", Rating: " << rating << std::endl;

        // Validar avaliação
        if (rating < 0 || rating > 10) {
            std::cout << "❌ Avaliação inválida: " << rating << std::endl;
            return crow::response(400, "{\"success\": false, \"error\": \"Avaliação deve ser entre 0 e 10\"}");
        }

        std::lock_guard<std::mutex> lock(db_mutex);

        // Verificar se usuário existe
        User* user = global_db->getUserById(user_id);
        if (!user) {
            std::cout << "❌ Usuário não encontrado: " << user_id << std::endl;
            return crow::response(400, "{\"success\": false, \"error\": \"Usuário não encontrado\"}");
        }
        delete user;

        // Verificar se filme existe
        Movie* movie = global_db->getMovieById(movie_id);
        if (!movie) {
            std::cout << "❌ Filme não encontrado: " << movie_id << std::endl;
            return crow::response(400, "{\"success\": false, \"error\": \"Filme não encontrado\"}");
        }
        delete movie;

        std::cout << "💾 Tentando salvar avaliação no banco..." << std::endl;
        bool success = global_db->addRating(user_id, movie_id, rating);

        crow::json::wvalue response;
        response["success"] = success;
        if (success) {
            std::cout << "✅ Avaliação salva com sucesso!" << std::endl;
            response["message"] = "Avaliação registrada com sucesso";
            response["rating_id"] = user_id; // Você pode ajustar para retornar o ID real se necessário
        } else {
            std::cout << "❌ Erro ao salvar avaliação no banco" << std::endl;
            response["error"] = "Erro ao registrar avaliação no banco de dados";
        }

        return crow::response{response};

    } catch (const std::exception& e) {
        std::cout << "💥 Exception na API de avaliação: " << e.what() << std::endl;
        return crow::response(500, "{\"success\": false, \"error\": \"Erro interno do servidor\"}");
    }
});

    // API - Obter 6 filmes recentemente avaliados (Para Perfil)
CROW_ROUTE(app, "/api/user/<int>/recent-ratings")
([](int user_id) {
    std::lock_guard<std::mutex> lock(db_mutex);

    crow::json::wvalue response;

    // Obter avaliações do usuário ordenadas por data (mais recentes primeiro)
    std::vector<Rating> user_ratings = global_db->getUserRatings(user_id);

    // Ordenar por timestamp (assumindo que timestamp é string com data)
    std::sort(user_ratings.begin(), user_ratings.end(),
        [](const Rating& a, const Rating& b) {
            return a.timestamp > b.timestamp; // Mais recentes primeiro
        });

    // Pegar apenas os 6 mais recentes
    std::vector<Rating> recent_ratings;
    for (size_t i = 0; i < std::min(user_ratings.size(), size_t(6)); i++) {
        recent_ratings.push_back(user_ratings[i]);
    }

    if (recent_ratings.empty()) {
        response["success"] = true;
        response["message"] = "Nenhuma avaliação recente encontrada";
        response["recent_ratings"] = crow::json::wvalue::list();
        return crow::response{response};
    }

    std::vector<crow::json::wvalue> recent_list;

    for (const auto& rating : recent_ratings) {
        Movie* movie = global_db->getMovieById(rating.movie_id);
        if (movie) {
            crow::json::wvalue movie_json;
            movie_json["movie_id"] = movie->id;
            movie_json["title"] = movie->title;
            movie_json["year"] = movie->year;
            movie_json["poster_url"] = movie->poster_url;
            movie_json["user_rating"] = rating.rating;
            movie_json["rating_date"] = rating.timestamp;

            recent_list.push_back(movie_json);
            delete movie;
        }
    }

    response["success"] = true;
    response["count"] = recent_list.size();
    response["recent_ratings"] = std::move(recent_list);

    return crow::response{response};
});


    // API - LISTAR FILMES
    CROW_ROUTE(app, "/api/movies")
([]() {
    std::cout << "🎬 /api/movies chamada" << std::endl;

    try {
        std::lock_guard<std::mutex> lock(db_mutex);
        auto movies = global_db->getAllMovies();

        std::cout << "📊 " << movies.size() << " filmes encontrados" << std::endl;

        crow::json::wvalue result;
        result["success"] = true;
        result["count"] = static_cast<int>(movies.size());

        std::vector<crow::json::wvalue> movie_list;
        for (const auto& movie : movies) {
            crow::json::wvalue movie_json;
            movie_json["id"] = movie.id;
            movie_json["title"] = movie.title;
            movie_json["genre"] = movie.genre;
            movie_json["year"] = movie.year;
            movie_json["actors"] = movie.actors;
            movie_json["description"] = movie.description;
            movie_json["poster_url"] = movie.poster_url;
            movie_json["imdb_rating"] = movie.imdb_rating;
            movie_json["rotten_tomatoes_rating"] = movie.rotten_tomatoes_rating;

            movie_list.push_back(movie_json);
        }
        result["movies"] = std::move(movie_list);

        auto response = crow::response{result};
        response.add_header("Content-Type", "application/json");
        response.add_header("Access-Control-Allow-Origin", "*");

        std::cout << "✅ Resposta enviada" << std::endl;
        return response;

    } catch (const std::exception& e) {
        std::cout << "❌ Erro: " << e.what() << std::endl;
        crow::json::wvalue error_result;
        error_result["success"] = false;
        error_result["error"] = "Erro interno";

        auto response = crow::response{error_result};
        response.add_header("Content-Type", "application/json");
        response.add_header("Access-Control-Allow-Origin", "*");
        return response;
    }
});

    // API - Buscar filme por ID
    CROW_ROUTE(app, "/api/movies/<int>")
    ([](int movie_id) {
        std::lock_guard<std::mutex> lock(db_mutex);
        Movie* movie = global_db->getMovieById(movie_id);

        crow::json::wvalue response;
        if (movie) {
            response["success"] = true;
            response["movie"] = {
                {"id", movie->id},
                {"title", movie->title},
                {"genre", movie->genre},
                {"year", movie->year},
                {"actors", movie->actors},
                {"description", movie->description},
                {"poster_url", movie->poster_url},
                {"imdb_rating", movie->imdb_rating},
                {"rotten_tomatoes_rating", movie->rotten_tomatoes_rating},
                {"user_rating", global_db->getMovieAverageRating(movie->id)}
            };
            delete movie;
        } else {
            response["success"] = false;
            response["error"] = "Filme não encontrado";
        }

        return crow::response{response};
    });

    // API - Login
    CROW_ROUTE(app, "/api/login").methods("POST"_method)
    ([](const crow::request& req) {
        auto json = crow::json::load(req.body);
        if (!json) {
            return crow::response(400, "{\"success\": false, \"error\": \"JSON inválido\"}");
        }

        string username = json["username"].s();
        string password = json["password"].s();

        std::lock_guard<std::mutex> lock(db_mutex);
        User* user = global_db->getUserByUsername(username);

        crow::json::wvalue response;
        if (user && Auth::verifyPassword(password, user->password_hash)) {
            response["success"] = true;
            response["user"] = {
                {"id", user->id},
                {"username", user->username},
                {"is_admin", user->is_admin}
            };
            delete user;
        } else {
            response["success"] = false;
            response["error"] = "Credenciais inválidas";
            if (user) delete user;
        }

        return crow::response{response};
    });

    // API - Registrar usuário
    CROW_ROUTE(app, "/api/register").methods("POST"_method)
    ([](const crow::request& req) {
        auto json = crow::json::load(req.body);
        if (!json) {
            return crow::response(400, "{\"success\": false, \"error\": \"JSON inválido\"}");
        }

        string username = json["username"].s();
        string password = json["password"].s();

        std::lock_guard<std::mutex> lock(db_mutex);

        // Verificar se usuário existe
        User* existing = global_db->getUserByUsername(username);
        if (existing) {
            delete existing;
            return crow::response(400, "{\"success\": false, \"error\": \"Usuário já existe\"}");
        }

        // Validar senha
        if (password.length() < 6) {
            return crow::response(400, "{\"success\": false, \"error\": \"Senha deve ter pelo menos 6 caracteres\"}");
        }

        string hash = Auth::hashPassword(password);
        int user_id = global_db->createUser(username, hash, false);

        crow::json::wvalue response;
        if (user_id > 0) {
            response["success"] = true;
            response["message"] = "Usuário criado com sucesso";
            response["user_id"] = user_id;
        } else {
            response["success"] = false;
            response["error"] = "Erro ao criar usuário";
        }

        return crow::response{response};
    });



    // API - Obter recomendações
    CROW_ROUTE(app, "/api/recommendations/<int>")
    ([](int user_id) {
        std::lock_guard<std::mutex> lock(db_mutex);

        crow::json::wvalue response;

        // Obter histórico do usuário
        vector<Rating> ratings = global_db->getUserRatings(user_id);
        vector<Movie> history;
        for (const auto& rating : ratings) {
            Movie* movie = global_db->getMovieById(rating.movie_id);
            if (movie) {
                history.push_back(*movie);
                delete movie;
            }
        }

        if (history.empty()) {
            // Sem histórico - recomendações gerais
            auto movies = global_db->getRecommendations(user_id, 10);
            response["type"] = "general";
            response["message"] = "Recomendações baseadas em popularidade";

            vector<crow::json::wvalue> movie_list;
            for (const auto& movie : movies) {
                crow::json::wvalue movie_json;
                movie_json["id"] = movie.id;
                movie_json["title"] = movie.title;
                movie_json["genre"] = movie.genre;
                movie_json["year"] = movie.year;
                movie_json["imdb_rating"] = movie.imdb_rating;
                movie_json["poster_url"] = movie.poster_url;
                movie_list.push_back(movie_json);
            }
            response["recommendations"] = move(movie_list);
        } else {
            // Com histórico - usar IA
            if (global_movie_api->hasOpenRouterKey()) {
                auto recommendations = global_movie_api->getMovieRecommendations(history, "");
                response["type"] = "ai";
                response["message"] = "Recomendações personalizadas por IA";

                vector<crow::json::wvalue> rec_list;
                for (const auto& rec : recommendations) {
                    crow::json::wvalue rec_json;
                    rec_json["title"] = rec.title;
                    rec_json["reason"] = rec.reason;
                    rec_json["mood"] = rec.mood;

                    // Buscar detalhes do filme recomendado
                    Movie movie_details = global_movie_api->searchMovie(rec.title);
                    if (!movie_details.title.empty() && movie_details.title != "N/A") {
                        rec_json["poster_url"] = movie_details.poster_url;
                        rec_json["year"] = movie_details.year;
                        rec_json["imdb_rating"] = movie_details.imdb_rating;
                    }

                    rec_list.push_back(rec_json);
                }
                response["recommendations"] = move(rec_list);
            } else {
                // Fallback para recomendações do banco
                auto movies = global_db->getRecommendations(user_id, 10);
                response["type"] = "general";
                response["message"] = "Recomendações baseadas em seu histórico";

                vector<crow::json::wvalue> movie_list;
                for (const auto& movie : movies) {
                    crow::json::wvalue movie_json;
                    movie_json["id"] = movie.id;
                    movie_json["title"] = movie.title;
                    movie_json["genre"] = movie.genre;
                    movie_json["year"] = movie.year;
                    movie_json["imdb_rating"] = movie.imdb_rating;
                    movie_json["poster_url"] = movie.poster_url;
                    movie_list.push_back(movie_json);
                }
                response["recommendations"] = move(movie_list);
            }
        }

        response["success"] = true;

        return crow::response{response};
    });

    // API - Buscar filme na OMDB (Admin)
    CROW_ROUTE(app, "/api/search-movie").methods("POST"_method)
    ([](const crow::request& req) {
        auto json = crow::json::load(req.body);
        if (!json) {
            return crow::response(400, "{\"success\": false, \"error\": \"JSON inválido\"}");
        }

        string title = json["title"].s();

        std::lock_guard<std::mutex> lock(db_mutex);
        Movie movie = global_movie_api->searchMovie(title);

        crow::json::wvalue response;
        if (!movie.title.empty() && movie.title != "N/A") {
            response["success"] = true;
            response["movie"] = {
                {"title", movie.title},
                {"genre", movie.genre},
                {"year", movie.year},
                {"actors", movie.actors},
                {"description", movie.description},
                {"poster_url", movie.poster_url},
                {"imdb_rating", movie.imdb_rating},
                {"rotten_tomatoes_rating", movie.rotten_tomatoes_rating}
            };
        } else {
            response["success"] = false;
            response["error"] = "Filme não encontrado";
        }

        return crow::response{response};
    });

    // API - Adicionar filme (Admin)
    CROW_ROUTE(app, "/api/movies").methods("POST"_method)
    ([](const crow::request& req) {
        auto json = crow::json::load(req.body);
        if (!json) {
            return crow::response(400, "{\"success\": false, \"error\": \"JSON inválido\"}");
        }

        Movie movie;
        movie.title = json["title"].s();
        movie.genre = json["genre"].s();
        movie.year = json["year"].i();
        movie.actors = json["actors"].s();
        movie.description = json["description"].s();
        movie.poster_url = json["poster_url"].s();
        movie.imdb_rating = json["imdb_rating"].d();
        movie.rotten_tomatoes_rating = json["rotten_tomatoes_rating"].d();

        std::lock_guard<std::mutex> lock(db_mutex);
        int movie_id = global_db->createMovie(movie);

        crow::json::wvalue response;
        if (movie_id > 0) {
            response["success"] = true;
            response["movie_id"] = movie_id;
            response["message"] = "Filme adicionado com sucesso";
        } else {
            response["success"] = false;
            response["error"] = "Erro ao adicionar filme";
        }

        return crow::response{response};
    });

    // API - Estatísticas (Admin)
    CROW_ROUTE(app, "/api/stats")
    ([]() {
        std::lock_guard<std::mutex> lock(db_mutex);

        auto genre_ratings = global_db->getAverageRatingsByGenre();
        auto all_movies = global_db->getAllMovies();

        crow::json::wvalue response;
        response["success"] = true;
        response["total_movies"] = all_movies.size();

        vector<crow::json::wvalue> genre_list;
        for (const auto& pair : genre_ratings) {
            crow::json::wvalue genre_json;
            genre_json["genre"] = pair.first;
            genre_json["average_rating"] = pair.second;
            genre_list.push_back(genre_json);
        }
        response["genre_ratings"] = move(genre_list);

        return crow::response{response};
    });

    // Servir arquivos estáticos da estrutura nova
    CROW_ROUTE(app, "/")
    ([]() {

        std::string content = readFile("www/inicio/inicio.html");
        if (content.find("Arquivo não encontrado") != std::string::npos) {
            return crow::response(404, "Página inicial não encontrada");
        }
        auto response = crow::response(content);
        response.set_header("Content-Type", "text/html");
        response.add_header("Access-Control-Allow-Origin", "*");
        response.add_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.add_header("Access-Control-Allow-Headers", "Content-Type");
        return response;
    });

    // Servir arquivos estáticos com rota dinâmica
    CROW_ROUTE(app, "/<string>/<string>")
    ([](const string& folder, const string& filename) {
        std::string filepath = "www/" + folder + "/" + filename;
        std::string content = readFile(filepath);

        if (content.find("Arquivo não encontrado") != std::string::npos) {
            return crow::response(404, "Arquivo não encontrado: " + filepath);
        }

        auto response = crow::response(content);
        response.set_header("Content-Type", getMimeType(filename));
        response.add_header("Access-Control-Allow-Origin", "*");
        response.add_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.add_header("Access-Control-Allow-Headers", "Content-Type");
        return response;
    });

    // Rotas específicas para cada página
    CROW_ROUTE(app, "/movies")
    ([]() {
        std::string content = readFile("www/AllMov/mov.html");
        if (content.find("Arquivo não encontrado") != std::string::npos) {
            return crow::response(404, "Página de filmes não encontrada");
        }
        auto response = crow::response(content);
        response.set_header("Content-Type", "text/html");
        response.add_header("Access-Control-Allow-Origin", "*");
        response.add_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.add_header("Access-Control-Allow-Headers", "Content-Type");
        return response;
    });

    CROW_ROUTE(app, "/profile")
    ([]() {
        std::string content = readFile("www/profile/prof.html");
        if (content.find("Arquivo não encontrado") != std::string::npos) {
            return crow::response(404, "Página de perfil não encontrada");
        }
        auto response = crow::response(content);
        response.set_header("Content-Type", "text/html");
        response.add_header("Access-Control-Allow-Origin", "*");
        response.add_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.add_header("Access-Control-Allow-Headers", "Content-Type");
        return response;
    });

    CROW_ROUTE(app, "/register")
    ([]() {
        std::string content = readFile("www/Registro/registro.html");
        if (content.find("Arquivo não encontrado") != std::string::npos) {
            return crow::response(404, "Página de registro não encontrada");
        }
        auto response = crow::response(content);
        response.set_header("Content-Type", "text/html");
        response.add_header("Access-Control-Allow-Origin", "*");
        response.add_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.add_header("Access-Control-Allow-Headers", "Content-Type");
        return response;
    });

    CROW_ROUTE(app, "/privacy")
    ([]() {
        std::string content = readFile("www/privacy/priv.html");
        if (content.find("Arquivo não encontrado") != std::string::npos) {
            return crow::response(404, "Página de privacidade não encontrada");
        }
        auto response = crow::response(content);
        response.set_header("Content-Type", "text/html");
        response.add_header("Access-Control-Allow-Origin", "*");
        response.add_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.add_header("Access-Control-Allow-Headers", "Content-Type");
        return response;
    });

    CROW_ROUTE(app, "/terms")
    ([]() {
        std::string content = readFile("www/TermsServ/terms.html");
        if (content.find("Arquivo não encontrado") != std::string::npos) {
            return crow::response(404, "Página de termos não encontrada");
        }
        auto response = crow::response(content);
        response.set_header("Content-Type", "text/html");
        response.add_header("Access-Control-Allow-Origin", "*");
        response.add_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.add_header("Access-Control-Allow-Headers", "Content-Type");
        return response;
    });


    // API - Obter informações do usuário
    CROW_ROUTE(app, "/api/user/<int>")
    ([](int user_id) {
        std::lock_guard<std::mutex> lock(db_mutex);

        crow::json::wvalue response;

        User* user = global_db->getUserById(user_id);

        if (user) {
            response["success"] = true;
            response["user"] = {
                {"id", user->id},
                {"username", user->username},
                {"is_admin", user->is_admin}
            };
            delete user;
        } else {
            response["success"] = false;
            response["error"] = "Usuário não encontrado";
        }

        return crow::response{response};
    });

    // API - Obter avaliações do usuário (Minhas Avaliações)
CROW_ROUTE(app, "/api/user/<int>/ratings")

([](int user_id) {
    std::lock_guard<std::mutex> lock(db_mutex);

    crow::json::wvalue response;

    // Obter todas as avaliações do usuário
    std::vector<Rating> user_ratings = global_db->getUserRatings(user_id);

    if (user_ratings.empty()) {
        response["success"] = true;
        response["message"] = "Nenhuma avaliação encontrada";
        response["ratings"] = crow::json::wvalue::list();

        return crow::response{response};
    }

    std::vector<crow::json::wvalue> ratings_list;

    for (const auto& rating : user_ratings) {
        // Buscar detalhes do filme
        Movie* movie = global_db->getMovieById(rating.movie_id);
        if (movie) {
            crow::json::wvalue rating_json;
            rating_json["rating_id"] = rating.id;
            rating_json["movie_id"] = movie->id;
            rating_json["title"] = movie->title;
            rating_json["year"] = movie->year;
            rating_json["genre"] = movie->genre;
            rating_json["poster_url"] = movie->poster_url;
            rating_json["imdb_rating"] = movie->imdb_rating;
            rating_json["rotten_tomatoes_rating"] = movie->rotten_tomatoes_rating;
            rating_json["user_rating"] = rating.rating;
            rating_json["rating_date"] = rating.timestamp;
            rating_json["actors"] = movie->actors;
            rating_json["description"] = movie->description;

            ratings_list.push_back(rating_json);
            delete movie;
        }
    }

    response["success"] = true;
    response["count"] = ratings_list.size();
    response["ratings"] = std::move(ratings_list);

    return crow::response{response};
});


    // Rota para verificar saúde da API
    CROW_ROUTE(app, "/api/health")
    ([]() {
        return crow::response(200, "{\"status\": \"online\", \"service\": \"Review Cine IA\"}");
    });

    // Iniciar servidor
    cout << "🚀 Servidor web iniciado em: http://localhost:" << port << endl;
    cout << "📊 API REST disponível em: http://localhost:" << port << "/api/" << endl;
    cout << "🏠 Página inicial: http://localhost:" << port << "/" << endl;
    cout << "🎬 Filmes: http://localhost:" << port << "/movies" << endl;
    app.ssl_file("./ssl/certificate.crt", "./ssl/private.key").bindaddr("0.0.0.0").port(port).multithreaded().run();
}
//.ssl_file("./ssl/certificate.crt", "./ssl/private.key")

// ===== FUNÇÕES UTILITÁRIAS =====
void clearScreen() {
#ifdef _WIN32
    system("cls");
#else
    system("clear");
#endif
}

void pressEnterToContinue() {
    std::cout << "\nPressione ENTER para continuar...";
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
    std::cin.get();
}

std::string getPassword() {
    std::string password;
#ifdef _WIN32
    char ch;
    while ((ch = _getch()) != '\r') {
        if (ch == '\b') {
            if (!password.empty()) {
                password.pop_back();
                std::cout << "\b \b";
            }
        } else {
            password.push_back(ch);
            std::cout << '*';
        }
    }
#else
    termios oldt;
    tcgetattr(STDIN_FILENO, &oldt);
    termios newt = oldt;
    newt.c_lflag &= ~ECHO;
    tcsetattr(STDIN_FILENO, TCSANOW, &newt);

    std::getline(std::cin, password);

    tcsetattr(STDIN_FILENO, TCSANOW, &oldt);
#endif
    std::cout << std::endl;
    return password;
}

void displayHeader(const std::string &title) {
    clearScreen();
    std::cout << "╔══════════════════════════════════════════════════════════════════════╗\n";
    std::cout << "║                        🎬   REVIEW CINI IA ⭐⭐⭐⭐⭐              ║\n";
    std::cout << "╠══════════════════════════════════════════════════════════════════════╣\n";
    std::cout << "║ " << std::left << std::setw(72) << title << "   ║\n";
    std::cout << "╚══════════════════════════════════════════════════════════════════════╝\n\n";
}

void displayMovieDetailed(const Movie &movie, Database &db) {
    std::cout << "\n┌─────────────────────────────────────────────────────────────────────┐\n";
    std::cout << "│ 🎬 " << std::left << std::setw(55) << movie.title << " │\n";
    std::cout << "├─────────────────────────────────────────────────────────────────────┤\n";
    std::cout << "│ 📀 Gênero: " << std::setw(47) << movie.genre << " │\n";
    std::cout << "│ 📅 Ano: " << std::setw(49) << std::to_string(movie.year) << " │\n";
    std::cout << "│ 👥 Atores: " << std::setw(47) << movie.actors << " │\n";

    if (movie.rotten_tomatoes_rating > 0) {
        std::cout << "│ 🍅 Rotten Tomatoes: " << std::setw(38) <<
                     (std::to_string(movie.rotten_tomatoes_rating) + "%") << " │\n";
    }

    std::cout << "│ ⭐ IMDB: " << std::setw(48) << (std::to_string(movie.imdb_rating) + "/10") << " │\n";

    double user_avg = db.getMovieAverageRating(movie.id);
    if (user_avg > 0) {
        std::cout << "│ 💖 Avaliação dos Usuários: " << std::setw(35) <<
                     (std::to_string(user_avg) + "/10") << " │\n";
    }

    std::cout << "├─────────────────────────────────────────────────────────────────────┤\n";

    // Descrição com quebra de linha
    std::string desc = movie.description;
    size_t pos = 0;
    while (pos < desc.length()) {
        std::string line = desc.substr(pos, 55);
        std::cout << "│ 📝 " << std::setw(55) << line << " │\n";
        pos += 55;
        if (pos >= desc.length()) break;
    }

    std::cout << "└─────────────────────────────────────────────────────────────────────┘\n";
}

// ===== FUNÇÃO AUXILIAR PARA HISTÓRICO =====
std::vector<Movie> getWatchHistory(Database &db, int user_id) {
    std::vector<Rating> ratings = db.getUserRatings(user_id);
    std::vector<Movie> history;

    for (const auto& rating : ratings) {
        Movie* movie = db.getMovieById(rating.movie_id);
        if (movie) {
            history.push_back(*movie);
            delete movie;
        }
    }

    return history;
}

// ===== FUNÇÃO AUXILIAR PARA RECOMENDAÇÕES FALLBACK =====
void showFallbackRecommendations(Database &db, int user_id) {
    std::vector<Movie> recommendations = db.getRecommendations(user_id, 8);
    if (!recommendations.empty()) {
        std::cout << "🎬 Recomendações para você:\n\n";
        for (size_t i = 0; i < recommendations.size(); i++) {
            std::cout << "   " << (i + 1) << ". " << recommendations[i].title
                     << " (" << recommendations[i].year << ") - "
                     << recommendations[i].genre
                     << " [⭐ " << recommendations[i].imdb_rating << "/10]\n";
        }
    } else {
        std::cout << "❌ Nenhuma recomendação disponível no momento.\n";
    }
}

// ===== SISTEMA DE AUTENTICAÇÃO =====
User *loginUser(Database &db) {
    displayHeader("🔐 LOGIN DE USUÁRIO");

    std::string username;
    std::cout << "👤 Nome de usuário: ";
    std::cin >> username;

    std::cout << "🔒 Senha: ";
    std::string password = getPassword();

    User *user = db.getUserByUsername(username);

    if (user && Auth::verifyPassword(password, user->password_hash)) {
        std::cout << "\n✅ Login realizado com sucesso!\n";
        if (user->is_admin) {
            std::cout << "👑 Você está logado como ADMINISTRADOR\n";
        }
        pressEnterToContinue();
        return user;
    } else {
        std::cout << "\n❌ Usuário ou senha incorretos!\n";
        pressEnterToContinue();
        delete user;
        return nullptr;
    }
}

User *registerUser(Database &db) {
    displayHeader("📝 CADASTRO DE USUÁRIO");

    std::string username;
    std::cout << "👤 Nome de usuário: ";
    std::cin >> username;

    User *existing = db.getUserByUsername(username);
    if (existing) {
        std::cout << "\n❌ Usuário já existe!\n";
        delete existing;
        pressEnterToContinue();
        return nullptr;
    }

    std::cout << "🔒 Senha: ";
    std::string password = getPassword();

    std::cout << "🔒 Confirme a senha: ";
    std::string confirm_password = getPassword();

    if (password != confirm_password) {
        std::cout << "\n❌ As senhas não coincidem!\n";
        pressEnterToContinue();
        return nullptr;
    }

    if (password.length() < 6) {
        std::cout << "\n❌ A senha deve ter pelo menos 6 caracteres!\n";
        pressEnterToContinue();
        return nullptr;
    }

    std::string hash = Auth::hashPassword(password);
    int user_id = db.createUser(username, hash, false);

    if (user_id > 0) {
        std::cout << "\n✅ Usuário cadastrado com sucesso!\n";
        std::cout << "👉 Faça login para continuar.\n";
        pressEnterToContinue();
    } else {
        std::cout << "\n❌ Erro ao cadastrar usuário!\n";
        pressEnterToContinue();
    }

    return nullptr;
}

// ===== SISTEMA DE RECOMENDAÇÕES COM IA =====
void viewAIRecommendations(Database &db, MovieAPI &movie_api, User *user) {
    displayHeader("🤖 RECOMENDAÇÕES INTELIGENTES");

    // Obter histórico do usuário baseado nas avaliações
    std::vector<Movie> history = getWatchHistory(db, user->id);

    if (history.empty()) {
        std::cout << "📊 Avalie alguns filmes para receber recomendações inteligentes!\n\n";
        showFallbackRecommendations(db, user->id);
    } else {
        // Usar IA para recomendações baseadas no histórico
        std::cout << "📊 Analisando seu histórico de " << history.size() << " filmes...\n\n";

        if (movie_api.hasOpenRouterKey()) {
            auto recommendations = movie_api.getMovieRecommendations(history, "");

            if (!recommendations.empty()) {
                std::cout << "🤖 Recomendações personalizadas da IA:\n\n";
                for (size_t i = 0; i < recommendations.size(); i++) {
                    std::cout << "   " << (i + 1) << ". " << recommendations[i].title << "\n";
                    std::cout << "      💡 " << recommendations[i].reason << "\n";
                    std::cout << "      🎭 " << recommendations[i].mood << "\n\n";
                }

                // Oferecer para buscar detalhes de um filme recomendado
                std::cout << "👉 Digite o número do filme para ver detalhes (0 para voltar): ";
                int choice;
                std::cin >> choice;

                if (choice > 0 && choice <= (int)recommendations.size()) {
                    Movie movie = movie_api.searchMovie(recommendations[choice - 1].title);
                    if (!movie.title.empty() && movie.title != "N/A") {
                        displayMovieDetailed(movie, db);
                    } else {
                        std::cout << "❌ Não foi possível encontrar detalhes para este filme.\n";
                    }
                    pressEnterToContinue();
                }
            } else {
                std::cout << "❌ Não foi possível gerar recomendações no momento.\n\n";
                showFallbackRecommendations(db, user->id);
            }
        } else {
            std::cout << "🔑 API de IA não configurada. Mostrando recomendações locais:\n\n";
            showFallbackRecommendations(db, user->id);
        }
    }

    pressEnterToContinue();
}

// ===== SISTEMA DE AVALIAÇÃO =====
void rateMovie(Database &db, User *user) {
    displayHeader("⭐ AVALIAR FILME");

    std::vector<Movie> movies = db.getAllMovies();

    if (movies.empty()) {
        std::cout << "❌ Nenhum filme disponível para avaliação.\n";
        pressEnterToContinue();
        return;
    }

    std::cout << "🎬 Filmes disponíveis:\n\n";
    for (size_t i = 0; i < movies.size(); i++) {
        double user_rating = -1;
        std::vector<Rating> user_ratings = db.getUserRatings(user->id);
        for (const auto& rating : user_ratings) {
            if (rating.movie_id == movies[i].id) {
                user_rating = rating.rating;
                break;
            }
        }

        std::cout << (i + 1) << ". " << movies[i].title << " (" << movies[i].year << ")";
        if (user_rating > 0) {
            std::cout << " - Sua avaliação: ⭐ " << user_rating << "/10";
        }
        std::cout << "\n";
    }

    int choice;
    std::cout << "\n👉 Escolha o número do filme: ";
    std::cin >> choice;

    if (choice < 1 || choice > (int) movies.size()) {
        std::cout << "❌ Opção inválida!\n";
        pressEnterToContinue();
        return;
    }

    Movie &selected = movies[choice - 1];
    displayMovieDetailed(selected, db);

    double rating;
    std::cout << "\n💭 Digite sua avaliação (0-10): ";
    std::cin >> rating;

    if (rating < 0 || rating > 10) {
        std::cout << "❌ Avaliação inválida! Deve ser entre 0 e 10.\n";
        pressEnterToContinue();
        return;
    }

    if (db.addRating(user->id, selected.id, rating)) {
        std::cout << "\n✅ Avaliação registrada com sucesso!\n";
        std::cout << "🤖 Suas recomendações inteligentes foram atualizadas!\n";
    } else {
        std::cout << "\n❌ Erro ao registrar avaliação!\n";
    }

    pressEnterToContinue();
}

// ===== SISTEMA DE NAVEGAÇÃO =====
void browseMovies(Database &db, User *user) {
    displayHeader("🎥 NAVEGAR FILMES");

    std::vector<Movie> movies = db.getAllMovies();

    if (movies.empty()) {
        std::cout << "❌ Nenhum filme disponível.\n";
        pressEnterToContinue();
        return;
    }

    std::cout << "Todos os filmes:\n\n";
    for (size_t i = 0; i < movies.size(); i++) {
        double user_rating = -1;
        if (user) {
            std::vector<Rating> user_ratings = db.getUserRatings(user->id);
            for (const auto& rating : user_ratings) {
                if (rating.movie_id == movies[i].id) {
                    user_rating = rating.rating;
                    break;
                }
            }
        }

        std::cout << (i + 1) << ". " << movies[i].title
                << " (" << movies[i].year << ") - "
                << movies[i].genre
                << " [⭐ " << movies[i].imdb_rating << "/10]";

        if (user_rating > 0) {
            std::cout << " - Sua nota: ⭐ " << user_rating << "/10";
        }
        std::cout << "\n";
    }

    int choice;
    std::cout << "\n👉 Escolha um filme para ver detalhes (0 para voltar): ";
    std::cin >> choice;

    if (choice > 0 && choice <= (int) movies.size()) {
        displayMovieDetailed(movies[choice - 1], db);

        if (user) {
            char rate;
            std::cout << "\n💭 Deseja avaliar este filme? (s/n): ";
            std::cin >> rate;

            if (rate == 's' || rate == 'S') {
                double rating;
                std::cout << "Digite sua avaliação (0-10): ";
                std::cin >> rating;

                if (rating >= 0 && rating <= 10) {
                    if (db.addRating(user->id, movies[choice - 1].id, rating)) {
                        std::cout << "✅ Avaliação registrada!\n";
                    } else {
                        std::cout << "❌ Erro ao registrar avaliação!\n";
                    }
                } else {
                    std::cout << "❌ Avaliação inválida!\n";
                }
            }
        }

        pressEnterToContinue();
    }
}

// ===== SISTEMA ADMINISTRATIVO =====
void adminAddMovieWithAI(Database &db, MovieAPI &movie_api) {
    displayHeader("🤖 ADICIONAR FILME [ADMIN]");

    std::cout << "1. Buscar filme usando IMDb\n";
    std::cout << "2. Sugerir filme popular com IA\n";
    std::cout << "3. Voltar\n";
    std::cout << "\n👉 Escolha uma opção: ";

    int choice;
    std::cin >> choice;

    if (choice == 1) {
        std::string title;
        std::cin.ignore();
        std::cout << "🎬 Digite o título do filme para buscar: ";
        std::getline(std::cin, title);

        std::cout << "\n🔍 Buscando filme...\n";

        if (!movie_api.hasOMDBKey()) {
            std::cout << "❌ Chave da API OMDB não configurada!\n";
            std::cout << "Configure a variável de ambiente OMDB_API_KEY\n";
            pressEnterToContinue();
            return;
        }

        Movie movie = movie_api.searchMovie(title);

        if (movie.title.empty() || movie.title == "N/A") {
            std::cout << "❌ Filme não encontrado!\n";
            std::cout << "Verifique o título e tente novamente.\n";
        } else {
            displayMovieDetailed(movie, db);

            char confirm;
            std::cout << "\n💭 Deseja adicionar este filme ao sistema? (s/n): ";
            std::cin >> confirm;

            if (confirm == 's' || confirm == 'S') {
                int id = db.createMovie(movie);
                if (id > 0) {
                    std::cout << "\n✅ Filme adicionado com sucesso! ID: " << id << "\n";
                } else {
                    std::cout << "\n❌ Erro ao adicionar filme!\n";
                }
            }
        }
    }
    else if (choice == 2) {
        // Buscar filme popular não cadastrado
        std::cout << "\n🔍 Buscando filme popular não cadastrado...\n";

        if (!movie_api.hasOpenRouterKey()) {
            std::cout << "❌ Chave da API OpenRouter não configurada!\n";
            std::cout << "Configure a variável de ambiente OPENROUTER_API_KEY\n";
            pressEnterToContinue();
            return;
        }

        // Gerar recomendações baseadas em gêneros populares
        std::vector<std::string> popularGenres = {"Action", "Drama", "Comedy", "Sci-Fi"};
        auto recommendations = movie_api.getPersonalizedRecommendations(popularGenres, "curioso");

        if (!recommendations.empty()) {
            std::cout << "\n🎬 Filmes sugeridos pela IA:\n\n";
            for (size_t i = 0; i < recommendations.size() && i < 3; i++) {
                std::cout << "   " << (i + 1) << ". " << recommendations[i].title << "\n";
                std::cout << "      💡 " << recommendations[i].reason << "\n";
                std::cout << "      🎭 Combina com: " << recommendations[i].mood << "\n\n";
            }

            std::cout << "👉 Digite o número do filme para buscar detalhes (0 para cancelar): ";
            int movieChoice;
            std::cin >> movieChoice;

            if (movieChoice > 0 && movieChoice <= (int)recommendations.size()) {
                // Buscar detalhes do filme selecionado
                Movie movie = movie_api.searchMovie(recommendations[movieChoice - 1].title);

                if (!movie.title.empty() && movie.title != "N/A") {
                    displayMovieDetailed(movie, db);

                    char confirm;
                    std::cout << "\n💭 Deseja adicionar este filme ao sistema? (s/n): ";
                    std::cin >> confirm;

                    if (confirm == 's' || confirm == 'S') {
                        int id = db.createMovie(movie);
                        if (id > 0) {
                            std::cout << "\n✅ Filme adicionado com sucesso! ID: " << id << "\n";
                        } else {
                            std::cout << "\n❌ Erro ao adicionar filme!\n";
                        }
                    }
                } else {
                    std::cout << "❌ Não foi possível encontrar detalhes para este filme.\n";
                }
            }
        } else {
            std::cout << "❌ Não foi possível gerar recomendações no momento.\n";
        }
    }

    pressEnterToContinue();
}

void adminViewStats(Database &db) {
    displayHeader("📊 ESTATÍSTICAS [ADMIN]");

    std::map<std::string, double> genre_ratings = db.getAverageRatingsByGenre();

    std::cout << "📈 Média de avaliações por gênero:\n\n";
    if (genre_ratings.empty()) {
        std::cout << "   Nenhuma avaliação registrada ainda.\n";
    } else {
        for (const auto &pair: genre_ratings) {
            std::cout << "   🎭 " << std::left << std::setw(20) << pair.first
                     << " : ⭐ " << std::fixed << std::setprecision(2) << pair.second << "/10\n";
        }
    }

    std::vector<Movie> all_movies = db.getAllMovies();
    std::cout << "\n📚 Total de filmes cadastrados: " << all_movies.size() << "\n";

    pressEnterToContinue();
}

void adminMenu(Database &db, MovieAPI &movie_api, User*) {
    while (true) {
        displayHeader("👑 PAINEL ADMINISTRATIVO");

        std::cout << "1. 🎞️ Adicionar filme\n";
        std::cout << "2. 📊 Estatísticas\n";
        std::cout << "3. ↩️  Voltar ao menu principal\n";
        std::cout << "\n👉 Escolha uma opção: ";

        int choice;
        std::cin >> choice;

        switch (choice) {
            case 1:
                adminAddMovieWithAI(db, movie_api);
                break;
            case 2:
                adminViewStats(db);
                break;
            case 3:
                return;
            default:
                std::cout << "❌ Opção inválida!\n";
                pressEnterToContinue();
        }
    }
}

// ===== MENU PRINCIPAL DO USUÁRIO =====
void userMenu(Database &db, MovieAPI &movie_api, User *user) {
    while (true) {
        displayHeader("🎬 MENU PRINCIPAL - Bem-vindo, " + user->username);

        std::cout << "1. 🤖 Ver recomendações inteligentes\n";
        std::cout << "2. 🎥 Navegar todos os filmes\n";
        std::cout << "3. ⭐ Avaliar um filme\n";
        if (user->is_admin) {
            std::cout << "4. 👑 Painel Administrativo\n";
        }
        std::cout << "0. 🚪 Sair\n";
        std::cout << "\n👉 Escolha uma opção: ";

        int choice;
        std::cin >> choice;

        switch (choice) {
            case 1:
                viewAIRecommendations(db, movie_api, user);
                break;
            case 2:
                browseMovies(db, user);
                break;
            case 3:
                rateMovie(db, user);
                break;
            case 4:
                if (user->is_admin) {
                    adminMenu(db, movie_api, user);
                } else {
                    std::cout << "❌ Opção inválida!\n";
                    pressEnterToContinue();
                }
                break;
            case 0:
                return;
            default:
                std::cout << "❌ Opção inválida!\n";
                pressEnterToContinue();
        }
    }
}



// ===== FUNÇÃO MAIN =====
int main() {
#ifdef _WIN32
    SetConsoleOutputCP(CP_UTF8);
    SetConsoleCP(CP_UTF8);
#endif

    std::setlocale(LC_ALL, "pt_BR.UTF-8");

    // Inicializar banco de dados
    Database db("netflix.db");
    if (!db.init()) {
        std::cerr << "❌ Erro ao inicializar banco de dados!\n";
        return 1;
    }

    // Inicializar API unificada
    std::string omdb_key = std::getenv("OMDB_API_KEY") ? std::getenv("OMDB_API_KEY") : "";
    std::string openrouter_key = std::getenv("OPENROUTER_API_KEY") ? std::getenv("OPENROUTER_API_KEY") : "";

    MovieAPI movie_api(omdb_key, openrouter_key);

    // Configurar variáveis globais para o servidor web
    global_db = &db;
    global_movie_api = &movie_api;

    // Verificar se a estrutura de pastas existe
    std::vector<std::string> required_folders = {
        "www/inicio", "www/AllMov", "www/profile",
        "www/Registro", "www/privacy", "www/TermsServ"
    };



    // Iniciar servidor web em thread separada
    int web_port = 8081;
    std::thread web_thread([web_port]() {
        try {
            setupWebServer(web_port);
        } catch (const std::exception& e) {
            std::cerr << "❌ Erro no servidor web: " << e.what() << std::endl;
        }
    });

    // Configurar thread para rodar em segundo plano
    web_thread.detach();

    // Aguardar um pouco para o servidor inicializar
    std::this_thread::sleep_for(std::chrono::seconds(2));

    // Verificar configurações das APIs
    std::cout << "🔧 Verificando configurações das APIs...\n";
    if (!movie_api.hasOMDBKey()) {
        std::cout << "⚠️  Aviso: Chave OMDB não configurada. Configure OMDB_API_KEY\n";
    } else {
        std::cout << "✅ API OMDB configurada\n";
    }

    if (!movie_api.hasOpenRouterKey()) {
        std::cout << "⚠️  Aviso: Chave OpenRouter não configurada. Configure OPENROUTER_API_KEY\n";
    } else {
        std::cout << "✅ API OpenRouter configurada\n";
    }

    std::cout << "\n🌐 Servidor Web: http://localhost:" << web_port << std::endl;
    std::cout << "💻 Interface Console: Disponível abaixo\n\n";

    pressEnterToContinue();

    // Criar usuário admin padrão
    User *admin = db.getUserByUsername("admin");
    if (!admin) {
        std::string admin_hash = Auth::hashPassword("admin123");
        if (db.createUser("admin", admin_hash, true) > 0) {
            std::cout << "✅ Usuário administrador criado!\n";
            std::cout << "   👤 Usuário: admin\n";
            std::cout << "   🔒 Senha: admin123\n\n";
            pressEnterToContinue();
        }
    } else {
        delete admin;
    }

    // Loop principal do console (mantém sua interface original)
    while (true) {
        displayHeader("🏠 BEM-VINDO AO REVIEW CINE IA");

        std::cout << "1. 🔐 Login (Console)\n";
        std::cout << "2. 📝 Cadastrar novo usuário (Console)\n";
        std::cout << "3. 🌐 Acessar Interface Web\n";
        std::cout << "0. 🚪 Sair\n";
        std::cout << "\n👉 Escolha uma opção: ";

        int choice;
        std::cin >> choice;

        User *current_user = nullptr;

        switch (choice) {
            case 1:
                current_user = loginUser(db);
                if (current_user) {
                    userMenu(db, movie_api, current_user);
                    delete current_user;
                }
                break;
            case 2:
                registerUser(db);
                break;
            case 3:
                std::cout << "\n🌐 Abrindo navegador para interface web...\n";
#ifdef _WIN32

                system(("start http://localhost:" + std::to_string(web_port)).c_str());
#elif __APPLE__
                system(("open http://localhost:" + std::to_string(web_port)).c_str());
#else
                system(("xdg-open http://localhost:" + std::to_string(web_port)).c_str());
#endif
                std::cout << "✅ Interface web disponível em: http://localhost:" << web_port << "\n";
                pressEnterToContinue();
                break;
            case 0:
                std::cout << "\n🎉 Obrigado por usar o Review Cine IA!\n";
                return 0;
            default:
                std::cout << "❌ Opção inválida!\n";
                pressEnterToContinue();
        }
    }

    return 0;
}