#include "movie_api.h"
#include <curl/curl.h>
#include <iostream>
#include <sstream>
#include <algorithm>
#include <regex>
#include <json/json.h>
#include <map>
#include <set>

// Inicializar CURL globalmente
namespace {
    struct CurlGlobal {
        CurlGlobal() { curl_global_init(CURL_GLOBAL_DEFAULT); }
        ~CurlGlobal() { curl_global_cleanup(); }
    };
    static CurlGlobal curl_global;
}

MovieAPI::MovieAPI(const std::string& omdb_key, const std::string& openrouter_key)
    : omdb_api_key(omdb_key),
      openrouter_api_key(openrouter_key),
      base_omdb_url("http://www.omdbapi.com/"),
      base_openrouter_url("https://openrouter.ai/api/v1/chat/completions"),
      rng(std::random_device{}()) {}

size_t MovieAPI::WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    size_t totalSize = size * nmemb;
    userp->append((char*)contents, totalSize);
    return totalSize;
}

std::string MovieAPI::makeRequest(const std::string& url, const std::vector<std::string>& headers) {
    CURL* curl;
    CURLcode res;
    std::string response;

    curl = curl_easy_init();
    if(curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_setopt(curl, CURLOPT_USERAGENT, "MiniNetflix/2.0");
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 15L);
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);

        struct curl_slist* header_list = nullptr;
        for (const auto& header : headers) {
            header_list = curl_slist_append(header_list, header.c_str());
        }
        if (header_list) {
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, header_list);
        }

        res = curl_easy_perform(curl);

        if(res != CURLE_OK) {
            std::cerr << "❌ Erro na requisição: " << curl_easy_strerror(res) << std::endl;
        }

        if (header_list) {
            curl_slist_free_all(header_list);
        }
        curl_easy_cleanup(curl);
    }

    return response;
}

std::string MovieAPI::makePostRequest(const std::string& url, const std::string& postData, const std::vector<std::string>& headers) {
    CURL* curl;
    CURLcode res;
    std::string response;

    curl = curl_easy_init();
    if(curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_setopt(curl, CURLOPT_USERAGENT, "MiniNetflix/2.0");
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);

        struct curl_slist* header_list = nullptr;
        header_list = curl_slist_append(header_list, "Content-Type: application/json");
        for (const auto& header : headers) {
            header_list = curl_slist_append(header_list, header.c_str());
        }
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, header_list);

        res = curl_easy_perform(curl);

        if(res != CURLE_OK) {
            std::cerr << "❌ Erro na requisição POST: " << curl_easy_strerror(res) << std::endl;
        }

        curl_slist_free_all(header_list);
        curl_easy_cleanup(curl);
    }

    return response;
}

std::string MovieAPI::urlEncode(const std::string& value) {
    CURL* curl = curl_easy_init();
    if(curl) {
        char* output = curl_easy_escape(curl, value.c_str(), value.length());
        if(output) {
            std::string result(output);
            curl_free(output);
            curl_easy_cleanup(curl);
            return result;
        }
        curl_easy_cleanup(curl);
    }
    std::string encoded = value;
    std::replace(encoded.begin(), encoded.end(), ' ', '+');
    return encoded;
}

std::string MovieAPI::extractJsonValue(const std::string& json, const std::string& key) {
    std::string search_key = "\"" + key + "\":\"";
    size_t pos = json.find(search_key);

    if (pos == std::string::npos) {
        search_key = "\"" + key + "\":";
        pos = json.find(search_key);
        if (pos == std::string::npos) {
            return "N/A";
        }
        pos += search_key.length();
        size_t end_pos = json.find_first_of(",}", pos);
        if (end_pos == std::string::npos) return "N/A";
        std::string value = json.substr(pos, end_pos - pos);
        if (value.length() >= 2 && value.front() == '"' && value.back() == '"') {
            value = value.substr(1, value.length() - 2);
        }
        return value;
    }

    pos += search_key.length();
    size_t end_pos = json.find("\"", pos);

    if (end_pos == std::string::npos) {
        return "N/A";
    }

    return json.substr(pos, end_pos - pos);
}

double MovieAPI::extractRating(const std::string& json, const std::string& source) {
    std::string pattern = "\"Source\":\"" + source + "\",\"Value\":\"(.*?)\"";
    std::regex re(pattern);
    std::smatch match;

    if (std::regex_search(json, match, re) && match.size() > 1) {
        std::string value = match[1].str();
        if (value.find("%") != std::string::npos) {
            value = value.substr(0, value.find("%"));
        }
        try {
            return std::stod(value);
        } catch (...) {
            return 0.0;
        }
    }
    return 0.0;
}

Movie MovieAPI::searchMovie(const std::string& title) {
    Movie movie;
    movie.id = 0;

    if (!hasOMDBKey()) {
        std::cout << "❌ Chave da API OMDB não configurada!\n";
        return createMockMovie(title);
    }

    std::string encoded_title = urlEncode(title);
    std::string url = base_omdb_url + "?apikey=" + omdb_api_key + "&t=" + encoded_title + "&plot=full";
    std::string response = makeRequest(url);

    if (response.empty() || response.find("\"Response\":\"False\"") != std::string::npos) {
        std::cout << "❌ Filme não encontrado: " << title << std::endl;
        return createMockMovie(title);
    }

    movie.title = extractJsonValue(response, "Title");
    if (movie.title == "N/A") movie.title = title;

    movie.imdb_id = extractJsonValue(response, "imdbID");

    std::string year_str = extractJsonValue(response, "Year");
    if (year_str != "N/A" && !year_str.empty()) {
        movie.year = std::stoi(year_str.substr(0, 4));
    } else {
        movie.year = 0;
    }

    movie.genre = extractJsonValue(response, "Genre");
    movie.actors = extractJsonValue(response, "Actors");
    movie.description = extractJsonValue(response, "Plot");
    movie.poster_url = extractJsonValue(response, "Poster");

    std::string imdbRating = extractJsonValue(response, "imdbRating");
    if (imdbRating != "N/A") {
        movie.imdb_rating = std::stod(imdbRating);
    } else {
        movie.imdb_rating = 0.0;
    }

    movie.rotten_tomatoes_rating = extractRating(response, "Rotten Tomatoes");

    std::cout << "✅ Filme encontrado: " << movie.title << " (" << movie.year << ")\n";
    return movie;
}

std::string MovieAPI::cleanJsonContent(const std::string& content) {
    std::string cleaned = content;

    if (cleaned.size() >= 3 &&
        static_cast<unsigned char>(cleaned[0]) == 0xEF &&
        static_cast<unsigned char>(cleaned[1]) == 0xBB &&
        static_cast<unsigned char>(cleaned[2]) == 0xBF) {
        cleaned = cleaned.substr(3);
    }

    size_t jsonStart = cleaned.find("```json");
    if (jsonStart != std::string::npos) {
        cleaned = cleaned.substr(jsonStart + 7);
    } else {
        jsonStart = cleaned.find("```");
        if (jsonStart != std::string::npos) {
            cleaned = cleaned.substr(jsonStart + 3);
        }
    }

    size_t jsonEnd = cleaned.find("```");
    if (jsonEnd != std::string::npos) {
        cleaned = cleaned.substr(0, jsonEnd);
    }

    size_t firstBrace = cleaned.find('{');
    if (firstBrace != std::string::npos && firstBrace > 0) {
        cleaned = cleaned.substr(firstBrace);
    }

    cleaned.erase(0, cleaned.find_first_not_of(" \t\n\r"));
    cleaned.erase(cleaned.find_last_not_of(" \t\n\r") + 1);

    return cleaned;
}

std::vector<Recommendation> MovieAPI::parseRecommendationsFromContent(const std::string& content) {
    std::vector<Recommendation> recommendations;

    if (content.empty()) {
        std::cerr << "❌ Conteúdo vazio para parsear\n";
        return recommendations;
    }

    std::string cleanedContent = cleanJsonContent(content);

    if (cleanedContent.empty()) {
        std::cerr << "❌ Conteúdo vazio após limpeza\n";
        return recommendations;
    }

    std::cout << "🔧 Tentando parsear JSON limpo: " << cleanedContent.substr(0, 100) << "..." << std::endl;

    Json::Value recRoot;
    Json::CharReaderBuilder reader;
    std::stringstream contentStream(cleanedContent);
    std::string errors;

    reader["strictRoot"] = false;
    reader["allowComments"] = true;
    reader["allowTrailingCommas"] = true;

    if (!Json::parseFromStream(reader, contentStream, &recRoot, &errors)) {
        std::cerr << "❌ Erro ao parsear conteúdo JSON: " << errors << std::endl;
        return recommendations;
    }

    if (recRoot.isMember("recommendations") && recRoot["recommendations"].isArray()) {
        Json::Value recs = recRoot["recommendations"];
        for (const auto& rec : recs) {
            if (rec.isMember("title") && rec.isMember("reason") && rec.isMember("mood")) {
                Recommendation recommendation;
                recommendation.title = rec["title"].asString();
                recommendation.reason = rec["reason"].asString();
                recommendation.mood = rec["mood"].asString();
                recommendations.push_back(recommendation);

                std::cout << "✅ Recomendação extraída: " << recommendation.title << std::endl;
            } else {
                std::cerr << "⚠️ Recomendação com campos faltantes\n";
            }
        }
    } else {
        std::cerr << "❌ Campo 'recommendations' não encontrado\n";
    }

    return recommendations;
}

// ANÁLISE DE PREFERÊNCIAS DO USUÁRIO
std::vector<std::string> MovieAPI::analyzeUserPreferences(const std::vector<Movie>& userHistory) {
    std::map<std::string, int> genreCount;
    std::map<std::string, int> decadeCount;

    for (const auto& movie : userHistory) {
        // Contar gêneros
        std::stringstream genreStream(movie.genre);
        std::string genre;
        while (std::getline(genreStream, genre, ',')) {
            genre.erase(0, genre.find_first_not_of(" "));
            genre.erase(genre.find_last_not_of(" ") + 1);
            genreCount[genre]++;
        }

        // Contar décadas
        if (movie.year > 0) {
            int decade = (movie.year / 10) * 10;
            decadeCount[std::to_string(decade) + "s"]++;
        }
    }

    std::vector<std::string> insights;

    // Adicionar gêneros preferidos
    if (!genreCount.empty()) {
        auto maxGenre = std::max_element(genreCount.begin(), genreCount.end(),
            [](const auto& a, const auto& b) { return a.second < b.second; });
        insights.push_back("Gênero preferido: " + maxGenre->first);
    }

    // Adicionar década preferida
    if (!decadeCount.empty()) {
        auto maxDecade = std::max_element(decadeCount.begin(), decadeCount.end(),
            [](const auto& a, const auto& b) { return a.second < b.second; });
        insights.push_back("Década preferida: " + maxDecade->first);
    }

    return insights;
}

// VARIANTES DE HUMOR PARA DIVERSIDADE
std::string MovieAPI::getRandomMoodVariant(const std::string& baseMood) {
    static std::map<std::string, std::vector<std::string>> moodVariants = {
        {"feliz", {"alegre", "animado", "eufórico", "contente", "radiante"}},
        {"triste", {"melancólico", "nostálgico", "reflexivo", "emocional", "sensível"}},
        {"animado", {"energético", "vibrante", "dinâmico", "eletrizante", "estimulante"}},
        {"relaxado", {"calmo", "sereno", "tranquilo", "pacífico", "descontraído"}},
        {"curioso", {"investigativo", "explorador", "questionador", "descobridor", "inquisitivo"}},
        {"aventureiro", {"corajoso", "ousado", "intrépido", "audacioso", "explorador"}}
    };

    auto it = moodVariants.find(baseMood);
    if (it != moodVariants.end() && !it->second.empty()) {
        std::uniform_int_distribution<int> dist(0, it->second.size() - 1);
        return it->second[dist(rng)];
    }

    return baseMood;
}

// PROMPT COMPLETAMENTE REFORMULADO
std::string MovieAPI::buildRecommendationPrompt(const std::vector<Movie>& userHistory, const std::string& currentMood) {
    std::stringstream prompt;

    prompt << "Você é um especialista em cinema com conhecimento profundo sobre filmes de diversas épocas, países e estilos. ";
    prompt << "Sua tarefa é recomendar 3 filmes que sejam verdadeiramente diversificados e interessantes.\n\n";

    // Análise do histórico do usuário
    if (!userHistory.empty()) {
        prompt << "HISTÓRICO DO USUÁRIO (" << userHistory.size() << " filmes):\n";
        for (const auto& movie : userHistory) {
            prompt << "- " << movie.title << " (" << movie.year << ") - " << movie.genre;
            if (movie.imdb_rating > 0) {
                prompt << " - ⭐ " << movie.imdb_rating << "/10";
            }
            prompt << "\n";
        }

        auto insights = analyzeUserPreferences(userHistory);
        if (!insights.empty()) {
            prompt << "\nPADRÕES IDENTIFICADOS:\n";
            for (const auto& insight : insights) {
                prompt << "• " << insight << "\n";
            }
        }
        prompt << "\n";
    }

    // Humor atual com variação
    std::string moodVariant = getRandomMoodVariant(currentMood);
    prompt << "HUMOR SOLICITADO: " << currentMood;
    if (moodVariant != currentMood) {
        prompt << " (variante: " << moodVariant << ")";
    }
    prompt << "\n\n";

    // DIRETRIZES ESPECÍFICAS PARA DIVERSIDADE
    prompt << "DIRETRIZES CRÍTICAS PARA DIVERSIDADE:\n";
    prompt << "1. EVITE sempre os mesmos filmes óbvios (Inception, Shawshank Redemption, Pulp Fiction, The Dark Knight, Forrest Gump)\n";
    prompt << "2. Inclua pelo menos UM filme de fora dos EUA ou em língua não-inglesa\n";
    prompt << "3. Varíe as décadas: um filme recente (últimos 10 anos), um clássico (antes de 2000), e um intermediário\n";
    prompt << "4. Escolha gêneros diferentes para cada recomendação\n";
    prompt << "5. Priorize filmes menos conhecidos mas acessíveis quando possível\n";
    prompt << "6. Considere diferentes estilos de direção e produção\n\n";

    // EXEMPLOS DIVERSOS PARA INSPIRAR
    prompt << "EXEMPLOS DE FILMES DIVERSOS PARA REFERÊNCIA (NÃO RECOMENDE ESTES):\n";
    prompt << "- Parasita (Coreia do Sul, 2019) - Thriller social\n";
    prompt << "- Amélie (França, 2001) - Romance fantástico\n";
    prompt << "- A Viagem de Chihiro (Japão, 2001) - Animação\n";
    prompt << "- Cidade de Deus (Brasil, 2002) - Drama urbano\n";
    prompt << "- O Labirinto do Fauno (México/Espanha, 2006) - Fantasia sombria\n";
    prompt << "- Mad Max: Estrada da Fúria (Austrália, 2015) - Ação pós-apocalíptica\n\n";

    prompt << "FORMATO DE RESPOSTA EXIGIDO (APENAS JSON):\n";
    prompt << "{\n";
    prompt << "  \"recommendations\": [\n";
    prompt << "    {\n";
    prompt << "      \"title\": \"Nome Original em Inglês\",\n";
    prompt << "      \"reason\": \"Explicação detalhada em português sobre por que este filme é perfeito\",\n";
    prompt << "      \"mood\": \"" << moodVariant << "\",\n";
    prompt << "      \"country\": \"País de origem\",\n";
    prompt << "      \"year\": ano,\n";
    prompt << "      \"genre\": \"Gênero principal\"\n";
    prompt << "    }\n";
    prompt << "  ]\n";
    prompt << "}\n\n";

    prompt << "IMPORTANTE: Seja criativo, diversificado e evite repetir filmes que você já recomendou anteriormente!";

    return prompt.str();
}

std::vector<Recommendation> MovieAPI::getMovieRecommendations(const std::vector<Movie>& userHistory, const std::string& currentMood) {
    if (!hasOpenRouterKey()) {
        std::cout << "❌ Chave da API OpenRouter não configurada! Usando recomendações locais.\n";
        return getFallbackRecommendations();
    }

    std::string prompt = buildRecommendationPrompt(userHistory, currentMood);

    Json::Value requestBody;
    requestBody["model"] = "meta-llama/llama-3.3-70b-instruct:free"; // Modelo mais potente
    requestBody["temperature"] = 0.8; // Temperatura mais alta para mais criatividade
    requestBody["max_tokens"] = 1500;

    Json::Value messages(Json::arrayValue);
    Json::Value message;
    message["role"] = "user";
    message["content"] = prompt;
    messages.append(message);
    requestBody["messages"] = messages;

    Json::StreamWriterBuilder writer;
    std::string requestBodyStr = Json::writeString(writer, requestBody);

    std::vector<std::string> headers = {
        "Authorization: Bearer " + openrouter_api_key,
        "Content-Type: application/json",
        "HTTP-Referer: https://mininetflix.com",
        "X-Title: MiniNetflix"
    };

    std::cout << "🚀 Fazendo requisição para OpenRouter com prompt melhorado..." << std::endl;
    std::string response = makePostRequest(base_openrouter_url, requestBodyStr, headers);

    if (response.empty()) {
        std::cerr << "❌ Resposta vazia da API OpenRouter\n";
        return getFallbackRecommendations();
    }

    std::cout << "📥 Resposta bruta recebida: " << response.substr(0, 200) << "..." << std::endl;

    std::string cleanResponse = cleanJsonContent(response);
    std::stringstream responseStream(cleanResponse);

    Json::Value root;
    Json::CharReaderBuilder reader;
    std::string errors;

    reader["strictRoot"] = false;
    reader["allowComments"] = true;

    if (!Json::parseFromStream(reader, responseStream, &root, &errors)) {
        std::cerr << "❌ Erro ao parsear resposta JSON da API: " << errors << std::endl;
        return getFallbackRecommendations();
    }

    if (!root.isMember("choices") || !root["choices"].isArray() || root["choices"].empty()) {
        std::cerr << "❌ Estrutura de resposta inválida\n";
        return getFallbackRecommendations();
    }

    Json::Value firstChoice = root["choices"][0];
    if (!firstChoice.isMember("message") || !firstChoice["message"].isMember("content")) {
        std::cerr << "❌ Estrutura de resposta inválida\n";
        return getFallbackRecommendations();
    }

    std::string content = firstChoice["message"]["content"].asString();
    std::cout << "📋 Conteúdo extraído: " << content.substr(0, 100) << "..." << std::endl;

    std::vector<Recommendation> recommendations = parseRecommendationsFromContent(content);

    if (recommendations.empty()) {
        std::cerr << "❌ Nenhuma recomendação extraída, usando fallback\n";
        return getFallbackRecommendations();
    }

    std::cout << "✅ " << recommendations.size() << " recomendações diversificadas extraídas com sucesso!\n";
    return recommendations;
}

// FALLBACK MUITO MAIS DIVERSSO
std::vector<Recommendation> MovieAPI::getFallbackRecommendations() {
    std::cout << "🔄 Usando recomendações de fallback diversificadas\n";

    // Lista expandida de fallbacks
    std::vector<Recommendation> fallbacks = {
        {"Parasite", "Thriller social coreano que explora desigualdade de forma brilhante", "reflexivo"},
        {"Spirited Away", "Animação japonesa mágica sobre crescimento e coragem", "curioso"},
        {"The Grand Budapest Hotel", "Comédia dramática estilizada com humor único", "alegre"},
        {"Pan's Labyrinth", "Fantasia sombria espanhola que mistura realidade e magia", "aventureiro"},
        {"Amélie", "Romance francês encantador sobre encontrar beleza nas pequenas coisas", "feliz"},
        {"City of God", "Drama brasileiro intenso sobre vida nas favelas do Rio", "intenso"},
        {"Eternal Sunshine of the Spotless Mind", "Sci-fi romântico sobre memória e relacionamentos", "emocional"},
        {"Mad Max: Fury Road", "Ação pós-apocalíptica australiana com sequências visuais incríveis", "energético"}
    };

    // Embaralhar e pegar 3 aleatórios
    std::shuffle(fallbacks.begin(), fallbacks.end(), rng);
    return std::vector<Recommendation>(fallbacks.begin(), fallbacks.begin() + 3);
}

std::vector<Recommendation> MovieAPI::getPersonalizedRecommendations(const std::vector<std::string>& favoriteGenres, const std::string& mood) {
    std::vector<Movie> mockHistory;
    for (const auto& genre : favoriteGenres) {
        Movie mockMovie;
        mockMovie.genre = genre;
        mockMovie.title = "Filme de " + genre;
        mockHistory.push_back(mockMovie);
    }
    return getMovieRecommendations(mockHistory, mood);
}

Movie MovieAPI::createMockMovie(const std::string& title) {
    Movie movie;
    movie.id = 0;
    movie.title = title;
    movie.year = 2000 + (std::rand() % 24);
    movie.imdb_rating = 6.0 + (std::rand() % 40) / 10.0;
    movie.rotten_tomatoes_rating = 50.0 + (std::rand() % 50);
    movie.poster_url = "https://via.placeholder.com/300x450?text=" + title;

    static std::vector<std::string> genres = {"Action", "Comedy", "Drama", "Science Fiction", "Horror", "Romance", "Thriller"};
    static std::vector<std::string> actors = {"Main Actor", "Supporting Actress", "Villain", "Comic Relief", "Love Interest"};

    std::uniform_int_distribution<int> genreDist(0, genres.size() - 1);
    std::uniform_int_distribution<int> actorDist(0, actors.size() - 1);

    movie.genre = genres[genreDist(rng)];
    movie.actors = actors[actorDist(rng)] + ", " + actors[(actorDist(rng) + 1) % actors.size()];
    movie.description = "A compelling story about " + title + " that explores deep themes and features memorable characters.";

    std::cout << "⚠️  Usando dados de demonstração para: " << movie.title << "\n";
    return movie;
}

bool MovieAPI::hasOMDBKey() const {
    return !omdb_api_key.empty() && omdb_api_key != "xxxx";
}

bool MovieAPI::hasOpenRouterKey() const {
    return !openrouter_api_key.empty() && openrouter_api_key != "xxxx";
}