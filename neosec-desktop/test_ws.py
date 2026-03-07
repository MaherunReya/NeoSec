import socketio
import threading
import time

AUTH_TOKEN = "hehej_put_your_own_token"
SERVER_URL = "http://localhost:5000"

class NeosecSocketClient:
    """
    A robust, non-blocking Socket.IO client designed to be integrated
    into a multithreaded Python application.
    """
    def __init__(self, server_url, token):
        self.server_url = server_url
        self.token = token
        self.sio = socketio.Client()
        self.connected = False
        
        self.setup_events()

    def setup_events(self):
        @self.sio.event
        def connect():
            self.connected = True
            print(f"✅ [Socket] Connected successfully! ID: {self.sio.get_sid()}")

        @self.sio.event
        def connect_error(data):
            self.connected = False
            print(f"❌ [Socket] Connection failed! Details: {data}")

        @self.sio.event
        def disconnect():
            self.connected = False
            print("🔌 [Socket] Disconnected from server.")

        @self.sio.on('userUpdated')
        def on_user_updated(data):
            print(f"📩 [App Event] 'userUpdated' payload received: {data}")

        @self.sio.on('*')
        def catch_all(event, data):
            print(f"📩 [Global Event] '{event}' payload received: {data}")

    def start(self):
        """
        Connects to the server in the background. 
        Returns immediately, so it doesn't block the caller thread.
        """
        if self.connected:
            return
            
        print(f"Attempting to connect to {self.server_url}...")
        try:
            # The client creates its own background thread to listen for events
            self.sio.connect(self.server_url, auth={'token': self.token})
        except socketio.exceptions.ConnectionError as e:
            print(f"❌ Failed to connect: {e}")

    def stop(self):
        """Disconnects the client and stops the background thread gracefully."""
        if self.connected:
            print("Disconnecting client...")
            self.sio.disconnect()


if __name__ == '__main__':
    # ---------------------------------------------------------
    # Example usage for your multithreaded application:
    # ---------------------------------------------------------
    
    # 1. Provide your real token
    real_token = AUTH_TOKEN
    
    # 2. Instantiate and start the client. 
    # 'start()' returns instantly; it does not block the script.
    ws_client = NeosecSocketClient(SERVER_URL, real_token)
    ws_client.start()
    
    print("\n[Main Thread] The client is running in the background.")
    print("[Main Thread] Press Ctrl+C at any time to exit safely.\n")

    try:
        # In a real app like PyQt or Tkinter, you would just start your GUI main loop here!
        # Since this is a simple test script with no other loop, we just pause the main thread.
        # Note: We use a loop of small sleeps so Windows can catch the KeyboardInterrupt cleanly.
        while True:
            time.sleep(0.5)
            
    except KeyboardInterrupt:
        print("\n[Main Thread] Ctrl+C detected. Shutting down gracefully...")
        ws_client.stop()
        print("Done.")
