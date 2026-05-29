FROM mcr.microsoft.com/playwright/python:v1.42.0-jammy

# Create the user required by Hugging Face Spaces (user ID 1000)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR $HOME/app

# Install Python dependencies first (for caching)
COPY --chown=user:user requirements.txt $HOME/app/
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (if not already fully packaged)
RUN playwright install chromium

# Copy the rest of the application
COPY --chown=user:user . $HOME/app/

# Ensure the cache directory exists and is writable
RUN mkdir -p $HOME/app/assets/cache_png

# Hugging Face Spaces route traffic to port 7860
EXPOSE 7860

# Run the FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
