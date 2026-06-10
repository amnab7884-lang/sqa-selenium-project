"""
MongoDB Atlas connection module for Intellihunt Cyber Threat Hunting Copilot.
Uses Motor (async MongoDB driver) for non-blocking database operations.
Connection string is read from MONGO_URL in .env file.
"""

import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load .env — try multiple locations to be robust
_this_file = Path(__file__).resolve()
_project_root = _this_file.parent.parent.parent  # backend/app/database.py -> project root
_env_file = _project_root / ".env"

if _env_file.exists():
    load_dotenv(_env_file)
else:
    # Fallback: search upward
    for p in _this_file.parents:
        candidate = p / ".env"
        if candidate.exists():
            load_dotenv(candidate)
            break

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "intellihunt")

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    """Connect to MongoDB Atlas and create indexes."""
    global client, db

    if not MONGO_URL or MONGO_URL.strip() == "":
        raise RuntimeError(
            "MONGO_URL is empty! Edit your .env file and add your MongoDB Atlas connection string:\n"
            "   MONGO_URL=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority"
        )

    # ─── TLS Fix for macOS LibreSSL 2.8.3 ─────────────────────────
    # macOS system Python 3.9 ships with LibreSSL 2.8.3, which cannot
    # complete TLS handshakes with MongoDB Atlas using URL-based
    # tlsAllowInvalidCertificates. The fix is to provide certifi's
    # modern CA bundle via tlsCAFile so LibreSSL can verify the certs.
    mongo_url = MONGO_URL

    # Strip any existing tlsAllowInvalidCertificates from URL (it breaks
    # when combined with the Python-level tlsCAFile parameter)
    import re
    mongo_url = re.sub(r'[&?]tlsAllowInvalidCertificates=\w+', '', mongo_url)

    # Use certifi CA bundle for proper TLS certificate verification
    try:
        import certifi
        tls_ca_file = certifi.where()
    except ImportError:
        tls_ca_file = None

    client = AsyncIOMotorClient(mongo_url, tlsCAFile=tls_ca_file)
    db = client[DB_NAME]

    # Verify connection
    await client.admin.command("ping")
    print(f"Connected to MongoDB Atlas: {DB_NAME}")

    # Create indexes (non-critical)
    try:
        await db.logs.create_index([("timestamp", -1)])
        await db.logs.create_index([("original_log.SRC_IP", 1)])
        await db.logs.create_index([("original_log.DST_IP", 1)])
        await db.logs.create_index([("risk_score", -1)])
        await db.alerts.create_index([("timestamp", -1)])
        await db.alerts.create_index([("source", 1)])
        await db.alerts.create_index([("score", -1)])
    except Exception as e:
        print(f"Index creation skipped: {e}")


async def close_db():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()


def get_db():
    """Get the database instance."""
    return db
