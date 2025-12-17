#!/usr/bin/env python3
"""
物件を追加するスクリプト
"""

import re
import sys
import os


def add_property(property_name: str, property_url: str) -> bool:
    """
    fetch_suumo_playwright.pyのPROPERTIESリストに物件を追加
    
    Args:
        property_name: 物件名
        property_url: 物件URL
        
    Returns:
        bool: 成功した場合True
    """
    print(f"物件を追加: {property_name}")
    print(f"URL: {property_url}")
    
    # URLからIDを生成
    url_match = re.search(r'/to_(\d+)/?$', property_url)
    if url_match:
        property_id = f"property_{url_match.group(1)}"
    else:
        print(f"エラー: URLからプロパティIDを抽出できませんでした: {property_url}")
        print(f"期待されるURL形式: https://suumo.jp/library/.../to_XXXXXXXXXX/")
        print(f"有効なSUUMO物件URLを指定してください")
        return False
    
    print(f"生成されたID: {property_id}")
    
    # fetch_suumo_playwright.py を読み込み
    script_path = 'scripts/fetch_suumo_playwright.py'
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 既に同じIDが存在するかチェック
    if f"'id': '{property_id}'" in content:
        print(f"物件ID '{property_id}' は既に存在します")
        return False
    
    # PROPERTIESリストの最後の項目を見つける
    properties_match = re.search(
        r'(PROPERTIES = \[.*?\n)((?:.*?\n)*?)(\])',
        content,
        re.DOTALL
    )
    
    if not properties_match:
        print("エラー: PROPERTIESリストが見つかりませんでした")
        return False
    
    # 新しい物件エントリを作成
    new_property_lines = [
        "    {",
        f"        'id': '{property_id}',",
        f"        'name': '{property_name}',",
        f"        'url': '{property_url}'",
        "    },",
    ]
    new_property = '\n'.join(new_property_lines) + '\n'
    
    # PROPERTIESリストを更新
    before = properties_match.group(1)
    existing_props = properties_match.group(2)
    after = properties_match.group(3)
    
    new_content = content.replace(
        properties_match.group(0),
        before + existing_props + new_property + after
    )
    
    # ファイルに書き込み
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"物件を追加しました: {property_name} (ID: {property_id})")
    return True


def main():
    """メイン処理"""
    # 環境変数から入力を取得
    property_name = os.environ.get('PROPERTY_NAME', '')
    property_url = os.environ.get('PROPERTY_URL', '')
    
    if not property_name or not property_url:
        print("エラー: PROPERTY_NAMEとPROPERTY_URLの環境変数が必要です")
        return 1
    
    success = add_property(property_name, property_url)
    return 0 if success else 1


if __name__ == '__main__':
    exit(main())
