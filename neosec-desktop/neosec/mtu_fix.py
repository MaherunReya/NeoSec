import socket

# Keep a reference to the original socket class
_orig_socket = socket.socket

class PatchedSocket(_orig_socket):
    """
    A socket subclass that automatically sets TCP_MAXSEG (MSS) for TCP sockets.
    This helps bypass MTU 'black hole' issues commonly found in VPN environments.
    """
    def __init__(self, family=socket.AF_INET, type=socket.SOCK_STREAM, proto=0, fileno=None):
        # Call the original __init__
        super().__init__(family, type, proto, fileno)
        
        # Only apply clamping to new TCP sockets (not ones created from existing fileno)
        if fileno is None:
            # We check for AF_INET/AF_INET6 and SOCK_STREAM (TCP)
            # family and type might be passed as positional or keyword arguments.
            # super().__init__ handles the defaults if they are not provided.
            if family in (socket.AF_INET, socket.AF_INET6) and (type & socket.SOCK_STREAM):
                try:
                    # Clamp MSS to 1300 to ensure compatibility with VPN tunnels
                    # 1300 is safe even with high VPN overhead.
                    self.setsockopt(socket.IPPROTO_TCP, socket.TCP_MAXSEG, 1300)
                except Exception:
                    # Some systems or socket states might not support setting TCP_MAXSEG
                    pass

def apply():
    """
    Apply the MTU fix by monkey-patching the socket module.
    This should be called as early as possible in the application lifecycle.
    """
    if socket.socket is not PatchedSocket:
        socket.socket = PatchedSocket
        print("✅ [MTU Fix] socket.socket has been monkey-patched to clamp MSS to 1300.")
