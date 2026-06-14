"""
RailMind — SQLAlchemy Models
Database models for train operations and delay events.
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

Base = declarative_base()

DATABASE_URL = "sqlite:///./railmind.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class TrainStatus(Base):
    """Current status of each train in the system."""
    __tablename__ = "train_status"

    id = Column(Integer, primary_key=True, index=True)
    train_no = Column(String(10), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    from_station = Column(String(10), nullable=False)
    to_station = Column(String(10), nullable=False)
    scheduled_dep = Column(String(5), nullable=False)
    actual_dep = Column(String(5), nullable=False)
    delay_minutes = Column(Integer, default=0)
    status = Column(String(20), default="on_time")  # on_time | delayed | at_risk
    current_station = Column(String(10), nullable=False)
    platform_no = Column(Integer, default=1)
    passengers_count = Column(Integer, default=0)
    route = Column(JSON, nullable=False)


class DelayEvent(Base):
    """Log of delay events and cascade effects."""
    __tablename__ = "delay_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    source_train = Column(String(10), nullable=False)
    source_delay_minutes = Column(Integer, nullable=False)
    affected_trains = Column(JSON, nullable=True)  # List of affected train dicts
    cascade_data = Column(JSON, nullable=True)      # Full cascade analysis
    agent_recommendations = Column(Text, nullable=True)


class StationInfo(Base):
    """Station metadata."""
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    platform_count = Column(Integer, default=1)
    zone = Column(String(10), default="CR")


def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for getting DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
