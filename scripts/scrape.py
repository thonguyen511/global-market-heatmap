"""
scrape.py

This script automates the process of opening TradingView for all chosen global markets,
injecting their specific data source IDs, automatically switching the UI into Dark Mode, 
and exporting/downloading high-resolution Heatmap PNG images into the assets/cache_png directory.
"""

import time
import json
import os
import urllib.parse
from playwright.sync_api import sync_playwright
from datetime import datetime
import zoneinfo

def is_market_open(iso, trading_hours, holidays):
    tz_name = trading_hours.get('timezone')
    open_str = trading_hours.get('open')
    close_str = trading_hours.get('close')
    
    if not tz_name or not open_str or not close_str:
        return False
        
    try:
        tz = zoneinfo.ZoneInfo(tz_name)
    except Exception:
        return False
        
    now = datetime.now(tz)
    
    # Check weekend
    if now.weekday() >= 5: # 5=Sat, 6=Sun
        return False
        
    # Check holiday
    date_str = now.strftime('%Y-%m-%d')
    if iso in holidays and date_str in holidays[iso]:
        return False
        
    # Check hours
    current_time = now.strftime('%H:%M')
    if open_str < close_str:
        return open_str <= current_time <= close_str
    else:
        return current_time >= open_str or current_time <= close_str

def run():
    print("Starting Playwright...")
    os.makedirs('assets/cache_png', exist_ok=True)
    
    with open('assets/geo/market_chosen.json', encoding='utf-8') as f:
        chosen_markets = json.load(f)
        
    with open('assets/geo/markets.json', encoding='utf-8') as f:
        raw_markets = json.load(f)
        
    with open('assets/geo/holidays.json', encoding='utf-8') as f:
        holidays = json.load(f)
        
    market_details = { m['iso']: m for m in raw_markets }
        
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        for market in chosen_markets:
            iso = market.get('iso', '')
            chosen_code = market.get('chosen_code', '')
            if not iso or not chosen_code:
                continue
                
            details = market_details.get(iso, {})
            trading_hours = details.get('trading_hours', {})
            
            if not is_market_open(iso, trading_hours, holidays):
                print(f"Skipping {market.get('name', iso)} (Closed or Holiday)")
                continue
                
            print(f"\nProcessing {market['name']} (ISO: {iso}, Code: {chosen_code})...")
            
            # Use a fresh context and page for every iteration exactly as requested
            context = browser.new_context(viewport={'width': 1920, 'height': 1080})
            page = context.new_page()
            
            # Construct URL
            params = {
                "dataSource": chosen_code,
                "blockColor": "change",
                "blockSize": "market_cap_basic",
                "grouping": "no_group"
            }
            json_str = json.dumps(params, separators=(',', ':'))
            encoded = urllib.parse.quote(json_str)
            url = f'https://www.tradingview.com/heatmap/stock/#{encoded}'
            
            try:
                page.goto(url, wait_until='networkidle')
                time.sleep(5) # Wait for canvas to render
                
                # Perform dark mode click sequence for EVERY page
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
                out_path = f"assets/cache_png/{iso}.png"
                download.save_as(out_path)
                print(f"Successfully saved to {out_path}!")
            except Exception as e:
                print(f"Failed to process {iso}:", e)
                
            # Close context to clean up memory and ensure fresh session for next country
            context.close()
            
        browser.close()

if __name__ == '__main__':
    run()
