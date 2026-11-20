import os
import uuid
from datetime import datetime
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
from extensions import db, socketio

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Load settings from itms-backend/.env (never committed). Real environment
# variables take precedence over values in the file.
load_dotenv(os.path.join(BASE_DIR, '.env'))


def _require_secret_key():
    key = os.environ.get('SECRET_KEY', '').strip()
    if len(key) < 32:
        raise RuntimeError(
            "SECRET_KEY is missing or too short (min 32 characters). "
            "Copy .env.example to .env and set SECRET_KEY. Generate one with: "
            "python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    return key


def create_app():
    app = Flask(__name__)
    CORS(app)

    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL', 'sqlite:///' + os.path.join(BASE_DIR, 'itms.db'))
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = _require_secret_key()

    db.init_app(app)
    socketio.init_app(app)

    # Register blueprints/routes
    from auth import register_auth_routes
    from routes import register_api_routes
    register_auth_routes(app)
    register_api_routes(app)

    # Health check route
    @app.route('/api/health')
    def health_check():
        return jsonify({"status": "healthy", "service": "ITMS Phase 1 API"})

    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        # Import models here to register with SQLAlchemy before create_all
        import models
        db.create_all()
    
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    port = int(os.environ.get('PORT', '5000'))
    socketio.run(app, host='0.0.0.0', port=port, debug=debug, allow_unsafe_werkzeug=debug)
