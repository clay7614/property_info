#!/usr/bin/env python3
"""
物件情報の変更通知メールスクリプト
"""

import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

DATA_FILE = 'data/property_history.json'


def load_history():
    """履歴データを読み込み"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            history = json.load(f)
            return history if history else []
    return []


def load_latest_data():
    """最新のデータを読み込み"""
    history = load_history()
    if history:
        return history[-1]
    return None


def load_previous_data():
    """前回のデータを読み込み"""
    history = load_history()
    if len(history) >= 2:
        return history[-2]
    return None


def detect_changes(current_properties, previous_properties):
    """物件情報の変更を検出"""
    if not previous_properties:
        return None
    
    changes = []
    
    for current in current_properties:
        prev = next((p for p in previous_properties if p['id'] == current['id']), None)
        if not prev:
            continue
        
        # 物件数の変化
        if current.get('count', 0) != prev.get('count', 0):
            diff = current.get('count', 0) - prev.get('count', 0)
            direction = '増加' if diff > 0 else '減少'
            changes.append({
                'property': current['name'],
                'type': 'count',
                'message': f"物件数: {prev.get('count', 0)}件 → {current.get('count', 0)}件 ({abs(diff)}件{direction})"
            })
        
        # 入居時期の変化をチェック
        current_breakdown = current.get('moveInBreakdown', {})
        prev_breakdown = prev.get('moveInBreakdown', {})
        
        all_keys = set(current_breakdown.keys()) | set(prev_breakdown.keys())
        for key in all_keys:
            curr_count = current_breakdown.get(key, 0)
            prev_count = prev_breakdown.get(key, 0)
            if curr_count != prev_count:
                diff = curr_count - prev_count
                direction = '増加' if diff > 0 else '減少'
                is_march_2026 = '26年3月' in key
                changes.append({
                    'property': current['name'],
                    'type': 'move_in',
                    'key': key,
                    'is_march_2026': is_march_2026,
                    'message': f"{key}: {prev_count}件 → {curr_count}件 ({abs(diff)}件{direction})"
                })
    
    return changes if changes else None


def format_move_in_breakdown(breakdown: dict) -> str:
    """入居時期の内訳をフォーマット"""
    if not breakdown:
        return "データなし"
    
    # 26年3月を優先的に表示
    march_2026 = []
    immediate = []
    other = []
    
    for key, count in breakdown.items():
        if key == '即入居可':
            immediate.append(f"  ⚡ {key}: {count}件")
        elif '26年3月' in key:
            march_2026.append(f"  🌸 {key}: {count}件")
        else:
            other.append(f"  • {key}: {count}件")
    
    result = []
    if march_2026:
        result.append("  【26年3月入居 ★注目★】")
        result.extend(sorted(march_2026))
    if immediate:
        result.append("  【即入居可】")
        result.extend(immediate)
    if other:
        result.append("  【その他】")
        result.extend(sorted(other))
    
    return '\n'.join(result)


def count_march_2026(properties: list) -> int:
    """26年3月入居の合計を計算"""
    total = 0
    for prop in properties:
        breakdown = prop.get('moveInBreakdown', {})
        for key, count in breakdown.items():
            if '26年3月' in key:
                total += count
    return total


def create_email_content(data: dict, changes: list) -> str:
    """メール本文を作成"""
    timestamp = data.get('timestamp', '')
    date_str = data.get('date', '')
    time_str = data.get('time', '')
    properties = data.get('properties', [])
    
    # 26年3月入居の合計
    march_count = count_march_2026(properties)
    
    # 26年3月入居の変更があるかチェック
    has_march_2026_change = any(c.get('is_march_2026') for c in (changes or []))
    
    lines = [
        "=" * 50,
        "🏠 SUUMO 物件情報 変更通知",
        "=" * 50,
        f"検出日時: {date_str} {time_str}",
        "",
    ]
    
    # 変更内容を表示
    if changes:
        lines.extend([
            "📢 変更内容:",
            "-" * 40,
        ])
        
        # 物件ごとに変更をまとめる
        changes_by_property = {}
        for change in changes:
            prop_name = change['property']
            if prop_name not in changes_by_property:
                changes_by_property[prop_name] = []
            changes_by_property[prop_name].append(change)
        
        for prop_name, prop_changes in changes_by_property.items():
            lines.append(f"📍 {prop_name}")
            for change in prop_changes:
                if change.get('is_march_2026'):
                    lines.append(f"  🌸 {change['message']} ★注目★")
                else:
                    lines.append(f"  • {change['message']}")
            lines.append("")
        
        lines.append("-" * 40)
        lines.append("")
    
    # 26年3月入居があれば強調
    if march_count > 0:
        lines.extend([
            "★" * 25,
            f"🌸 26年3月入居: 現在{march_count}件",
            "★" * 25,
            "",
        ])
    
    # 各物件の情報
    total_count = 0
    for prop in properties:
        name = prop.get('name', '不明')
        count = prop.get('count', 0)
        url = prop.get('url', '')
        breakdown = prop.get('moveInBreakdown', {})
        success = prop.get('success', False)
        
        total_count += count
        
        lines.append("-" * 40)
        lines.append(f"📍 {name}")
        lines.append(f"   空室数: {count}件")
        
        if breakdown:
            lines.append("   入居時期:")
            lines.append(format_move_in_breakdown(breakdown))
        
        lines.append(f"   URL: {url}")
        lines.append("")
    
    lines.extend([
        "=" * 50,
        f"合計空室数: {total_count}件",
        "=" * 50,
        "",
        "このメールは自動送信されています。",
        "詳細はWebサイトをご確認ください。",
    ])
    
    return '\n'.join(lines)


def send_email(subject: str, body: str, to_email: str):
    """メールを送信"""
    smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    from_email = os.environ.get('FROM_EMAIL', smtp_user)
    
    if not smtp_user or not smtp_password:
        print("SMTP認証情報が設定されていません")
        return False
    
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain', 'utf-8'))
    
    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        print(f"メール送信成功: {to_email}")
        return True
    except Exception as e:
        print(f"メール送信失敗: {e}")
        return False


def main():
    """メイン処理"""
    print(f"変更通知メール開始: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 送信先メールアドレス
    to_email = os.environ.get('NOTIFICATION_EMAIL', 'clays7614@gmail.com')
    
    # 最新データと前回データを読み込み
    data = load_latest_data()
    if not data:
        print("データがありません")
        return 1
    
    previous_data = load_previous_data()
    
    # 変更を検出
    changes = None
    if previous_data:
        changes = detect_changes(
            data.get('properties', []),
            previous_data.get('properties', [])
        )
    
    if not changes:
        print("物件情報に変更がありません")
        # 変更がなくても手動実行の場合は送信（環境変数で制御）
        if os.environ.get('FORCE_SEND') != 'true':
            return 0
        print("FORCE_SEND=true のため送信を継続します")
    
    # メール本文を作成
    body = create_email_content(data, changes)
    
    # 件名を作成
    march_count = count_march_2026(data.get('properties', []))
    date_str = data.get('date', datetime.now().strftime('%Y-%m-%d'))
    time_str = data.get('time', datetime.now().strftime('%H:%M'))
    
    # 26年3月入居の変更があるかチェック
    has_march_2026_change = any(c.get('is_march_2026') for c in (changes or []))
    
    if has_march_2026_change:
        subject = f"🌸【26年3月入居に変更あり】SUUMO物件情報 {date_str} {time_str}"
    elif march_count > 0:
        subject = f"📢【物件情報更新】SUUMO {date_str} {time_str} (26年3月: {march_count}件)"
    else:
        subject = f"📢【物件情報更新】SUUMO {date_str} {time_str}"
    
    # メール送信
    success = send_email(subject, body, to_email)
    
    print(f"変更通知メール終了: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    return 0 if success else 1


if __name__ == '__main__':
    exit(main())
