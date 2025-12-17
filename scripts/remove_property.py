#!/usr/bin/env python3
"""
物件を削除するスクリプト
"""

import re
import sys
import os


def remove_property(property_identifier: str) -> bool:
    """
    fetch_suumo_playwright.pyのPROPERTIESリストから物件を削除
    
    Args:
        property_identifier: 物件IDまたは物件名
        
    Returns:
        bool: 成功した場合True
    """
    print(f"物件を削除: {property_identifier}")
    
    # fetch_suumo_playwright.py を読み込み
    script_path = 'scripts/fetch_suumo_playwright.py'
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # まず物件名で検索
    property_by_name_pattern = re.compile(
        r"    \{\s*\n"
        r"        'id': '(.*?)',\s*\n"
        r"        'name': '" + re.escape(property_identifier) + r"',\s*\n"
        r"        'url': '.*?'\s*\n"
        r"    \},?\s*\n",
        re.MULTILINE
    )
    
    match = property_by_name_pattern.search(content)
    
    # 物件名で見つからない場合、IDで検索
    if not match:
        property_by_id_pattern = re.compile(
            r"    \{\s*\n"
            r"        'id': '" + re.escape(property_identifier) + r"',\s*\n"
            r"        'name': '(.*?)',\s*\n"
            r"        'url': '.*?'\s*\n"
            r"    \},?\s*\n",
            re.MULTILINE
        )
        match = property_by_id_pattern.search(content)
    
    if not match:
        print(f"エラー: 物件 '{property_identifier}' が見つかりませんでした")
        print("物件名またはIDが正確であることを確認してください")
        return False
    
    # 物件情報を表示
    property_id = re.search(r"'id': '(.*?)'", match.group(0))
    property_name = re.search(r"'name': '(.*?)'", match.group(0))
    if property_id and property_name:
        print(f"削除する物件: {property_name.group(1)} (ID: {property_id.group(1)})")
    
    # 物件エントリを削除
    new_content = content.replace(match.group(0), '')
    
    # ファイルに書き込み
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"物件を削除しました")
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
    property_identifier = os.environ.get('PROPERTY_IDENTIFIER', '')
    
    if not property_identifier:
        print("エラー: PROPERTY_IDENTIFIERの環境変数が必要です")
        print("\n現在登録されている物件:")
        properties = list_properties()
        for prop in properties:
            print(f"  - 物件名: {prop['name']}")
            print(f"    ID: {prop['id']}")
            print()
        return 1
    
    success = remove_property(property_identifier)
    return 0 if success else 1


if __name__ == '__main__':
    exit(main())
