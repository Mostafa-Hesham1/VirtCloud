from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Union
from database import db
from utils.auth_tools import get_password_hash, verify_password, create_access_token, decode_access_token
from datetime import datetime

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Pydantic models
class SignupRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)
    plan: str = "free"  # Default to "free" plan

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
    credits: float  # allow fractional credit balances

# Dependency to get current user from JWT token
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = decode_access_token(token)
        email: str = payload.get("email")
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    try:
        user = await db.users.find_one({"email": email})
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return {"email": user["email"], "username": user["username"], "plan": user["plan"], "credits": user.get("credits", 0)}

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(req: SignupRequest):
    try:
        # ensure unique email
        existing = await db.users.find_one({"email": req.email})
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    # hash password
    hashed = get_password_hash(req.password)

    # Determine initial credits based on the plan
    initial_credits = 0
    if req.plan == "free":
        initial_credits = 15  # Free plan monthly credits
    elif req.plan == "pro":
        initial_credits = 150  # Pro plan monthly credits
    elif req.plan == "unlimited":
        initial_credits = 600  # Unlimited plan monthly credits
    # Pay-as-you-go (payg) starts with 0 credits by default

    user_doc = {
        "email": req.email,
        "username": req.username,
        "hashed_password": hashed,
        "plan": req.plan,
        "credits": initial_credits,
        "created_at": datetime.utcnow()
    }
    try:
        await db.users.insert_one(user_doc)
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
    return {"message": "User created successfully ✅"}

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    try:
        user = await db.users.find_one({"email": req.email})
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
    if not user or not verify_password(req.password, user.get("hashed_password")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    token = create_access_token({
        "email": user["email"],
        "username": user["username"],
        "plan": user["plan"],
        "credits": user.get("credits", 0)
    })
    return {"access_token": token}

@router.get("/me", response_model=UserResponse)
async def read_current_user(current: dict = Depends(get_current_user)):
    return current

@router.get("/user/credits")
async def get_user_credits(user=Depends(get_current_user)):
    """Get the current user's credit balance - optimized for speed"""
    try:
        # Use MongoDB projection to get only the credits field for efficiency
        user_data = await db.users.find_one(
            {"email": user["email"]},
            {"credits": 1}
        )
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Include timestamp to help track when the balance was retrieved
        return {
            "credits": user_data.get("credits", 0),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user credits: {str(e)}")