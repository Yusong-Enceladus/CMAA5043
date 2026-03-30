"""
app.py - Flask web application linking the login page to the SQLite database
CMAA5043 Lab 8 - Exercise II: Link SQL database with login page
Author: Yusong Huang

This Flask app:
  - Serves the Tank Battle login page (GET /)
  - Handles login form submission (POST /login)
  - Handles registration form submission (POST /register)
  - Validates credentials against the SQLite database via database.py
"""

from flask import Flask, render_template, request, redirect, url_for, flash

# Import our database helper functions from Exercise I
from database import init_db, register_user, login_user

# ---------------------------------------------------------------------------
# Flask app setup
# ---------------------------------------------------------------------------

app = Flask(__name__)

# Secret key is required for Flask flash messages (session-based)
app.secret_key = "tank-battle-secret-key-lab8"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """
    Serve the Tank Battle login page.
    Renders the login.html template from the templates/ folder.
    """
    return render_template("login.html")


@app.route("/login", methods=["POST"])
def handle_login():
    """
    Handle login form submission.
    1. Read username and password from the form data.
    2. Call login_user() to validate against the database.
    3. Flash a success or error message and redirect back.
    """
    # Get form data submitted by the user
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "").strip()

    # Basic validation: fields must not be empty
    if not username or not password:
        flash("Please enter both username and password.", "error")
        return redirect(url_for("index"))

    # Authenticate against the SQLite database
    if login_user(username, password):
        # Credentials are correct
        flash(f"Welcome back, Commander {username}! Preparing your tank...", "success")
    else:
        # Wrong username or password
        flash("Invalid username or password. Try again.", "error")

    return redirect(url_for("index"))


@app.route("/register", methods=["POST"])
def handle_register():
    """
    Handle registration form submission.
    1. Read username and password from the form data.
    2. Call register_user() to insert into the database.
    3. Flash a success or error message and redirect back.
    """
    # Get form data submitted by the user
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "").strip()

    # Basic validation: fields must not be empty
    if not username or not password:
        flash("Please enter both username and password.", "error")
        return redirect(url_for("index"))

    # Attempt to register the new user
    if register_user(username, password):
        # Registration succeeded
        flash(f"Account created for '{username}'! You can now log in.", "success")
    else:
        # Username already taken
        flash(f"Username '{username}' is already taken. Choose another.", "error")

    return redirect(url_for("index"))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Initialise the database (create table if not exists) on startup
    init_db()

    # Run the Flask development server
    # debug=True enables auto-reload and helpful error pages during development
    print("Starting Tank Battle server at http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
