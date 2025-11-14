# Compilador
CXX = g++
# Flags de compilação
CXXFLAGS = -std=c++17 -Wall -Wextra -Isrc -g -D_WIN32_WINNT=0x0600 -DCROW_ENABLE_SSL
# Flags de linkagem
LDFLAGS = -lcurl -ljsoncpp -lsqlite3 -lssl -lcrypto -lz -lws2_32 -lmswsock -lbcrypt

# Diretórios e arquivos
SRCDIR = src
SOURCES = $(SRCDIR)/main.cpp $(SRCDIR)/database.cpp $(SRCDIR)/auth.cpp $(SRCDIR)/movie_api.cpp
OBJECTS = $(SOURCES:.cpp=.o)
TARGET = cine_ia.exe

# Target principal
all: $(TARGET)

$(TARGET): $(OBJECTS)
	$(CXX) -g $(OBJECTS) -o $(TARGET) $(LDFLAGS)

$(SRCDIR)/%.o: $(SRCDIR)/%.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

# Limpeza para PowerShell
clean:
	rm -f $(SRCDIR)/*.o
	rm -f $(TARGET)
	rm -f netflix.db

# Executar
run: $(TARGET)
	./$(TARGET)

.PHONY: all clean run