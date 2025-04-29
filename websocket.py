import asyncio
import websockets
import ssl
import json
from py122u import nfc

# Function to get the UID using py122u
def getUID():
    return input("Your message:")

# WebSocket handler
async def nfc_reader(websocket):
    try:
        while True:
            uid = getUID()  # Get the UID from the NFC reader
            if uid:
                print(f"Card UID: {uid}")
                await websocket.send(json.dumps({"message": uid}))  # Send UID to the WebSocket client
            else:
                print("No card detected or error reading UID.")
            await asyncio.sleep(1)  # Poll every second
    except Exception as e:
        pass

# Main function to start the WebSocket server
async def main():
    # Load SSL certificate and private key
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_context.load_cert_chain(certfile="acertificate.pem", keyfile="aprivatekey.pem")

    # Start the WebSocket server with SSL
    async with websockets.serve(nfc_reader, "localhost", 8770, ssl=ssl_context):
        print("Secure WebSocket server started at wss://localhost:8765")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())