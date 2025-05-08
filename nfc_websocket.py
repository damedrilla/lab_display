import asyncio
import websockets
import ssl
from py122u import nfc

# Function to get the UID using py122u
def getUID():
    uid_parsed = ""
    try:
        reader = nfc.Reader()
        reader.connect()
        raw_uid = reader.get_uid()
        for _byte in range(len(raw_uid)):
            uid_parsed += f'{raw_uid[_byte]:02x}'  # Ensure two-character hex with leading zeroes
        return uid_parsed
    except Exception as e:
        return None

# WebSocket handler
async def nfc_reader(websocket):
    try:
        while True:
            uid = getUID()  # Get the UID from the NFC reader
            if uid:
                print(f"Card UID: {uid}")
                await websocket.send(uid)  # Send UID to the WebSocket client
            else:
                pass
            await asyncio.sleep(0.25)  # Poll every second
    except Exception as e:
        pass

# Main function to start the WebSocket server
async def main():
    # Load SSL certificate and private key
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_context.load_cert_chain(certfile="certificate.pem", keyfile="privatekey.pem")

    # Start the WebSocket server with SSL
    async with websockets.serve(nfc_reader, "localhost", 8765, ssl=ssl_context):
        print("Secure WebSocket server started at wss://localhost:8765")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())