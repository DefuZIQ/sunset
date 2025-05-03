-- Создание таблицы users, если она не существует
CREATE TABLE IF NOT EXISTS users (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     username VARCHAR(255) UNIQUE NOT NULL,
                                     email VARCHAR(255) UNIQUE NOT NULL,
                                     password VARCHAR(255) NOT NULL
);

-- Создание таблицы roles, если она не существует
CREATE TABLE IF NOT EXISTS roles (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     name VARCHAR(50) UNIQUE NOT NULL
);

-- Создание таблицы user_roles, если она не существует
CREATE TABLE IF NOT EXISTS user_roles (
                                          user_id UUID REFERENCES users(id),
                                          role_id UUID REFERENCES roles(id),
                                          PRIMARY KEY (user_id, role_id)
);
