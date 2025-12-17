#!/usr/bin/env python3
"""
各スクリプト間の共通処理
"""

import json
import os

PROPERTIES_FILE = 'data/properties.json'
HISTORY_FILE = 'data/property_history.json'


def load_properties() -> list:
    """properties.jsonから物件リストを読み込み"""
    if os.path.exists(PROPERTIES_FILE):
        try:
            with open(PROPERTIES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"エラー: {PROPERTIES_FILE} の読み込みに失敗しました: {e}")
            return []
    else:
        print(f"エラー: {PROPERTIES_FILE} が見つかりません")
        return []


def save_properties(properties: list) -> bool:
    """properties.jsonに物件リストを保存"""
    try:
        os.makedirs(os.path.dirname(PROPERTIES_FILE), exist_ok=True)
        with open(PROPERTIES_FILE, 'w', encoding='utf-8') as f:
            json.dump(properties, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"エラー: {PROPERTIES_FILE} への書き込みに失敗しました: {e}")
        return False


def load_history() -> list:
    """履歴データを読み込み"""
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"エラー: {HISTORY_FILE} の読み込みに失敗しました: {e}")
            return []
    return []


def save_history(history: list) -> bool:
    """履歴データを保存"""
    try:
        os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"エラー: {HISTORY_FILE} への書き込みに失敗しました: {e}")
        return False
