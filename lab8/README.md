# Lab 8 Exercise: DBMS and SQL — Yusong Huang

## Setup
```bash
pip install -r requirements.txt
python app.py
```
Then open http://127.0.0.1:5000 in your browser.

## Exercise I: Password Support (`database.py`)
- SQLite database with `users` table (id, username, password_hash)
- `hashlib.sha256` used to hash passwords before storage
- `register_user()` creates account with hashed password
- `login_user()` verifies credentials by comparing hashes
- Can also run standalone: `python database.py` for CLI testing

## Exercise II: Login Page + Database (`app.py` + `templates/login.html`)
- Flask app serving a Tank Battle themed login page
- POST `/login` validates credentials against SQLite database
- POST `/register` creates new user with hashed password
- Flash messages for success/error feedback
- Login page design inspired by Lab 6 Figma MCP tank game login
