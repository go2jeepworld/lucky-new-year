from datetime import datetime
from sqlalchemy import create_engine, Column, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

Base = declarative_base()

class LoginRecord(Base):
    __tablename__ = 'login_records'
    
    sid = Column(String(100), primary_key=True)
    ip = Column(String(50))
    login_time = Column(DateTime)
    logout_time = Column(DateTime, nullable=True)
    country = Column(String(100))
    region = Column(String(100))
    city = Column(String(100))
    player_name = Column(String(100))
    room_code = Column(String(10), nullable=True)

def get_db_url():
    if os.environ.get('DATABASE_URL'):
        return os.environ.get('DATABASE_URL')
    return 'sqlite:///login_history.db'

engine = create_engine(get_db_url())
SessionLocal = sessionmaker(bind=engine)

def init_db():
    Base.metadata.create_all(engine)

def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        pass

def save_login_record(record):
    db = get_db()
    try:
        existing = db.query(LoginRecord).filter_by(sid=record['sid']).first()
        if existing:
            for key, value in record.items():
                if value is not None:
                    setattr(existing, key, value)
        else:
            db_record = LoginRecord(**record)
            db.add(db_record)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[DB] Error saving login record: {e}")
    finally:
        db.close()

def update_logout_time(sid, logout_time):
    db = get_db()
    try:
        record = db.query(LoginRecord).filter_by(sid=sid).first()
        if record:
            record.logout_time = logout_time
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"[DB] Error updating logout time: {e}")
    finally:
        db.close()

def get_all_login_records():
    db = get_db()
    try:
        records = db.query(LoginRecord).all()
        return [{
            'sid': r.sid,
            'ip': r.ip,
            'login_time': r.login_time.strftime('%Y-%m-%d %H:%M:%S') if r.login_time else None,
            'logout_time': r.logout_time.strftime('%Y-%m-%d %H:%M:%S') if r.logout_time else None,
            'country': r.country,
            'region': r.region,
            'city': r.city,
            'player_name': r.player_name,
            'room_code': r.room_code
        } for r in records]
    except Exception as e:
        print(f"[DB] Error getting login records: {e}")
        return []
    finally:
        db.close()

def get_active_login_records():
    db = get_db()
    try:
        records = db.query(LoginRecord).filter(LoginRecord.logout_time == None).all()
        return [{
            'sid': r.sid,
            'ip': r.ip,
            'login_time': r.login_time.strftime('%Y-%m-%d %H:%M:%S') if r.login_time else None,
            'logout_time': None,
            'country': r.country,
            'region': r.region,
            'city': r.city,
            'player_name': r.player_name,
            'room_code': r.room_code
        } for r in records]
    except Exception as e:
        print(f"[DB] Error getting active login records: {e}")
        return []
    finally:
        db.close()
