CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bonuses_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bonuses_earned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50);

UPDATE orders SET order_number = 'SUN-' || LPAD(nextval('order_number_seq')::text, 6, '0') WHERE order_number IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

CREATE TABLE IF NOT EXISTS loyalty_accounts (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned INTEGER NOT NULL DEFAULT 0,
    tier VARCHAR(30) NOT NULL DEFAULT 'SUNRISE',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    type VARCHAR(30) NOT NULL,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
    bonus_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1,
    min_order DECIMAL(10,2) NOT NULL DEFAULT 0,
    birthday_only BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    usage_limit INTEGER,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO promotions (code,title,description,discount_percent,bonus_multiplier,min_order,active,valid_from,valid_until) VALUES
('WELCOME10','Добро пожаловать в SUNSET','Скидка 10% на первый заказ от 3 000 ₽.',10,1,3000,TRUE,NOW(),NOW()+INTERVAL '2 years'),
('SUNSET15','Время обновить гардероб','Скидка 15% на заказ от 7 000 ₽.',15,1,7000,TRUE,NOW(),NOW()+INTERVAL '1 year'),
('DOUBLE','Двойные бонусы','Получайте в два раза больше бонусов за заказ.',0,2,0,TRUE,NOW(),NOW()+INTERVAL '1 year')
ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,discount_percent=EXCLUDED.discount_percent,bonus_multiplier=EXCLUDED.bonus_multiplier,min_order=EXCLUDED.min_order,active=EXCLUDED.active,valid_until=EXCLUDED.valid_until;

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user ON loyalty_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promotions_active_dates ON promotions(active, valid_from, valid_until);
