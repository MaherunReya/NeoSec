import socketio
import time
import sys

# Replace this with a valid JWT token from your login endpoint
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzYTJiZjkxOS1kZDlkLTQzMmUtYTgxZi1iOGQ5MDg3ZWRmNTMiLCJyb2xlIjoidXNlciIsImlhdCI6MTc3Mjc4NDg2NywiZXhwIjoxNzczMzg5NjY3fQ.AsAuW3WRyAk9ydgrYOyro_3HeTKQ-3DumrRMkOLrAUE"
SERVER_URL = "http://localhost:5000"

# Create a Socket.IO client
sio = socketio.Client()

@sio.event
def connect():
    print(f"✅ Connected to server! SID: {sio.sid}")

@sio.event
def connect_error(data):
    print(f"❌ Connection failed: {data}")

@sio.event
def disconnect():
    print("⚠️ Disconnected from server")

# Listen for the specific event we defined in the backend
@sio.on('MODEL_UPDATE')
def on_model_update(payload):
    print("\n" + "="*50)
    print("🔥 RECEIVED REAL-TIME UPDATE 🔥")
    print(f"Model: {payload.get('model')}")
    print(f"Action: {payload.get('action')}")
    # print(f"Data: {payload.get('data')}")
    print("="*50 + "\n")

def main():
    if JWT_TOKEN == "YOUR_JWT_TOKEN_HERE":
        print("Please replace 'YOUR_JWT_TOKEN_HERE' with a real JWT token from your DB or login endpoint.")
        sys.exit(1)

    print(f"Attempting to connect to {SERVER_URL}...")
    try:
        # Pass the JWT token in the auth dictionary matching our backend logic
        sio.connect(SERVER_URL, auth={'token': JWT_TOKEN})
        
        print("Waiting for events. Press Ctrl+C to exit.")
        # Keep the script running to listen for events
        sio.wait()
    except socketio.exceptions.ConnectionError as e:
        print(f"Failed to connect: {e}")
    except KeyboardInterrupt:
        print("\nExiting...")
        sio.disconnect()

if __name__ == '__main__':
    main()
