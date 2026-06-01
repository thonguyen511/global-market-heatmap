import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging
import sys

# Ensure the current directory is in the Python path so local modules can be found
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scripts import scrape
from scripts import scrape_crypto

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def background_scraper_loop():
    logger.info("Background scraper loop started.")
    while True:
        try:
            logger.info("Running market scraper...")
            await scrape.run_async()
            
            logger.info("Running crypto scraper...")
            # Crypto scraper is synchronous, so we run it in a thread to prevent blocking
            await asyncio.to_thread(scrape_crypto.run)
            
            logger.info("Scraping cycle complete. Sleeping for 5 minutes.")
        except Exception as e:
            logger.error(f"Error during scraping cycle: {e}")
            
        # Sleep for 3 minutes (180 seconds)
        await asyncio.sleep(180)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the background task
    task = asyncio.create_task(background_scraper_loop())
    yield
    # Shutdown: Cancel the task
    task.cancel()

app = FastAPI(lifespan=lifespan)

# Ensure cache directory exists before mounting
os.makedirs('assets/cache_png', exist_ok=True)

# Mount directories as static files
app.mount("/assets", StaticFiles(directory="assets"), name="assets")
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/src", StaticFiles(directory="src"), name="src")

@app.get("/")
async def root():
    return FileResponse("index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=7860)
