from dotenv import load_dotenv
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReadPreference

# Load .env file
load_dotenv()

# Fetch MongoDB URI from environment
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI not set in environment. Please add it to .env file.")

# Initialize MongoDB client with secondaryPreferred to allow reads when a primary isn't reachable
client = AsyncIOMotorClient(MONGO_URI, read_preference=ReadPreference.SECONDARY_PREFERRED)
# Determine database name from env or use a default
DB_NAME = os.getenv("MONGO_DB_NAME", "VirtCloud")  # replace with your DB name
db = client[DB_NAME]