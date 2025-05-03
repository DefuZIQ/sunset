CREATE TABLE IF NOT EXISTS products (
                                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                        name VARCHAR(255) NOT NULL,
                                        description TEXT,
                                        price DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
                                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                          name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS product_categories (
                                                  product_id UUID REFERENCES products(id),
                                                  category_id UUID REFERENCES categories(id),
                                                  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE IF NOT EXISTS images (
                                      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                      url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_images (
                                              product_id UUID REFERENCES products(id),
                                              image_id UUID REFERENCES images(id),
                                              PRIMARY KEY (product_id, image_id)
);