#!/usr/bin/env python3
"""
SUUMOから物件情報を取得するスクリプト（Playwright版）
"""

import json
import re
import os
import asyncio
from datetime import datetime, timezone, timedelta
from playwright.async_api import async_playwright

# 日本標準時 (JST = UTC+9)
JST = timezone(timedelta(hours=9))

def get_jst_now():
    """JSTの現在時刻を取得"""
    return datetime.now(JST)

# 監視対象の物件
PROPERTIES = [
    {
        'id': 'esreed_grande',
        'name': 'エスリードレジデンス大阪弁天町',
        'url': 'https://suumo.jp/library/tf_27/sc_27107/to_1002461672/'
    },
    {
        'id': 'esreed_glanz',
        'name': 'エスリード弁天町グランツ',
        'url': 'https://suumo.jp/library/tf_27/sc_27107/to_1002440443/'
    },
    {
        'id': 'forearize_cross',
        'name': 'フォーリアライズ弁天町クロス',
        'url': 'https://suumo.jp/library/tf_27/sc_27107/to_1002426103/'
    }
]

DATA_FILE = 'data/property_history.json'


async def fetch_property_data(page, property_info: dict) -> dict:
    """物件データを取得"""
    print(f"取得中: {property_info['name']}")
    
    try:
        await page.goto(property_info['url'], wait_until='networkidle', timeout=60000)
        await page.wait_for_timeout(3000)
        
        # 物件数を取得
        count = 0
        try:
            count_elem = await page.query_selector('span.fgOrange.bld')
            if count_elem:
                count_text = await count_elem.inner_text()
                count = int(count_text.strip())
        except:
            pass
        
        # 「もっと見る」を全て展開
        clicked_buttons = set()
        while len(clicked_buttons) < 20:
            await page.wait_for_timeout(500)
            more_buttons = await page.query_selector_all('a:has-text("もっと見る")')
            unclicked = []
            for btn in more_buttons:
                try:
                    if await btn.is_visible():
                        box = await btn.bounding_box()
                        if box:
                            btn_id = f"{box['x']:.0f},{box['y']:.0f}"
                            if btn_id not in clicked_buttons:
                                unclicked.append((btn, btn_id))
                except:
                    continue
            
            if not unclicked:
                break
            
            btn, btn_id = unclicked[0]
            try:
                await btn.scroll_into_view_if_needed()
                await btn.click()
                clicked_buttons.add(btn_id)
                await page.wait_for_timeout(1500)
            except:
                break
        
        await page.wait_for_timeout(2000)
        html = await page.content()
        move_in_breakdown = parse_move_in_dates(html)
        
        print(f"  物件数: {count}, 入居時期データ: {sum(move_in_breakdown.values())}")
        
        return {
            'id': property_info['id'],
            'name': property_info['name'],
            'url': property_info['url'],
            'count': count,
            'moveInBreakdown': move_in_breakdown,
            'success': True
        }
        
    except Exception as e:
        print(f"  エラー: {e}")
        return {
            'id': property_info['id'],
            'name': property_info['name'],
            'url': property_info['url'],
            'count': 0,
            'moveInBreakdown': {},
            'success': False,
            'error': str(e)
        }


def parse_move_in_dates(html: str) -> dict:
    """HTMLから入居時期の内訳を抽出"""
    breakdown = {}
    
    # 全てのtdセルを取得して入居時期を探す
    all_cells = re.findall(r'<td[^>]*>(.*?)</td>', html, re.DOTALL | re.IGNORECASE)
    
    for cell in all_cells:
        text = re.sub(r'<[^>]+>', '', cell).strip()
        text = re.sub(r'\s+', '', text)
        
        if text in ['即入居可', '即']:
            breakdown['即入居可'] = breakdown.get('即入居可', 0) + 1
        elif text == '相談':
            breakdown['相談'] = breakdown.get('相談', 0) + 1
        else:
            date_match = re.match(r"'?(\d{2})年(\d{1,2})月([上中下]旬)?$", text)
            if date_match:
                year, month, period = date_match.groups()
                if period:
                    key = f"{year}年{month}月{period}"
                else:
                    key = f"{year}年{month}月"
                breakdown[key] = breakdown.get(key, 0) + 1
    
    return breakdown


def load_history() -> list:
    """履歴データを読み込み"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return []


def save_history(history: list):
    """履歴データを保存"""
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


async def main():
    """メイン処理"""
    print(f"開始: {get_jst_now().strftime('%Y-%m-%d %H:%M:%S')} JST")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        )
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()
        
        properties_data = []
        for prop in PROPERTIES:
            data = await fetch_property_data(page, prop)
            properties_data.append(data)
        
        await browser.close()
    
    successful = [p for p in properties_data if p.get('success')]
    
    if successful:
        now = get_jst_now()
        entry = {
            'timestamp': now.isoformat(),
            'date': now.strftime('%Y-%m-%d'),
            'time': now.strftime('%H:%M:%S'),
            'properties': properties_data
        }
        
        history = load_history()
        history.append(entry)
        
        if len(history) > 200:
            history = history[-200:]
        
        save_history(history)
        print(f"保存完了: {len(successful)}/{len(PROPERTIES)} 物件")
    else:
        print("データ取得失敗")
    
    print(f"終了: {get_jst_now().strftime('%Y-%m-%d %H:%M:%S')} JST")
    return 0 if successful else 1


if __name__ == '__main__':
    exit(asyncio.run(main()))
