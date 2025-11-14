#include "auth.h"
#include <sstream>
#include <iomanip>
#include <cstring>

std::string Auth::hashPassword(const std::string& password) {
    unsigned long hash = 5381;
    for (char c : password) {
        hash = ((hash << 5) + hash) + c;
    }
    
    std::stringstream ss;
    ss << std::hex << hash;
    return ss.str();
}

bool Auth::verifyPassword(const std::string& password, const std::string& hash) {
    return hashPassword(password) == hash;
}
