"""
scrape_crypto.py

Automates the process of opening TradingView's Crypto Heatmap, switching to Dark Mode, 
and exporting the high-resolution PNG image to assets/cache_png/crypto.png.
"""

import time
import os
from playwright.sync_api import sync_playwright

def run():
    print("Starting Playwright for Crypto Heatmap...")
    os.makedirs('assets/cache_png', exist_ok=True)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()
        
        url = 'https://www.tradingview.com/heatmap/crypto/#%7B%22dataSource%22%3A%22CryptoWithoutStable%22%2C%22blockColor%22%3A%2224h_close_change%7C5%22%2C%22blockSize%22%3A%22market_cap_calc%22%2C%22grouping%22%3A%22no_group%22%7D'
        
        print("\nProcessing Crypto Heatmap...")
        
        try:
            page.goto(url, wait_until='networkidle')
            time.sleep(5) # Wait for canvas to render
            
            # Perform dark mode click sequence
            print("Setting dark mode...")
            menu_btn = page.locator("xpath=/html/body/div[3]/div[3]/div[2]/div[3]/button[2]")
            menu_btn.click(timeout=5000)
            time.sleep(2)
            
            toggle = page.locator('input[data-name="header-user-menu-switch-theme"]')
            toggle.click(force=True, timeout=5000)
            print("Clicked dark mode toggle successfully!")
            
            page.keyboard.press("Escape")
            time.sleep(3)
            
            print("Clicking the Share/Export menu...")
            share_btn = page.locator('[data-qa-id="heatmap-top-bar_share"]')
            share_btn.click(force=True, timeout=5000)
            time.sleep(2)
            
            print("Clicking 'Download image'...")
            with page.expect_download(timeout=15000) as download_info:
                download_btn = page.locator('[data-qa-id="heatmap-top-bar_share_download_snapshot"]')
                download_btn.click(force=True, timeout=5000)
            
            download = download_info.value
            out_path = "assets/cache_png/crypto.png"
            download.save_as(out_path)
            print(f"Successfully saved to {out_path}!")
        except Exception as e:
            print("Failed to process Crypto Heatmap:", e)
            
        context.close()
        browser.close()

if __name__ == '__main__':
    run()
