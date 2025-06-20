# ==============================================================================
# 1. IMPORTS
# ==============================================================================
# --- Standard Library Imports ---
import datetime
from typing import List, Optional

# --- Third-party Library Imports ---
from pydantic import BaseModel, EmailStr


# ==============================================================================
# 2. ANALYSIS-RELATED SCHEMAS
# ==============================================================================

class AnalysisBase(BaseModel):
    """
    Base schema for an analysis, containing core attributes.
    Used as a foundation for creation and read schemas.
    """
    idea_prompt: str
    report_markdown: str


class AnalysisCreate(AnalysisBase):
    """
    Schema for creating a new analysis.
    Currently has no additional fields beyond AnalysisBase.
    """
    pass


class Analysis(AnalysisBase):
    """
    Schema for reading or returning analysis data from the database.
    Includes all attributes from AnalysisBase, plus database-generated attributes.
    """
    id: int
    owner_id: int
    created_at: datetime.datetime

    class Config:
        # Allows Pydantic to read data from ORM models (SQLAlchemy).
        from_attributes = True


# ==============================================================================
# 3. USER-RELATED SCHEMAS
# ==============================================================================

class UserBase(BaseModel):
    """
    Base schema for a user, containing public information.
    """
    username: str
    email: EmailStr  # Pydantic will validate that this is a valid email format.


class UserCreate(UserBase):
    """
    Schema for creating a new user.
    Inherits from UserBase and adds the password field required for account creation.
    """
    password: str


class User(UserBase):
    """
    Schema for reading or returning user data from the database.
    Excludes sensitive data like passwords and includes related data such as analyses.
    """
    id: int
    # Defaults to an empty list if the user has no analyses.
    analyses: List[Analysis] = []

    class Config:
        # Allows Pydantic to read data from ORM models.
        from_attributes = True


# ==============================================================================
# 4. TOKEN-RELATED SCHEMAS
# ==============================================================================

class Token(BaseModel):
    """
    Schema for the response sent back when a user successfully logs in.
    """
    access_token: str
    token_type: str
    username: str  # Added for a better user experience (UX) on the frontend.


class TokenData(BaseModel):
    """
    Schema for the data encoded within the JWT payload.
    """
    # 'sub' (subject) within the JWT is now the email. Made optional for error handling.
    email: Optional[str] = None

