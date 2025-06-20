# ==============================================================================
# 1. IMPORTS
# ==============================================================================
# --- Standard Library Imports ---
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

# --- Third-party Library Imports ---
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from passlib.context import CryptContext


# ==============================================================================
# 2. CONFIGURATION CONSTANTS
# ==============================================================================
# Secret key for signing JWT tokens. Loaded from environment variables for security.
# In a real production environment, this should be a long, complex, and randomly generated string.
SECRET_KEY = os.getenv("SECRET_KEY", "a_default_secret_key_for_development_only")

# Algorithm used for JWT encoding and decoding.
ALGORITHM = "HS256"

# Default expiration time for access tokens, in minutes.
ACCESS_TOKEN_EXPIRE_MINUTES = 30


# ==============================================================================
# 3. UTILITY INSTANCES
# ==============================================================================
# --- Password Hashing Context ---
# Configures the password hashing library (passlib) to use bcrypt, a strong and widely-used hashing algorithm.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- FastAPI Security Scheme ---
# Creates an OAuth2 compatible security scheme that FastAPI uses to extract the token from the request's "Authorization" header.
# The `tokenUrl` points to the endpoint where the client can obtain a token (i.e., the login endpoint).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# ==============================================================================
# 4. UTILITY FUNCTIONS
# ==============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain-text password against a hashed password.

    Args:
        plain_password (str): The password to check, as entered by the user.
        hashed_password (str): The stored hash to check against.

    Returns:
        bool: True if the passwords match, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hashes a plain-text password using the configured bcrypt algorithm.

    Args:
        password (str): The plain-text password to hash.

    Returns:
        str: The resulting hashed password.
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a new JWT access token.

    Args:
        data (dict): The data (payload) to store in the token, typically user identification.
        expires_delta (Optional[timedelta]): The lifespan of the token. If None, a default is used.

    Returns:
        str: The encoded JWT access token.
    """
    to_encode = data.copy()
    
    # Set the token's expiration time. Use the provided delta or a default of 15 minutes.
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Fallback to a shorter default if no expiration is specified
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        
    to_encode.update({"exp": expire})
    
    # Encode the payload with the secret key and algorithm to create the final token.
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

