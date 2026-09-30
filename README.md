# PompNet — محمد پمپ نت

پنل مدیریتی RTL، موبایل‌محور و آماده Railway برای مدیریت سرویس‌های متصل به Sanaei/Xray. این پروژه با Python/Flask ساخته شده و به Node.js، npm یا build system نیاز ندارد.

## اجرای Railway

1. این repository را در Railway به‌عنوان یک Service متصل کنید.
2. در بخش **Variables**، متغیرهای `.env.example` را اضافه کنید.
3. برای راه‌اندازی اولیه، یک نام کاربری و رمز عبور موقت در متغیرهای Railway قرار دهید. پس از ورود، رمز امن‌تر تولید کنید و مقدار هش آن را در `ADMIN_PASSWORD_HASH` قرار دهید؛ سپس `ADMIN_PASSWORD` را حذف کنید. مقدارهای محرمانه را در Git commit نکنید.
4. Railway به‌صورت خودکار Dockerfile را تشخیص می‌دهد. برنامه روی `0.0.0.0:$PORT` اجرا می‌شود.
5. Health check را روی `/health` تنظیم کنید.

برای ساخت `SECRET_KEY` می‌توانید از `python -c "import secrets; print(secrets.token_hex(32))"` استفاده کنید. در محیط HTTPS مقدار `COOKIE_SECURE=true` باقی بماند.

## اتصال به VPS Agent

برنامه Railway فقط رابط و API امن است و Xray یا سرویس privileged را اجرا نمی‌کند. یک Agent روی VPS باید با HTTPS و شبکه محدود اجرا شود و این routeها را ارائه کند:

- `GET /v1/overview`
- `GET /v1/users?search=&status=&sort=&page=&per_page=`

در Railway مقدارهای `AGENT_URL` و `AGENT_TOKEN` را ثبت کنید. توکن فقط در backend استفاده می‌شود و به مرورگر ارسال نمی‌شود. Agent باید احراز هویت، allowlist شبکه، timeout، لاگ ممیزی و اعتبارسنجی ورودی داشته باشد.

## ایمنی داده‌های موجود

این پنل به‌صورت پیش‌فرض هیچ دیتابیس Sanaei/3x-ui را لمس یا overwrite نمی‌کند و هیچ عملیات حذف یا reinstall انجام نمی‌دهد. هر Agent عملیاتی باید قبل از هر migration یا تغییر، backup قابل‌بازگشت بگیرد و عملیات مخرب را صراحتاً مسدود کند.

## توسعه محلی

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
# مقادیر .env را فقط محلی تنظیم کنید
python app.py
```

سپس `http://localhost:8080` را باز کنید. برای HTTP محلی `COOKIE_SECURE=false` بگذارید. اطلاعات ورود پیش‌فرض در UI یا کد frontend نمایش داده نمی‌شود و باید فقط از متغیرهای محیطی مدیریت شود.

## امنیت

CSRF token، session cookie امن، password hashing با Werkzeug، rate limiting، سقف payload، ورودی‌های escape‌شده و عدم ارسال secret به frontend پیاده‌سازی شده‌اند. صدای UI با Web Audio API و فقط پس از تعامل کاربر تولید می‌شود و تنظیم آن در localStorage دستگاه ذخیره می‌گردد.
