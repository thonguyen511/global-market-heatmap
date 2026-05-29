"""
scrape.py

This script automates the process of opening TradingView for all chosen global markets,
injecting their specific data source IDs, automatically switching the UI into Dark Mode, 
and exporting/downloading high-resolution Heatmap PNG images into the assets/cache_png directory.
"""

import asyncio
import json
import os
import urllib.parse
from playwright.async_api import async_playwright
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
    except Exception as e:
        print(f"Error loading timezone {tz_name} for {iso}: {e}")
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

async def process_market(market, browser, market_details, holidays, semaphore):
    iso = market.get('iso', '')
    chosen_code = market.get('chosen_code', '')
    if not iso or not chosen_code:
        return

    details = market_details.get(iso, {})
    trading_hours = details.get('trading_hours', {})
    
    if not is_market_open(iso, trading_hours, holidays):
        print(f"Skipping {market.get('name', iso)} (Closed or Holiday)")
        return

    async with semaphore:
        print(f"\nProcessing {market['name']} (ISO: {iso}, Code: {chosen_code})...")
        
        # Use a fresh context and page for every iteration
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = await context.new_page()
        
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
            await page.goto(url, wait_until='networkidle')
            await asyncio.sleep(5) # Wait for canvas to render
            
            # Perform dark mode click sequence for EVERY page
            print(f"[{iso}] Setting dark mode...")
            menu_btn = page.locator("xpath=/html/body/div[3]/div[3]/div[2]/div[3]/button[2]")
            await menu_btn.click(timeout=5000)
            await asyncio.sleep(2)
            
            toggle = page.locator('input[data-name="header-user-menu-switch-theme"]')
            await toggle.click(force=True, timeout=5000)
            print(f"[{iso}] Clicked dark mode toggle successfully!")
            
            await page.keyboard.press("Escape")
            await asyncio.sleep(3)
            
            print(f"[{iso}] Clicking the Share/Export menu...")
            share_btn = page.locator('[data-qa-id="heatmap-top-bar_share"]')
            await share_btn.click(force=True, timeout=5000)
            await asyncio.sleep(2)
            
            print(f"[{iso}] Clicking 'Download image'...")
            async with page.expect_download(timeout=15000) as download_info:
                download_btn = page.locator('[data-qa-id="heatmap-top-bar_share_download_snapshot"]')
                await download_btn.click(force=True, timeout=5000)
            
            download = await download_info.value
            out_path = f"assets/cache_png/{iso}.png"
            await download.save_as(out_path)
            print(f"[{iso}] Successfully saved to {out_path}!")

        except Exception as e:
            print(f"[{iso}] Failed to process {iso}:", e)
            
        # Close context to clean up memory
        await context.close()

async def run_async():
    print("Starting async Playwright...")
    os.makedirs('assets/cache_png', exist_ok=True)
    
    with open('assets/geo/market_chosen.json', encoding='utf-8') as f:
        chosen_markets = json.load(f)
        
    with open('assets/geo/markets.json', encoding='utf-8') as f:
        raw_markets = json.load(f)
        
    with open('assets/geo/holidays.json', encoding='utf-8') as f:
        holidays = json.load(f)
        
    market_details = { m['iso']: m for m in raw_markets }
        
    # Create semaphore for max 5 concurrent tabs
    semaphore = asyncio.Semaphore(5)
        
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        tasks = []
        for market in chosen_markets:
            task = asyncio.create_task(process_market(market, browser, market_details, holidays, semaphore))
            tasks.append(task)
            
        # Wait for all tasks to complete
        if tasks:
            await asyncio.gather(*tasks)
            
        await browser.close()

def run():
    asyncio.run(run_async())

if __name__ == '__main__':
    run()
