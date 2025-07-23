-- Таблица заказов
CREATE TABLE IF NOT EXISTS orders (
                                      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                      user_id UUID, -- ссылка на пользователя из auth-service
                                      customer_name VARCHAR(255) NOT NULL,
                                      customer_email VARCHAR(255),
                                      customer_phone VARCHAR(50),
                                      status VARCHAR(50) NOT NULL DEFAULT 'pending',
                                      total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                                      created_at TIMESTAMPTZ DEFAULT NOW(),
                                      updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Позиции заказа
CREATE TABLE IF NOT EXISTS order_items (
                                           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                           order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
                                           product_id UUID REFERENCES products(id) ON DELETE SET NULL,
                                           size_id UUID, -- ссылка на sizes из product-service, без FK
                                           color_id UUID, -- ссылка на colors из product-service, без FK
                                           quantity INTEGER NOT NULL CHECK (quantity > 0),
                                           price DECIMAL(10,2) NOT NULL,
                                           created_at TIMESTAMPTZ DEFAULT NOW(),
                                           updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Оплаты
CREATE TABLE IF NOT EXISTS payments (
                                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
                                        method VARCHAR(50) NOT NULL,
                                        amount DECIMAL(10,2) NOT NULL,
                                        status VARCHAR(50) NOT NULL DEFAULT 'pending',
                                        paid_at TIMESTAMPTZ,
                                        created_at TIMESTAMPTZ DEFAULT NOW(),
                                        updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Доставка
CREATE TABLE IF NOT EXISTS deliveries (
                                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                          order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
                                          address TEXT NOT NULL,
                                          city VARCHAR(100),
                                          postal_code VARCHAR(20),
                                          country VARCHAR(100),
                                          delivery_method VARCHAR(50),
                                          delivery_status VARCHAR(50) DEFAULT 'preparing',
                                          shipped_at TIMESTAMPTZ,
                                          delivered_at TIMESTAMPTZ,
                                          created_at TIMESTAMPTZ DEFAULT NOW(),
                                          updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
