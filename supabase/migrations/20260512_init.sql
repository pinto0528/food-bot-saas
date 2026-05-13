CREATE TYPE restaurant_status AS ENUM ('active', 'suspended', 'trial');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');
CREATE TYPE conversation_status AS ENUM ('ordering', 'checkout', 'closed');
CREATE TYPE user_role AS ENUM ('super_admin', 'restaurant_owner');

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  waba_id TEXT,
  waba_token TEXT,
  phone_number_id TEXT,
  webhook_verify_token TEXT,
  status restaurant_status NOT NULL DEFAULT 'trial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  status conversation_status NOT NULL DEFAULT 'ordering',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_restaurant ON conversations(restaurant_id);
CREATE INDEX idx_conversations_phone ON conversations(customer_phone);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id),
  role user_role NOT NULL DEFAULT 'restaurant_owner',
  name TEXT,
  first_login BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_error_logs_type ON error_logs(type);
CREATE INDEX idx_error_logs_created ON error_logs(created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
$$;

-- RLS Policies
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- restaurants: only super_admin
CREATE POLICY "super_admin_select_restaurants" ON restaurants
  FOR SELECT USING (is_super_admin());
CREATE POLICY "super_admin_insert_restaurants" ON restaurants
  FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY "super_admin_update_restaurants" ON restaurants
  FOR UPDATE USING (is_super_admin());
CREATE POLICY "super_admin_delete_restaurants" ON restaurants
  FOR DELETE USING (is_super_admin());

-- menu_items: restaurant owner
CREATE POLICY "owner_select_menu_items" ON menu_items
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "owner_insert_menu_items" ON menu_items
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "owner_update_menu_items" ON menu_items
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "owner_delete_menu_items" ON menu_items
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());

-- orders: restaurant owner
CREATE POLICY "owner_select_orders" ON orders
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "owner_update_orders" ON orders
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id());

-- conversations: restaurant owner
CREATE POLICY "owner_select_conversations" ON conversations
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "owner_update_conversations" ON conversations
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id());

-- profiles: own profile only
CREATE POLICY "user_select_profiles" ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "user_insert_profiles" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "super_admin_select_all_profiles" ON profiles
  FOR SELECT USING (is_super_admin());

-- error_logs: super_admin only
CREATE POLICY "super_admin_select_errors" ON error_logs
  FOR SELECT USING (is_super_admin());

-- super_admin access to all tables
CREATE POLICY "super_admin_select_menu_items" ON menu_items
  FOR SELECT USING (is_super_admin());
CREATE POLICY "super_admin_select_orders" ON orders
  FOR SELECT USING (is_super_admin());
CREATE POLICY "super_admin_select_conversations" ON conversations
  FOR SELECT USING (is_super_admin());

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
