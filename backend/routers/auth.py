from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from database import db
from utils.auth_tools import get_password_hash, verify_password, create_access_token, decode_access_token

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Pydantic models
class SignupRequest(BaseModel):
    email: EmailStr
    username: str
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    email: EmailStr
    username: str
    plan: str

# Dependency to get current user from JWT token
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = decode_access_token(token)
        email: str = payload.get("email")
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    user = db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return {"email": user["email"], "username": user["username"], "plan": user["plan"]}

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(req: SignupRequest):
    # ensure unique email
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    # hash password
    hashed = get_password_hash(req.password)
    user_doc = {
        "email": req.email,
        "username": req.username,
        "hashed_password": hashed,
        "plan": "free",
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user_doc)
    return {"message": "User created successfully ✅"}

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email})
    if not user or not verify_password(req.password, user.get("hashed_password")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    token = create_access_token({"email": user["email"], "username": user["username"], "plan": user["plan"]})
    return {"access_token": token}

@router.get("/me", response_model=UserResponse)
async def read_current_user(current: dict = Depends(get_current_user)):
    return current