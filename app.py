import os
import secrets
from datetime import timedelta
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, session, url_for, flash
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import check_password_hash, generate_password_hash

from services.agent import AgentClient, AgentError

load_dotenv()

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get("SECRET_KEY") or secrets.token_hex(32),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE", "true").lower() == "true",
    SESSION_COOKIE_SAMESITE="Lax",
    PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
    MAX_CONTENT_LENGTH=1024 * 1024,
)
limiter = Limiter(key_func=get_remote_address, app=app, default_limits=["300 per hour"])
agent = AgentClient()


def admin_username():
    return os.environ.get("ADMIN_USERNAME", "admin").strip() or "admin"


def admin_password_hash():
    configured = os.environ.get("ADMIN_PASSWORD_HASH")
    if configured:
        return configured
    # ADMIN_PASSWORD is intended only for the initial deployment bootstrap.
    password = os.environ.get("ADMIN_PASSWORD")
    if not password:
        raise RuntimeError("Set ADMIN_PASSWORD_HASH or ADMIN_PASSWORD before starting PompNet")
    return generate_password_hash(password)


def csrf_token():
    if "csrf" not in session:
        session["csrf"] = secrets.token_urlsafe(32)
    return session["csrf"]


def csrf_valid():
    supplied = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")
    return supplied and secrets.compare_digest(supplied, session.get("csrf", ""))


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("authenticated"):
            if request.path.startswith("/api/"):
                return jsonify(error="authentication_required"), 401
            return redirect(url_for("login"))
        return view(*args, **kwargs)
    return wrapped


@app.context_processor
def inject_security():
    return {"csrf_token": csrf_token()}


@app.get("/")
def index():
    return redirect(url_for("dashboard" if session.get("authenticated") else "login"))


@app.route("/login", methods=["GET", "POST"])
@limiter.limit("8 per minute", methods=["POST"])
def login():
    if session.get("authenticated"):
        return redirect(url_for("dashboard"))
    if request.method == "POST":
        if not csrf_valid():
            flash("درخواست نامعتبر است. دوباره تلاش کنید.", "error")
            return render_template("login.html"), 400
        username = (request.form.get("username") or "").strip()
        password = request.form.get("password") or ""
        try:
            valid = secrets.compare_digest(username, admin_username()) and check_password_hash(admin_password_hash(), password)
        except RuntimeError:
            valid = False
        if valid:
            session.clear()
            session.permanent = True
            session["authenticated"] = True
            session["csrf"] = secrets.token_urlsafe(32)
            return redirect(url_for("dashboard"))
        flash("نام کاربری یا رمز عبور نادرست است.", "error")
    return render_template("login.html")


@app.post("/logout")
@login_required
def logout():
    if not csrf_valid():
        return jsonify(error="invalid_csrf"), 400
    session.clear()
    return redirect(url_for("login"))


@app.get("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html", username=admin_username())


@app.get("/health")
def health():
    return jsonify(status="ok", service="pompnet")


@app.get("/api/overview")
@login_required
def overview():
    try:
        return jsonify(agent.overview())
    except AgentError as exc:
        return jsonify(error="agent_unavailable", message=str(exc), data=agent.empty_overview()), 200


@app.get("/api/users")
@login_required
def users():
    args = {key: request.args.get(key, "") for key in ("search", "status", "sort", "page", "per_page")}
    try:
        return jsonify(agent.users(args))
    except AgentError as exc:
        return jsonify(error="agent_unavailable", message=str(exc), users=[], total=0, page=1, per_page=20), 200


@app.post("/api/settings/password")
@login_required
@limiter.limit("5 per hour")
def change_password():
    if not csrf_valid():
        return jsonify(error="invalid_csrf"), 400
    payload = request.get_json(silent=True) or {}
    current = str(payload.get("current_password", ""))
    new = str(payload.get("new_password", ""))
    if len(new) < 12 or len(new) > 128:
        return jsonify(error="رمز جدید باید حداقل ۱۲ کاراکتر باشد."), 422
    if not check_password_hash(admin_password_hash(), current):
        return jsonify(error="رمز فعلی نادرست است."), 403
    # Runtime changes are deliberately not persisted to disk or exposed. Persist ADMIN_PASSWORD_HASH in Railway.
    return jsonify(message="رمز جدید تولید شد؛ مقدار هش‌شده را به ADMIN_PASSWORD_HASH در Railway منتقل کنید.", password_hash=generate_password_hash(new))


@app.errorhandler(413)
def too_large(_):
    return jsonify(error="payload_too_large"), 413


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")))
