from lynkio import Lynk, Connection, Request, render_template, send_file

HOST = "0.0.0.0"

PORT = 8080
 
app = Lynk(
    host=HOST,
    port=PORT,
    protocol="TCP",
    debug=True,
    serve_client=True,
    client_path="/lynkio/client.js"
)

@app.get("/")
async def home(req):
    return render_template("testdb.html")


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    import asyncio
    import sys
    if sys.platform.startswith("win"):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    app.run()