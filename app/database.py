# ==============================================================================
# 1. IMPORTS
# ==============================================================================
# --- Standard Library Imports ---
import os

# --- Third-party Library Imports ---
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


# ==============================================================================
# 2. DATABASE CONFIGURATION
# ==============================================================================
# Retrieve the database connection URL from environment variables for security and flexibility.
# This allows for different database configurations in development vs. production without code changes.
# Example format: "postgresql://user:password@host:port/dbname" or "sqlite:///./venturemind.db"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./venturemind.db")


# ==============================================================================
# 3. DATABASE ENGINE & SESSION SETUP
# ==============================================================================
# --- Database Engine ---
# The engine is the starting point for any SQLAlchemy application. It's the 'home base' for the actual database.
engine = create_engine(
    DATABASE_URL,
    # The 'connect_args' is only needed for SQLite to allow multi-threaded access.
    # It's not required for other databases like PostgreSQL.
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# --- Session Maker ---
# Creates a factory for generating new Session objects, which are the primary interface for database communication.
# autocommit=False: Changes are not committed to the DB automatically. We control commits manually.
# autoflush=False: Changes are not sent to the DB automatically. This is usually managed by commits.
# bind=engine: Connects the session factory to our database engine.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Declarative Base ---
# A factory function that constructs a base class for declarative class definitions.
# Our ORM models (like User, Analysis) will inherit from this class.
Base = declarative_base()


# ==============================================================================
# 4. DATABASE DEPENDENCY
# ==============================================================================

def get_db():
    """
    A FastAPI dependency that provides a database session for a single request.
    
    This function creates a new database session for each incoming request and ensures
    that the session is always closed correctly, even if an error occurs during
    the request handling.

    Yields:
        Session: A new SQLAlchemy database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        # Always close the session to release the connection back to the connection pool.
        db.close()

