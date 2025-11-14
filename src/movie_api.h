#ifndef MOVIE_API_H
#define MOVIE_API_H

#include <string>
#include <vector>
#include <random>
#include "database.h"

struct Recommendation {
    std::string title;
    std::string reason;
    std::string mood;
};

class MovieAPI {
private:
    std::string omdb_api_key;
    std::string openrouter_api_key;
    std::string base_omdb_url;
    std::string base_openrouter_url;

    // Sistema de aleatoriedade para diversificação
    std::mt19937 rng;

    // Callbacks e requisições
    static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp);
    std::string makeRequest(const std::string& url, const std::vector<std::string>& headers = {});
    std::string makePostRequest(const std::string& url, const std::string& postData, const std::vector<std::string>& headers = {});

    // Utilitários
    std::string extractJsonValue(const std::string& json, const std::string& key);
    double extractRating(const std::string& json, const std::string& source);
    Movie createMockMovie(const std::string& title);
    std::string urlEncode(const std::string& value);
    std::string cleanJsonContent(const std::string& content);

    // Sistema de recomendações diversificado
    std::vector<Recommendation> getFallbackRecommendations();
    std::string buildRecommendationPrompt(const std::vector<Movie>& userHistory, const std::string& currentMood);

    // Novas funções para diversificação
    std::vector<std::string> analyzeUserPreferences(const std::vector<Movie>& userHistory);
    std::string getRandomMoodVariant(const std::string& baseMood);

public:
    MovieAPI(const std::string& omdb_key, const std::string& openrouter_key = "");

    // Funcionalidades principais
    Movie searchMovie(const std::string& title);
    std::vector<Recommendation> getMovieRecommendations(const std::vector<Movie>& userHistory, const std::string& currentMood = "");
    std::vector<Recommendation> getPersonalizedRecommendations(const std::vector<std::string>& favoriteGenres, const std::string& mood = "");
    std::vector<Recommendation> parseRecommendationsFromContent(const std::string& content);

    // Verificações de API
    bool hasOMDBKey() const;
    bool hasOpenRouterKey() const;
};

#endif