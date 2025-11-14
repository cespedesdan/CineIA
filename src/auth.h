#ifndef AUTH_H
#define AUTH_H

#include <string>

class Auth {
public:
    static std::string hashPassword(const std::string& password);
    static bool verifyPassword(const std::string& password, const std::string& hash);
};

#endif
