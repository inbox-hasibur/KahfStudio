import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
# Also check parent .env.local if running from repo root
if not os.getenv("NEXT_PUBLIC_SUPABASE_URL"):
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("WARNING: Supabase credentials not found in environment!")

def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)
