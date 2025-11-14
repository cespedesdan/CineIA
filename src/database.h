#ifndef DATABASE_H
#define DATABASE_H

#include <sqlite3.h>
#include <string>
#include <vector>
#include <map>

struct User {
    int id;
    std::string username;
    std::string password_hash;
    bool is_admin;
};

struct Movie {
    int id;
    int year;
    std::string title;
    std::string imdb_id;
    std::string genre;
    std::string description;
    std::string actors;
    std::string poster_url;
    double imdb_rating;
    double rotten_tomatoes_rating;
};

struct Rating {
    int id;
    int user_id;
    int movie_id;
    double rating;
    std::string timestamp;
};

class Database {
private:
    sqlite3* db;
    std::string db_path;
    
public:
    Database(const std::string& path);
    ~Database();
    
    bool init();
    bool execute(const std::string& sql);
    
    int createUser(const std::string& username, const std::string& password_hash, bool is_admin = false);
    User* getUserByUsername(const std::string& username);
    User* getUserById(int id);
    
    int createMovie(const Movie& movie);
    Movie* getMovieById(int id);
    std::vector<Movie> getAllMovies();
    std::vector<Movie> getMoviesByGenre(const std::string& genre);
    bool updateMovie(const Movie& movie);
    bool deleteMovie(int id);
    
    bool addRating(int user_id, int movie_id, double rating);
    std::vector<Rating> getUserRatings(int user_id);
    double getMovieAverageRating(int movie_id);
    std::map<std::string, double> getAverageRatingsByGenre();
    
    std::string getMostWatchedGenre(int user_id);
    std::vector<Movie> getRecommendations(int user_id, int limit = 10);
};

#endif
