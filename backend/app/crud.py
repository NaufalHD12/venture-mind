# ==============================================================================
# 1. IMPORTS
# ==============================================================================
# --- Third-party Library Imports ---
from sqlalchemy.orm import Session

# --- Local Application Imports ---
# Import models for database table structure, schemas for data validation, and auth for password utilities.
from . import models, schemas, auth


# ==============================================================================
# 2. USER-RELATED CRUD FUNCTIONS
# ==============================================================================

def get_user_by_username(db: Session, username: str) -> models.User | None:
    """
    Retrieves a single user from the database by their username.

    Args:
        db (Session): The database session.
        username (str): The username to search for.

    Returns:
        models.User | None: The user object if found, otherwise None.
    """
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_email(db: Session, email: str) -> models.User | None:
    """
    Retrieves a single user from the database by their email address.

    Args:
        db (Session): The database session.
        email (str): The email address to search for.

    Returns:
        models.User | None: The user object if found, otherwise None.
    """
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """
    Creates a new user in the database.

    Args:
        db (Session): The database session.
        user (schemas.UserCreate): The user data, including the plain-text password.

    Returns:
        models.User: The newly created user object.
    """
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str) -> models.User | None:
    """
    Authenticates a user by checking their email and password.

    Args:
        db (Session): The database session.
        email (str): The user's email.
        password (str): The user's plain-text password.

    Returns:
        models.User | None: The authenticated user object if credentials are correct, otherwise None.
    """
    user = get_user_by_email(db, email=email)
    if not user or not auth.verify_password(password, user.hashed_password):
        return None
    return user


# ==============================================================================
# 3. ANALYSIS-RELATED CRUD FUNCTIONS
# ==============================================================================

def save_analysis(db: Session, analysis: schemas.AnalysisCreate, user_id: int) -> models.Analysis:
    """
    Saves a new analysis report to the database for a specific user.

    Args:
        db (Session): The database session.
        analysis (schemas.AnalysisCreate): The analysis data to be saved.
        user_id (int): The ID of the user who owns this analysis.

    Returns:
        models.Analysis: The newly created analysis object.
    """
    db_analysis = models.Analysis(
        idea_prompt=analysis.idea_prompt,
        report_markdown=analysis.report_markdown,
        owner_id=user_id
    )
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)
    return db_analysis


def get_analyses_by_user(db: Session, user_id: int) -> list[models.Analysis]:
    """
    Retrieves all analyses for a specific user, ordered by most recent first.

    Args:
        db (Session): The database session.
        user_id (int): The ID of the user whose analyses are to be fetched.

    Returns:
        list[models.Analysis]: A list of analysis objects.
    """
    return db.query(models.Analysis).filter(models.Analysis.owner_id == user_id).order_by(models.Analysis.created_at.desc()).all()


def delete_analysis(db: Session, analysis_id: int, user_id: int) -> dict | None:
    """
    Deletes a specific analysis, ensuring it belongs to the requesting user.

    Args:
        db (Session): The database session.
        analysis_id (int): The ID of the analysis to delete.
        user_id (int): The ID of the user requesting the deletion, for ownership verification.

    Returns:
        dict | None: A confirmation dictionary if successful, otherwise None.
    """
    # Find the analysis only if the ID and owner ID both match.
    db_analysis = db.query(models.Analysis).filter(
        models.Analysis.id == analysis_id,
        models.Analysis.owner_id == user_id
    ).first()
    
    if db_analysis:
        db.delete(db_analysis)
        db.commit()
        return {"ok": True}
    
    # Return None if the analysis doesn't exist or the user is not the owner.
    return None

