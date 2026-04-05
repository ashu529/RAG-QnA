import firebase_admin
from firebase_admin import firestore, auth
import os

def init_firebase():
    """Initialize Firebase Admin SDK using Application Default Credentials."""
    if not firebase_admin._apps:
        print("Initializing Firebase Admin SDK...")
        try:
            # This will use the GOOGLE_APPLICATION_CREDENTIALS env var, or ADC.
            firebase_admin.initialize_app()
        except Exception as e:
            print(f"Warning: Firebase Admin SDK initialization failed: {e}")
            print("Make sure you have set GOOGLE_APPLICATION_CREDENTIALS locally.")

def get_db():
    """Returns a Firestore client instance."""
    if not firebase_admin._apps:
        init_firebase()
    # If it still fails, it will raise an error here when creating client.
    try:
        return firestore.client()
    except Exception as e:
        print(f"Firestore Client Error: {e}")
        return None

def verify_user_token(id_token):
    """
    Verifies a Firebase ID token.
    Returns the decoded token dictionary if successful, None otherwise.
    """
    if not firebase_admin._apps:
        init_firebase()
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None
