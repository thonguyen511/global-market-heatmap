FROM mcr.microsoft.com/playwright/python:v1.42.0-jammy

# Hugging Face Spaces requires the container to run as user ID 1000.
# The Playwright base image already has a user with UID 1000 (pwuser), so we just switch to it.
USER 1000

# Set path so pip-installed binaries are found
ENV PATH=/home/pwuser/.local/bin:$PATH
WORKDIR /app

# Install Python dependencies first (for caching)
COPY --chown=1000:1000 requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers
RUN playwright install chromium

# Copy the rest of the application
COPY --chown=1000:1000 . /app/

# Ensure the cache directory exists and is writable
RUN mkdir -p /app/assets/cache_png

# Hugging Face Spaces route traffic to port 7860
EXPOSE 7860

# Run the FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
