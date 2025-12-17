#!/usr/bin/env python3
"""
物件を削除するスクリプト
"""

import json
import sys
import os
from common import load_properties, save_properties


def remove_property(property_identifier: str) -> bool:
    """
    properties.jsonから物件を削除
    
    Args:
        property_identifier: 物件IDまたは物件名
        
    Returns:
        bool: 成功した場合True
    """
    print(f"物件を削除: {property_identifier}")
    
    properties = load_properties()
    
    # 物件名またはIDで検索
    target_property = None
    for prop in properties:
        if prop['name'] == property_identifier or prop['id'] == property_identifier:
            target_property = prop
            break
    
    if not target_property:
        print(f"エラー: 物件 '{property_identifier}' が見つかりませんでした")
        print("物件名またはIDが正確であることを確認してください")
        return False
    
    print(f"削除する物件: {target_property['name']} (ID: {target_property['id']})")
    
    # リストから削除
    properties.remove(target_property)
    
    # 保存
    if save_properties(properties):
        print(f"物件を削除しました")
        return True
    else:
        return False


def list_properties() -> list:
    """
    現在登録されている物件リストを取得
    
    Returns:
        list: 物件情報のリスト
    """
    return load_properties()


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
