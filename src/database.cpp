#include "database.h"
#include <iostream>
#include <sstream>
#include <cstring>

Database::Database(const std::string& path) : db(nullptr), db_path(path) {}

Database::~Database() {
    if (db) {
        sqlite3_close(db);
    }
}

bool Database::init() {
    if (sqlite3_open(db_path.c_str(), &db) != SQLITE_OK) {
        std::cerr << "Erro ao abrir banco de dados: " << sqlite3_errmsg(db) << std::endl;
        return false;
    }
    
    const char* create_tables = R"(
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS movies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            imdb_id TEXT,
            genre TEXT NOT NULL,
            description TEXT,
            actors TEXT,
            poster_url TEXT,
            imdb_rating REAL DEFAULT 0,
            rotten_tomatoes_rating REAL DEFAULT 0,
            year INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            movie_id INTEGER NOT NULL,
            rating REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(movie_id) REFERENCES movies(id),
            UNIQUE(user_id, movie_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_genre ON movies(genre);
        CREATE INDEX IF NOT EXISTS idx_user_ratings ON ratings(user_id);
    )";
    
    return execute(create_tables);
}

bool Database::execute(const std::string& sql) {
    char* err_msg = nullptr;
    if (sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &err_msg) != SQLITE_OK) {
        std::cerr << "Erro SQL: " << err_msg << std::endl;
        sqlite3_free(err_msg);
        return false;
    }
    return true;
}

int Database::createUser(const std::string& username, const std::string& password_hash, bool is_admin) {
    sqlite3_stmt* stmt;
    const char* sql = "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)";
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return -1;
    }
    
    sqlite3_bind_text(stmt, 1, username.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, password_hash.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 3, is_admin ? 1 : 0);
    
    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        return -1;
    }
    
    int id = sqlite3_last_insert_rowid(db);
    sqlite3_finalize(stmt);
    return id;
}

User* Database::getUserByUsername(const std::string& username) {
    sqlite3_stmt* stmt;
    const char* sql = "SELECT id, username, password_hash, is_admin FROM users WHERE username = ?";
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return nullptr;
    }
    
    sqlite3_bind_text(stmt, 1, username.c_str(), -1, SQLITE_TRANSIENT);
    
    User* user = nullptr;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        user = new User();
        user->id = sqlite3_column_int(stmt, 0);
        user->username = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        user->password_hash = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        user->is_admin = sqlite3_column_int(stmt, 3) == 1;
    }
    
    sqlite3_finalize(stmt);
    return user;
}

User* Database::getUserById(int id) {
    sqlite3_stmt* stmt;
    const char* sql = "SELECT id, username, password_hash, is_admin FROM users WHERE id = ?";
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return nullptr;
    }
    
    sqlite3_bind_int(stmt, 1, id);
    
    User* user = nullptr;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        user = new User();
        user->id = sqlite3_column_int(stmt, 0);
        user->username = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        user->password_hash = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        user->is_admin = sqlite3_column_int(stmt, 3) == 1;
    }
    
    sqlite3_finalize(stmt);
    return user;
}

int Database::createMovie(const Movie& movie) {
    sqlite3_stmt* stmt;
    const char* sql = "INSERT INTO movies (title, imdb_id, genre, description, actors, poster_url, imdb_rating, rotten_tomatoes_rating, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return -1;
    }
    
    sqlite3_bind_text(stmt, 1, movie.title.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, movie.imdb_id.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, movie.genre.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, movie.description.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, movie.actors.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, movie.poster_url.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_double(stmt, 7, movie.imdb_rating);
    sqlite3_bind_double(stmt, 8, movie.rotten_tomatoes_rating);
    sqlite3_bind_int(stmt, 9, movie.year);
    
    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        return -1;
    }
    
    int id = sqlite3_last_insert_rowid(db);
    sqlite3_finalize(stmt);
    return id;
}

Movie* Database::getMovieById(int id) {
    sqlite3_stmt* stmt;
    const char* sql = "SELECT id, title, imdb_id, genre, description, actors, poster_url, imdb_rating, rotten_tomatoes_rating, year FROM movies WHERE id = ?";
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return nullptr;
    }
    
    sqlite3_bind_int(stmt, 1, id);
    
    Movie* movie = nullptr;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        movie = new Movie();
        movie->id = sqlite3_column_int(stmt, 0);
        movie->title = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        movie->imdb_id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        movie->genre = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
        movie->description = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
        movie->actors = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
        movie->poster_url = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
        movie->imdb_rating = sqlite3_column_double(stmt, 7);
        movie->rotten_tomatoes_rating = sqlite3_column_double(stmt, 8);
        movie->year = sqlite3_column_int(stmt, 9);
    }
    
    sqlite3_finalize(stmt);
    return movie;
}

std::vector<Movie> Database::getAllMovies() {
    std::vector<Movie> movies;
    sqlite3_stmt* stmt;
    const char* sql = "SELECT id, title, imdb_id, genre, description, actors, poster_url, imdb_rating, rotten_tomatoes_rating, year FROM movies";
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return movies;
    }
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        Movie movie;
        movie.id = sqlite3_column_int(stmt, 0);
        movie.title = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        movie.imdb_id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        movie.genre = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
        movie.description = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
        movie.actors = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
        movie.poster_url = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
        movie.imdb_rating = sqlite3_column_double(stmt, 7);
        movie.rotten_tomatoes_rating = sqlite3_column_double(stmt, 8);
        movie.year = sqlite3_column_int(stmt, 9);
        movies.push_back(movie);
    }
    
    sqlite3_finalize(stmt);
    return movies;
}

std::vector<Movie> Database::getMoviesByGenre(const std::string& genre) {
    std::vector<Movie> movies;
    sqlite3_stmt* stmt;
    const char* sql = "SELECT id, title, imdb_id, genre, description, actors, poster_url, imdb_rating, rotten_tomatoes_rating, year FROM movies WHERE genre = ?";
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return movies;
    }
    
    sqlite3_bind_text(stmt, 1, genre.c_str(), -1, SQLITE_TRANSIENT);
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        Movie movie;
        movie.id = sqlite3_column_int(stmt, 0);
        movie.title = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        movie.imdb_id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        movie.genre = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
        movie.description = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
        movie.actors = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
        movie.poster_url = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
        movie.imdb_rating = sqlite3_column_double(stmt, 7);
        movie.rotten_tomatoes_rating = sqlite3_column_double(stmt, 8);
        movie.year = sqlite3_column_int(stmt, 9);
        movies.push_back(movie);
    }
    
    sqlite3_finalize(stmt);
    return movies;
}

bool Database::updateMovie(const Movie& movie) {
    sqlite3_stmt* stmt;
    const char* sql = "UPDATE movies SET title=?, imdb_id=?, genre=?, description=?, actors=?, poster_url=?, imdb_rating=?, rotten_tomatoes_rating=?, year=? WHERE id=?";
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }
    
    sqlite3_bind_text(stmt, 1, movie.title.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, movie.imdb_id.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, movie.genre.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, movie.description.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, movie.actors.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, movie.poster_url.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_double(stmt, 7, movie.imdb_rating);
    sqlite3_bind_double(stmt, 8, movie.rotten_tomatoes_rating);
    sqlite3_bind_int(stmt, 9, movie.year);
    sqlite3_bind_int(stmt, 10, movie.id);
    
    bool success = sqlite3_step(stmt) == SQLITE_DONE;
    sqlite3_finalize(stmt);
    return success;
}

bool Database::deleteMovie(int id) {
    sqlite3_stmt* stmt;
    const char* sql = "DELETE FROM movies WHERE id = ?";
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }
    
    sqlite3_bind_int(stmt, 1, id);
    bool success = sqlite3_step(stmt) == SQLITE_DONE;
    sqlite3_finalize(stmt);
    return success;
}

bool Database::addRating(int user_id, int movie_id, double rating) {
    sqlite3_stmt* stmt;
    const char* sql = "INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, ?)";
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }
    
    sqlite3_bind_int(stmt, 1, user_id);
    sqlite3_bind_int(stmt, 2, movie_id);
    sqlite3_bind_double(stmt, 3, rating);
    
    bool success = sqlite3_step(stmt) == SQLITE_DONE;
    sqlite3_finalize(stmt);
    return success;
}

std::vector<Rating> Database::getUserRatings(int user_id) {
    std::vector<Rating> ratings;
    sqlite3_stmt* stmt;
    const char* sql = "SELECT id, user_id, movie_id, rating, timestamp FROM ratings WHERE user_id = ?";
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return ratings;
    }
    
    sqlite3_bind_int(stmt, 1, user_id);
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        Rating rating;
        rating.id = sqlite3_column_int(stmt, 0);
        rating.user_id = sqlite3_column_int(stmt, 1);
        rating.movie_id = sqlite3_column_int(stmt, 2);
        rating.rating = sqlite3_column_double(stmt, 3);
        rating.timestamp = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
        ratings.push_back(rating);
    }
    
    sqlite3_finalize(stmt);
    return ratings;
}

double Database::getMovieAverageRating(int movie_id) {
    sqlite3_stmt* stmt;
    const char* sql = "SELECT AVG(rating) FROM ratings WHERE movie_id = ?";
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return 0.0;
    }
    
    sqlite3_bind_int(stmt, 1, movie_id);
    
    double avg = 0.0;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        avg = sqlite3_column_double(stmt, 0);
    }
    
    sqlite3_finalize(stmt);
    return avg;
}

std::map<std::string, double> Database::getAverageRatingsByGenre() {
    std::map<std::string, double> genre_ratings;
    sqlite3_stmt* stmt;
    const char* sql = R"(
        SELECT m.genre, AVG(r.rating) as avg_rating
        FROM movies m
        JOIN ratings r ON m.id = r.movie_id
        GROUP BY m.genre
    )";
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return genre_ratings;
    }
    
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        std::string genre = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
        double avg_rating = sqlite3_column_double(stmt, 1);
        genre_ratings[genre] = avg_rating;
    }
    
    sqlite3_finalize(stmt);
    return genre_ratings;
}

std::string Database::getMostWatchedGenre(int user_id) {
    sqlite3_stmt* stmt;
    const char* sql = R"(
        SELECT m.genre, COUNT(*) as watch_count
        FROM ratings r
        JOIN movies m ON r.movie_id = m.id
        WHERE r.user_id = ?
        GROUP BY m.genre
        ORDER BY watch_count DESC
        LIMIT 1
    )";
    
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return "";
    }
    
    sqlite3_bind_int(stmt, 1, user_id);
    
    std::string genre;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        genre = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
    }
    
    sqlite3_finalize(stmt);
    return genre;
}

std::vector<Movie> Database::getRecommendations(int user_id, int limit) {
    std::vector<Movie> recommendations;
    std::string favorite_genre = getMostWatchedGenre(user_id);
    
    if (favorite_genre.empty()) {
        sqlite3_stmt* stmt;
        const char* sql = "SELECT id, title, imdb_id, genre, description, actors, poster_url, imdb_rating, rotten_tomatoes_rating, year FROM movies ORDER BY imdb_rating DESC LIMIT ?";
        
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
            return recommendations;
        }
        
        sqlite3_bind_int(stmt, 1, limit);
        
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            Movie movie;
            movie.id = sqlite3_column_int(stmt, 0);
            movie.title = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
            movie.imdb_id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
            movie.genre = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
            movie.description = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
            movie.actors = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
            movie.poster_url = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
            movie.imdb_rating = sqlite3_column_double(stmt, 7);
            movie.rotten_tomatoes_rating = sqlite3_column_double(stmt, 8);
            movie.year = sqlite3_column_int(stmt, 9);
            recommendations.push_back(movie);
        }
        
        sqlite3_finalize(stmt);
    } else {
        sqlite3_stmt* stmt;
        const char* sql = R"(
            SELECT m.id, m.title, m.imdb_id, m.genre, m.description, m.actors, m.poster_url, m.imdb_rating, m.rotten_tomatoes_rating, m.year
            FROM movies m
            WHERE m.genre = ? AND m.id NOT IN (SELECT movie_id FROM ratings WHERE user_id = ?)
            ORDER BY m.imdb_rating DESC
            LIMIT ?
        )";
        
        if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
            return recommendations;
        }
        
        sqlite3_bind_text(stmt, 1, favorite_genre.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, 2, user_id);
        sqlite3_bind_int(stmt, 3, limit);
        
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            Movie movie;
            movie.id = sqlite3_column_int(stmt, 0);
            movie.title = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
            movie.imdb_id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
            movie.genre = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
            movie.description = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
            movie.actors = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
            movie.poster_url = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6));
            movie.imdb_rating = sqlite3_column_double(stmt, 7);
            movie.rotten_tomatoes_rating = sqlite3_column_double(stmt, 8);
            movie.year = sqlite3_column_int(stmt, 9);
            recommendations.push_back(movie);
        }
        
        sqlite3_finalize(stmt);
    }
    
    return recommendations;
}
