# ==============================================================================
# 1. IMPORTS
# ==============================================================================
# --- Standard Library Imports ---
import datetime

# --- Third-party Library Imports ---
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship

# --- Local Application Imports ---
from .database import Base


# ==============================================================================
# 2. DATABASE MODELS (TABLES)
# ==============================================================================

class User(Base):
    """
    Represents a user in the database.
    Each user can own multiple analyses.
    """
    __tablename__ = "users"

    # --- Table Columns ---
    id = Column(Integer, primary_key=True, index=True, comment="Primary key for the user.")
    
    # Ensure email and username are unique and not nullable for authentication and identification.
    email = Column(String, unique=True, index=True, nullable=False, comment="User's unique email address.")
    username = Column(String, unique=True, index=True, nullable=False, comment="User's unique public username.")
    hashed_password = Column(String, nullable=False, comment="Hashed password for security.")
    
    # --- Relationships ---
    # Defines the one-to-many relationship between a User and their Analyses.
    analyses = relationship("Analysis", back_populates="owner")


class Analysis(Base):
    """
    Represents a single business idea analysis performed by a user.
    Each analysis belongs to one user.
    """
    __tablename__ = "analyses"

    # --- Table Columns ---
    id = Column(Integer, primary_key=True, index=True, comment="Primary key for the analysis.")
    idea_prompt = Column(String, index=True, comment="The initial business idea prompt submitted by the user.")
    report_markdown = Column(Text, comment="The full final report generated by the AI, stored in Markdown format.")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, comment="Timestamp for when the analysis was created.")
    
    # Foreign key to link this analysis to a user.
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # --- Relationships ---
    # Defines the many-to-one relationship back to the User who owns this analysis.
    owner = relationship("User", back_populates="analyses")

