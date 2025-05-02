from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import db
from .auth import get_current_user

router = APIRouter()

# Models
class Plan(BaseModel):
    id: str
    name: str
    price_monthly: float
    credits_monthly: int
    max_vm_runtime: Optional[int] = None  # in hours, None means unlimited
    max_cpu: int
    max_ram: int  # in GB
    max_disk: int  # in GB
    features: List[str]

class CreditTransaction(BaseModel):
    amount: int
    description: str
    transaction_type: str  # "purchase", "usage", "monthly_grant"
    timestamp: datetime = datetime.now()

class PlanUpgrade(BaseModel):
    plan_id: str

class CreditRecharge(BaseModel):
    amount: float  # in dollars

# Plan definitions
plans = [
    {
        "id": "free",
        "name": "Free Plan",
        "price_monthly": 0,
        "credits_monthly": 15,
        "max_vm_runtime": 4,
        "max_cpu": 2,
        "max_ram": 2,
        "max_disk": 20,
        "features": [
            "Max runtime per VM: 4 hours",
            "Up to 2 CPUs",
            "Up to 2GB RAM",
            "Up to 20GB Disk",
            "Community support"
        ]
    },
    {
        "id": "pro",
        "name": "Pro Plan",
        "price_monthly": 9,
        "credits_monthly": 150,
        "max_vm_runtime": None,
        "max_cpu": 4,
        "max_ram": 8,
        "max_disk": 50,
        "features": [
            "Unlimited VM session length",
            "Up to 4 CPUs",
            "Up to 8GB RAM",
            "Up to 50GB Disk",
            "Email support"
        ]
    },
    {
        "id": "unlimited",
        "name": "Unlimited Plan",
        "price_monthly": 29,
        "credits_monthly": 600,
        "max_vm_runtime": None,
        "max_cpu": 8,
        "max_ram": 16,
        "max_disk": 200,
        "features": [
            "All Pro features",
            "Up to 8 CPUs",
            "Up to 16GB RAM",
            "Up to 200GB Disk",
            "Persistent VMs",
            "Priority support"
        ]
    },
    {
        "id": "payg",
        "name": "Pay-as-you-Go",
        "price_monthly": 0,
        "credits_monthly": 0,
        "max_vm_runtime": None,
        "max_cpu": 8,
        "max_ram": 16,
        "max_disk": 200,
        "features": [
            "No monthly credits",
            "Pay only for what you use",
            "Recharge anytime",
            "All resource limits same as Unlimited plan"
        ]
    }
]

# Routes
@router.get("/plans")
async def get_plans():
    """Get all available plans"""
    return plans

@router.get("/user/plan")
async def get_user_plan(user=Depends(get_current_user)):
    """Get current user's plan"""
    user_data = await db.users.find_one({"email": user["email"]})
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    plan_id = user_data.get("plan", "free")
    credit_balance = user_data.get("credits", 0)
    
    for plan in plans:
        if plan["id"] == plan_id:
            return {
                "plan": plan,
                "credits": credit_balance,
                "credit_balance": credit_balance,  # alias for legacy clients
                "monthly_credits": plan["credits_monthly"]
            }
    
    # If plan not found, return free plan
    return {
        "plan": plans[0],
        "credit_balance": credit_balance
    }

@router.post("/user/plan")
async def change_plan(plan_data: PlanUpgrade, user=Depends(get_current_user)):
    """Change user's plan"""
    # Find the plan by ID
    selected_plan = None
    for plan in plans:
        if plan["id"] == plan_data.plan_id:
            selected_plan = plan
            break
    
    if not selected_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Update user's plan in database
    result = await db.users.update_one(
        {"email": user["email"]},
        {"$set": {"plan": plan_data.plan_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update plan")
    
    return {"status": "success", "message": f"Plan changed to {selected_plan['name']}"}

@router.post("/user/credits/recharge")
async def recharge_credits(recharge_data: CreditRecharge, user=Depends(get_current_user)):
    """Recharge user's credits"""
    if recharge_data.amount < 5:
        raise HTTPException(status_code=400, detail="Minimum recharge amount is $5")
    
    # Convert dollars to credits (10 credits = $5)
    credits_to_add = int(recharge_data.amount * 2)
    
    # Add credits to user's account
    result = await db.users.update_one(
        {"email": user["email"]},
        {"$inc": {"credits": credits_to_add}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to add credits")
    
    # Record the transaction
    await db.credit_transactions.insert_one({
        "user_email": user["email"],
        "amount": credits_to_add,
        "money_amount": recharge_data.amount,
        "transaction_type": "purchase",
        "description": f"Purchased {credits_to_add} credits for ${recharge_data.amount}",
        "timestamp": datetime.now()
    })
    
    # Get updated balance
    user_data = await db.users.find_one({"email": user["email"]})
    current_balance = user_data.get("credits", 0)
    
    return {
        "status": "success", 
        "message": f"Added {credits_to_add} credits to your account",
        "credits_added": credits_to_add,
        "current_balance": current_balance
    }

@router.post("/enterprise/quote")
async def request_enterprise_quote(user=Depends(get_current_user)):
    """Request a quote for the Enterprise plan"""
    # In a real application, this would create a ticket or send an email
    
    # Record the quote request
    await db.enterprise_quotes.insert_one({
        "user_email": user["email"],
        "status": "pending",
        "timestamp": datetime.now()
    })
    
    return {
        "status": "success",
        "message": "Your quote request has been submitted. Our team will contact you shortly."
    }

@router.get("/user/credits")
async def get_user_credits(user=Depends(get_current_user)):
    """Get the current user's credit balance"""
    try:
        user_data = await db.users.find_one({"email": user["email"]})
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"credits": user_data.get("credits", 0)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user credits: {str(e)}")
