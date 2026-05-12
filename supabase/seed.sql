-- Seed data for development

INSERT INTO restaurants (id, name, phone, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'El Buen Sabor', '+541112345678', 'trial'),
  ('a0000000-0000-0000-0000-000000000002', 'Pizzeria Don Remolo', '+541198765432', 'trial');

INSERT INTO menu_items (restaurant_id, name, description, price, category) VALUES
  -- El Buen Sabor
  ('a0000000-0000-0000-0000-000000000001', 'Hamburguesa Clasica', 'Carne 200g, lechuga, tomate, cheddar', 8.50, 'Principales'),
  ('a0000000-0000-0000-0000-000000000001', 'Hamburguesa Completa', 'Carne 200g, huevo, panceta, cheddar, lechuga, tomate', 10.00, 'Principales'),
  ('a0000000-0000-0000-0000-000000000001', 'Papas Fritas', 'Porcion de papas fritas crujientes', 3.50, 'Entradas'),
  ('a0000000-0000-0000-0000-000000000001', 'Aros de Cebolla', 'Porcion de aros de cebolla empanizados', 4.00, 'Entradas'),
  ('a0000000-0000-0000-0000-000000000001', 'Milanesa Napolitana', 'Milanesa con salsa, jamon y queso', 9.00, 'Principales'),
  ('a0000000-0000-0000-0000-000000000001', 'Ensalada Caesar', 'Lechuga, crutones, parmesano, aderezo Caesar', 7.00, 'Principales'),
  ('a0000000-0000-0000-0000-000000000001', 'Coca-Cola', 'Lata 355ml', 1.50, 'Bebidas'),
  ('a0000000-0000-0000-0000-000000000001', 'Agua Mineral', 'Botella 500ml', 1.00, 'Bebidas'),
  ('a0000000-0000-0000-0000-000000000001', 'Flan con Dulce de Leche', 'Flan casero con dulce de leche', 4.50, 'Postres'),
  ('a0000000-0000-0000-0000-000000000001', 'Helado 2 Bolas', 'Dos bolas de helado a eleccion', 3.50, 'Postres'),

  -- Pizzeria Don Remolo
  ('a0000000-0000-0000-0000-000000000002', 'Pizza Margarita', 'Muzzarella, tomate, albahaca', 7.00, 'Pizzas'),
  ('a0000000-0000-0000-0000-000000000002', 'Pizza Napolitana', 'Muzzarella, tomate, oregano', 7.50, 'Pizzas'),
  ('a0000000-0000-0000-0000-000000000002', 'Pizza Especial', 'Muzzarella, jamon, morron, aceitunas', 9.00, 'Pizzas'),
  ('a0000000-0000-0000-0000-000000000002', 'Pizza Fugazzeta', 'Muzzarella, cebolla, oregano', 8.00, 'Pizzas'),
  ('a0000000-0000-0000-0000-000000000002', 'Empanada de Carne', 'Carne cortada a cuchillo', 1.50, 'Empanadas'),
  ('a0000000-0000-0000-0000-000000000002', 'Empanada de Pollo', 'Pollo, verdeo, crema', 1.50, 'Empanadas'),
  ('a0000000-0000-0000-0000-000000000002', 'Empanada de Jamon y Queso', 'Jamon y muzzarella', 1.50, 'Empanadas'),
  ('a0000000-0000-0000-0000-000000000002', 'Cerveza Artesanal', 'Pinta 500ml', 4.00, 'Bebidas'),
  ('a0000000-0000-0000-0000-000000000002', 'Sprite', 'Lata 355ml', 1.50, 'Bebidas'),
  ('a0000000-0000-0000-0000-000000000002', 'Porcion de Pizza a la Piedra', 'Porcion de pizza a la piedra con el relleno que elijas', 3.00, 'Pizzas');
