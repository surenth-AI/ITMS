from flask import request, jsonify, current_app
from extensions import db
from models import User, Driver
import jwt
import datetime

def register_auth_routes(app):
    @app.route('/api/auth/request-otp', methods=['POST'])
    def request_otp():
        data = request.json
        phone = data.get('phone')
        
        user = User.query.filter_by(phone=phone).first()
        if not user:
            # For development, auto-create a driver if they don't exist
            user = User(full_name="New Driver", phone=phone, role="driver")
            db.session.add(user)
            db.session.flush()
            driver = Driver(user_id=user.id, licence_number="PENDING", licence_expiry=datetime.date(2030,1,1), licence_class="C")
            db.session.add(driver)
            db.session.commit()
            
        # In production, integrate Twilio here
        return jsonify({"message": "OTP sent to phone", "mock_otp": "123456"}), 200

    @app.route('/api/auth/verify-otp', methods=['POST'])
    def verify_otp():
        data = request.json
        phone = data.get('phone')
        otp = data.get('otp')
        
        # Mock OTP validation
        if otp != '123456':
            return jsonify({"message": "Invalid OTP"}), 401
            
        user = User.query.filter_by(phone=phone).first()
        if not user:
            return jsonify({"message": "User not found"}), 404
            
        token = jwt.encode({
            'user_id': user.id,
            'role': user.role,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, current_app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            "token": token,
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "role": user.role
            }
        }), 200

    @app.route('/api/auth/login', methods=['POST'])
    def login_email_password():
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({"message": "Invalid email or password"}), 401
            
        token = jwt.encode({
            'user_id': user.id,
            'role': user.role,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, current_app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            "token": token,
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "role": user.role
            }
        }), 200
