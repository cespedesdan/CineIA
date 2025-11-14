cmake_minimum_required(VERSION 3.15)
project(ReviewCineIA)

set(CMAKE_CXX_STANDARD 17)

find_package(Threads REQUIRED)

add_executable(review_cine_ia
    src/main.cpp
    src/database.cpp
    src/auth.cpp
    src/movie_api.cpp
)

target_link_libraries(review_cine_ia
    Threads::Threads
    sqlite3
    curl
)