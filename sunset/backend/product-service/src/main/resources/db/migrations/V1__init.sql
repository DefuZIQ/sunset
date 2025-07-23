-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM for image types (different angles)
DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'image_type_enum') THEN
            CREATE TYPE image_type_enum AS ENUM (
                'front', 'back', 'side_left', 'side_right', 'top', 'detail'
                );
        END IF;
    END;
$$ LANGUAGE plpgsql;


-- Images
CREATE TABLE IF NOT EXISTS images (
                                      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                      url TEXT NOT NULL,
                                      created_at TIMESTAMPTZ DEFAULT NOW(),
                                      updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
                                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                        name VARCHAR(255) NOT NULL,
                                        description TEXT,
                                        price DECIMAL(10, 2) NOT NULL,
                                        created_at TIMESTAMPTZ DEFAULT NOW(),
                                        updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories (tree structure)
CREATE TABLE IF NOT EXISTS categories (
                                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                          name VARCHAR(255) NOT NULL UNIQUE,
                                          parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
                                          created_at TIMESTAMPTZ DEFAULT NOW(),
                                          updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product ↔ Categories
CREATE TABLE IF NOT EXISTS product_categories (
                                                  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
                                                  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
                                                  PRIMARY KEY (product_id, category_id),
                                                  created_at TIMESTAMPTZ DEFAULT NOW(),
                                                  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colors
CREATE TABLE IF NOT EXISTS colors (
                                      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                      name VARCHAR(50) NOT NULL UNIQUE,
                                      hex_code CHAR(7) NOT NULL UNIQUE,
                                      created_at TIMESTAMPTZ DEFAULT NOW(),
                                      updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product ↔ Colors
CREATE TABLE IF NOT EXISTS product_colors (
                                              product_id UUID REFERENCES products(id) ON DELETE CASCADE,
                                              color_id UUID REFERENCES colors(id) ON DELETE CASCADE,
                                              PRIMARY KEY (product_id, color_id),
                                              created_at TIMESTAMPTZ DEFAULT NOW(),
                                              updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product ↔ Images (with type + color reference)
CREATE TABLE IF NOT EXISTS product_images (
                                              product_id UUID REFERENCES products(id) ON DELETE CASCADE,
                                              image_id UUID REFERENCES images(id) ON DELETE CASCADE,
                                              type_image image_type_enum,
                                              color_id UUID REFERENCES colors(id) ON DELETE SET NULL,
                                              PRIMARY KEY (product_id, image_id),
                                              created_at TIMESTAMPTZ DEFAULT NOW(),
                                              updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sizes
CREATE TABLE IF NOT EXISTS sizes (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     name VARCHAR(50) NOT NULL,
                                     type VARCHAR(50) NOT NULL,
                                     gender VARCHAR(20),
                                     region VARCHAR(20),
                                     description TEXT,
                                     sort_order INTEGER,
                                     created_at TIMESTAMPTZ DEFAULT NOW(),
                                     updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product stock by size and color
CREATE TABLE IF NOT EXISTS product_stock (
                                             product_id UUID REFERENCES products(id) ON DELETE CASCADE,
                                             size_id UUID REFERENCES sizes(id) ON DELETE CASCADE,
                                             color_id UUID REFERENCES colors(id) ON DELETE CASCADE,
                                             quantity INTEGER NOT NULL DEFAULT 0,
                                             PRIMARY KEY (product_id, size_id, color_id),
                                             created_at TIMESTAMPTZ DEFAULT NOW(),
                                             updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_product_id ON product_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_size_id ON product_stock(size_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_color_id ON product_stock(color_id);
CREATE INDEX IF NOT EXISTS idx_product_images_type_image ON product_images(type_image);
CREATE INDEX IF NOT EXISTS idx_product_images_color_id ON product_images(color_id);
CREATE INDEX IF NOT EXISTS idx_product_colors_color_id ON product_colors(color_id);
