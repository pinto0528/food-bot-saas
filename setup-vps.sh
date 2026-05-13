#!/bin/bash
set -e

echo "=== food-bot-saas VPS Setup ==="

# 1. System packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx curl git

# 2. Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 3. PM2
sudo npm install -g pm2

# 4. Clone repo
cd /opt
sudo git clone https://github.com/pinto0528/food-bot-saas.git
sudo chown -R $USER:$USER food-bot-saas
cd food-bot-saas

# 5. Create .env from template
cp .env.example .env
echo "Edit .env with your Supabase keys, Groq key, and BOT_RESTAURANT_ID"
echo "Then run: npm install && npm run build && pm2 start ecosystem.config.js"
echo ""
echo "Also configure Nginx reverse proxy for port 3000"
