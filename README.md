# 🤖 BlackBot V2 - بوت فيسبوك ماسنجر

<div align="center">

```
██████╗ ██╗      █████╗  ██████╗██╗  ██╗    ███╗   ███╗ █████╗ ██╗  ██╗ ██████╗ ██████╗   █████╗ 
██╔══██╗██║     ██╔══██╗██╔════╝██║ ██╔╝    ████╗ ████║██╔══██╗██║  ██║██╔═══██╗██╔══██╗██╔══██╗
██████╔╝██║     ███████║██║     █████╔╝     ██╔████╔██║███████║███████║██║   ██║██████╔╝███████║
██╔══██╗██║     ██╔══██║██║     ██╔═██╗     ██║╚██╔╝██║██╔══██║██╔══██║██║   ██║██╔══██╗██╔══██║
██████╔╝███████╗██║  ██║╚██████╗██║  ██╗    ██║ ╚═╝ ██║██║  ██║██║  ██║╚██████╔╝██║  ██║██║  ██║
╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝    ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
```

**بوت فيسبوك ماسنجر متكامل مبني على Node.js**

</div>

---

## 📋 المتطلبات

- **Node.js** الإصدار 18 أو أحدث
- **npm** الإصدار 7 أو أحدث
- حساب فيسبوك مخصص للبوت
- مفتاح Gemini API (اختياري - لميزة الذكاء الاصطناعي)

---

## 🚀 التثبيت السريع (Linux/Ubuntu)

```bash
# 1. استنسخ المشروع
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# 2. شغل سكريبت التثبيت التلقائي
chmod +x setup.sh
bash setup.sh
```

---

## 🔧 التثبيت اليدوي

### الخطوة 1: تثبيت المكتبات النظامية

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev \
    libjpeg-dev libgif-dev librsvg2-dev libpixman-1-dev pkg-config \
    python3 sqlite3 libsqlite3-dev ffmpeg
```

**macOS:**
```bash
brew install cairo pango jpeg giflib librsvg pkg-config ffmpeg
```

### الخطوة 2: تثبيت مكتبات Node.js

```bash
npm install
npm rebuild canvas sqlite3
```

---

## ⚙️ الإعداد

### 1. ملف config.json

```bash
cp config.example.json config.json
```

ثم عدّل `config.json` وأضف:

| الحقل | الوصف |
|-------|-------|
| `facebookAccount.email` | إيميل حساب فيسبوك البوت |
| `facebookAccount.password` | كلمة مرور فيسبوك |
| `adminBot` | قائمة بـ ID الإداريين |
| `apiKeys.gemini` | مفتاح Gemini API |
| `timeZone` | المنطقة الزمنية (مثال: `Asia/Riyadh`) |

### 2. كوكيز فيسبوك (account.txt)

هذا الملف يحتوي على كوكيز جلسة فيسبوك بصيغة JSON.

**كيفية الحصول على الكوكيز:**

1. ثبّت إضافة **[Cookie-Editor](https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm)** في Chrome
2. سجّل الدخول إلى [www.facebook.com](https://www.facebook.com) بحساب البوت
3. افتح الإضافة واضغط **Export** ثم **Export as JSON**
4. انسخ الناتج والصقه في ملف `account.txt`

### 3. مفتاح Gemini API

1. اذهب إلى [Google AI Studio](https://makersuite.google.com/app/apikey)
2. اضغط **Create API Key**
3. انسخ المفتاح وضعه في `config.json` في خانة `apiKeys.gemini`

### 4. معرفة Facebook ID

1. اذهب إلى [findmyfbid.in](https://www.findmyfbid.in)
2. أدخل رابط حسابك في فيسبوك
3. انسخ الـ ID وضعه في `adminBot` في `config.json`

---

## ▶️ تشغيل البوت

```bash
node index.js
```

---

## 📁 هيكل الملفات

```
BlackBot-V2/
├── 📄 index.js              - نقطة الدخول الرئيسية
├── 📄 Goat.js               - الكود الأساسي للبوت
├── 📄 config.json           - إعدادات البوت (لا تشاركه!)
├── 📄 config.example.json   - مثال على الإعدادات
├── 📄 account.txt           - كوكيز فيسبوك (لا تشاركه!)
├── 📄 account.example.txt   - شرح طريقة الكوكيز
├── 📄 fca-config.json       - إعدادات FCA (لا تشاركه!)
├── 📄 setup.sh              - سكريبت التثبيت التلقائي
├── 📁 scripts/
│   ├── 📁 cmds/             - أوامر البوت
│   └── 📁 events/           - أحداث البوت
├── 📁 bot/login/            - منطق تسجيل الدخول
├── 📁 dashboard/            - لوحة التحكم
└── 📁 database/             - قاعدة البيانات
```

---

## 🔑 الملفات الحساسة

> ⚠️ **تحذير:** هذه الملفات تحتوي على بيانات سرية. لا تشاركها أو ترفعها على GitHub!

| الملف | المحتوى |
|-------|---------|
| `config.json` | إيميل، كلمة مرور، API keys |
| `account.txt` | كوكيز فيسبوك |
| `fca-config.json` | بيانات تسجيل الدخول |
| `Fca_Database/` | قاعدة البيانات المحلية |

جميع هذه الملفات مُضافة في `.gitignore` لحمايتها.

---

## 🆘 حل المشاكل الشائعة

### مشكلة canvas أو sqlite3
```bash
sudo apt-get install -y libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
npm rebuild canvas sqlite3
```

### مشكلة تسجيل الدخول
- تأكد من صحة الكوكيز في `account.txt`
- تأكد من صحة الإيميل وكلمة المرور في `config.json`
- جرب إعادة الحصول على الكوكيز من المتصفح

### مشكلة Gemini AI لا يعمل
- تأكد أن مفتاح API صحيح في `config.json`
- تأكد أن لديك اتصال بالإنترنت
- احصل على مفتاح جديد من [Google AI Studio](https://makersuite.google.com/app/apikey)

---

## 📞 التواصل

- **المصدر الرسمي:** [GitHub - Goat-Bot-V2](https://github.com/ntkhang03/Goat-Bot-V2)
- **المطوّر الأصلي:** Saint

---

<div align="center">
Made with ♡ by Saint
</div>
