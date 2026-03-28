#!/bin/bash

# ╔══════════════════════════════════════════════════════════╗
# ║           BlackBot V2 - سكريبت التثبيت التلقائي         ║
# ║           BlackBot V2 - Automatic Setup Script          ║
# ╚══════════════════════════════════════════════════════════╝

set -e

echo ""
echo "══════════════════════════════════════════════════"
echo "   BlackBot V2 - Setup Script"
echo "══════════════════════════════════════════════════"
echo ""

# ─── تحقق من نظام التشغيل ───
OS=$(uname -s)
echo "[1/5] Detecting OS: $OS"

# ─── تثبيت Node.js 18 ───
echo ""
echo "[2/5] Checking Node.js..."

if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js 18..."
    if [ "$OS" = "Linux" ]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ "$OS" = "Darwin" ]; then
        brew install node@18
    else
        echo "Please install Node.js 18 manually from https://nodejs.org"
        exit 1
    fi
else
    NODE_VERSION=$(node -v)
    echo "Node.js found: $NODE_VERSION"
fi

# ─── تثبيت المكتبات النظامية المطلوبة لـ canvas ───
echo ""
echo "[3/5] Installing system dependencies for canvas & sqlite3..."

if [ "$OS" = "Linux" ]; then
    sudo apt-get update -qq
    sudo apt-get install -y \
        build-essential \
        libcairo2-dev \
        libpango1.0-dev \
        libjpeg-dev \
        libgif-dev \
        librsvg2-dev \
        libpixman-1-dev \
        pkg-config \
        python3 \
        python3-pip \
        sqlite3 \
        libsqlite3-dev \
        ffmpeg \
        git \
        curl \
        wget 2>/dev/null
    echo "System dependencies installed."
elif [ "$OS" = "Darwin" ]; then
    brew install cairo pango jpeg giflib librsvg pkg-config ffmpeg 2>/dev/null || true
    echo "System dependencies installed."
fi

# ─── تثبيت مكتبات Node.js ───
echo ""
echo "[4/5] Installing Node.js packages..."
npm install --no-fund --no-audit
echo "Packages installed."

# ─── إعادة بناء المكتبات الأصلية ───
echo ""
echo "     Rebuilding native modules (canvas, sqlite3)..."
npm rebuild canvas sqlite3
echo "Native modules rebuilt successfully."

# ─── إعداد ملفات الإعدادات ───
echo ""
echo "[5/5] Setting up configuration files..."

if [ ! -f "config.json" ]; then
    cp config.example.json config.json
    echo "  config.json created from example - Please edit it with your details!"
else
    echo "  config.json already exists."
fi

if [ ! -f "account.txt" ]; then
    echo "[]" > account.txt
    echo "  account.txt created - Please add your Facebook cookies!"
else
    echo "  account.txt already exists."
fi

if [ ! -f "fca-config.json" ]; then
    cp fca-config.example.json fca-config.json
    echo "  fca-config.json created from example - Please edit it with your details!"
else
    echo "  fca-config.json already exists."
fi

# ─── رسالة النهاية ───
echo ""
echo "══════════════════════════════════════════════════"
echo "   Setup Complete!"
echo "══════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "  1. Edit config.json and fill in your details:"
echo "       - Facebook email & password"
echo "       - Your Facebook ID in adminBot"
echo "       - Gemini API key (get it from: https://makersuite.google.com/app/apikey)"
echo ""
echo "  2. Add your Facebook cookies to account.txt"
echo "       (See account.example.txt for instructions)"
echo ""
echo "  3. Start the bot:"
echo "       node index.js"
echo ""
echo "══════════════════════════════════════════════════"
