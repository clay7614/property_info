#!/usr/bin/env python3
"""
物件を削除するスクリプト
"""

import re
import sys
import os


def remove_property(property_id: str) -> bool:
    """
    fetch_suumo_playwright.pyのPROPERTIESリストから物件を削除
    
    Args:
        property_id: 物件ID
        
    Returns:
        bool: 成功した場合True
    """
    print(f"物件を削除: {property_id}")
    
    # fetch_suumo_playwright.py を読み込み
    script_path = 'scripts/fetch_suumo_playwright.py'
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 該当する物件エントリを検索
    property_pattern = re.compile(
        r"    \{\s*\n"
        r"        'id': '" + re.escape(property_id) + r"',\s*\n"
        r"        'name': '.*?',\s*\n"
        r"        'url': '.*?'\s*\n"
        r"    \},?\s*\n",
        re.MULTILINE
    )
    
    match = property_pattern.search(content)
    if not match:
        print(f"エラー: 物件ID '{property_id}' が見つかりませんでした")
        return False
    
    property_name = re.search(r"'name': '(.*?)'", match.group(0))
    if property_name:
        print(f"削除する物件: {property_name.group(1)}")
    
    # 物件エントリを削除
    new_content = property_pattern.sub('', content)
    
    # ファイルに書き込み
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"物件を削除しました: {property_id}")
    return True


def list_properties() -> list:
    """
    現在登録されている物件リストを取得
    
    Returns:
        list: 物件情報のリスト
    """
    script_path = 'scripts/fetch_suumo_playwright.py'
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # PROPERTIESリストから物件を抽出
    properties = []
    property_pattern = re.compile(
        r"    \{\s*\n"
        r"        'id': '(.*?)',\s*\n"
        r"        'name': '(.*?)',\s*\n"
        r"        'url': '(.*?)'\s*\n"
        r"    \}",
        re.MULTILINE
    )
    
    for match in property_pattern.finditer(content):
        properties.append({
            'id': match.group(1),
            'name': match.group(2),
            'url': match.group(3)
        })
    
    return properties


def main():
    """メイン処理"""
    # 環境変数から入力を取得
    property_id = os.environ.get('PROPERTY_ID', '')
    
    if not property_id:
        print("エラー: PROPERTY_IDの環境変数が必要です")
        print("\n現在登録されている物件:")
        properties = list_properties()
        for prop in properties:
            print(f"  - {prop['id']}: {prop['name']}")
        return 1
    
    success = remove_property(property_id)
    return 0 if success else 1


if __name__ == '__main__':
    exit(main())
