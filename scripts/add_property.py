#!/usr/bin/env python3
"""
物件を追加するスクリプト
"""

import json
import re
import sys
import os
from common import load_properties, save_properties


def add_property(property_name: str, property_url: str) -> bool:
    """
    properties.jsonに物件を追加
    
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
    
    # properties.jsonを読み込み
    properties = load_properties()
    
    # 既に同じIDが存在するかチェック
    if any(p['id'] == property_id for p in properties):
        print(f"物件ID '{property_id}' は既に存在します")
        return False
    
    # 新しい物件エントリを作成
    new_property = {
        'id': property_id,
        'name': property_name,
        'url': property_url
    }
    
    # リストに追加
    properties.append(new_property)
    
    # 保存
    if save_properties(properties):
        print(f"物件を追加しました: {property_name} (ID: {property_id})")
        return True
    else:
        return False


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
