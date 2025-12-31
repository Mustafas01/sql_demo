from flask import request, jsonify
from flask_jwt_extended import create_access_token

USERS = {
    "admin": "admin123"  
}

def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing body"}), 400

    username = data.get("username")
    password = data.get("password")

    if USERS.get(username) != password:
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=username)
    return jsonify({"access_token": token})
