"""
database.py - SQLite database setup with password hashing
CMAA5043 Lab 8 - Exercise I: Adding Password Support
Author: Yusong Huang

This module provides:
  - Database creation with a 'users' table (id, username, password_hash)
  - User registration with hashed passwords (SHA-256 via hashlib)
  - User login that verifies credentials against stored hashes
  - A CLI interface for testing registration/login directly
"""

import sqlite3
import hashlib
import os

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Path to the SQLite database file (same directory as this script)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.db")


# ---------------------------------------------------------------------------
# Helper: hash a plain-text password with SHA-256
# ---------------------------------------------------------------------------

def hash_password(password):
    """
    Hash a plain-text password using SHA-256.
    Returns the hex digest string for storage in the database.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Database initialisation
# ---------------------------------------------------------------------------

def init_db():
    """
    Create (or recreate) the database schema.
    Drops the existing 'users' table if it exists, then creates a fresh one
    with columns: id (auto-increment PK), username (unique), password_hash.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Drop existing table so we always start with a clean schema
    cursor.execute("DROP TABLE IF EXISTS users")

    # Create the users table with a password_hash column
    cursor.execute("""
        CREATE TABLE users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT    NOT NULL UNIQUE,
            password_hash TEXT    NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    print(f"[init_db] Database initialised at {DB_PATH}")


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register_user(username, password):
    """
    Register a new user.

    Steps:
      1. Hash the plain-text password with SHA-256.
      2. Insert the username and hash into the database.
      3. Return True on success, False if the username already exists.
    """
    # Hash the password before storing
    pw_hash = hash_password(password)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, pw_hash),
        )
        conn.commit()
        print(f"[register] User '{username}' registered successfully.")
        return True
    except sqlite3.IntegrityError:
        # UNIQUE constraint on username violated
        print(f"[register] Username '{username}' already exists.")
        return False
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Login / Authentication
# ---------------------------------------------------------------------------

def login_user(username, password):
    """
    Authenticate a user.

    Steps:
      1. Hash the supplied password.
      2. Look up the user in the database.
      3. Compare the stored hash with the computed hash.
      4. Return True if they match, False otherwise.
    """
    # Hash the supplied password so we can compare with the stored hash
    pw_hash = hash_password(password)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        "SELECT password_hash FROM users WHERE username = ?",
        (username,),
    )
    row = cursor.fetchone()
    conn.close()

    if row is None:
        # No user found with that username
        print(f"[login] User '{username}' not found.")
        return False

    stored_hash = row[0]

    if pw_hash == stored_hash:
        # Hashes match - login successful
        print(f"[login] User '{username}' logged in successfully.")
        return True
    else:
        # Wrong password
        print(f"[login] Incorrect password for '{username}'.")
        return False


# ---------------------------------------------------------------------------
# CLI interface (for standalone testing)
# ---------------------------------------------------------------------------

def main():
    """
    Simple command-line menu to test registration and login.
    Run this file directly:  python database.py
    """
    # Always start by initialising the database
    init_db()

    while True:
        print("\n========== Tank Battle User System ==========")
        print("1. Register")
        print("2. Login")
        print("3. Exit")
        choice = input("Select an option (1/2/3): ").strip()

        if choice == "1":
            # --- Registration ---
            uname = input("Enter username: ").strip()
            pwd = input("Enter password: ").strip()
            if uname and pwd:
                register_user(uname, pwd)
            else:
                print("Username and password cannot be empty.")

        elif choice == "2":
            # --- Login ---
            uname = input("Enter username: ").strip()
            pwd = input("Enter password: ").strip()
            login_user(uname, pwd)

        elif choice == "3":
            print("Goodbye, Commander!")
            break
        else:
            print("Invalid option. Please try again.")


# Run the CLI when executed directly
if __name__ == "__main__":
    main()
