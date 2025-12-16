#!/usr/bin/env python3
"""
物件情報のメール通知スクリプト
"""

import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

DATA_FILE = 'data/property_history.json'


def load_latest_data():
    """最新のデータを読み込み"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            history = json.load(f)
            if history:
                return history[-1]
    return None


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


def create_email_content(data: dict) -> str:
    """メール本文を作成"""
    timestamp = data.get('timestamp', '')
    date_str = data.get('date', '')
    time_str = data.get('time', '')
    properties = data.get('properties', [])
    
    # 26年3月入居の合計
    march_count = count_march_2026(properties)
    
    lines = [
        "=" * 50,
        "🏠 SUUMO 物件情報 日報",
        "=" * 50,
        f"取得日時: {date_str} {time_str}",
        "",
    ]
    
    # 26年3月入居があれば強調
    if march_count > 0:
        lines.extend([
            "★" * 25,
            f"🌸 26年3月入居: {march_count}件 あり！",
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
    print(f"メール通知開始: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 送信先メールアドレス
    to_email = os.environ.get('NOTIFICATION_EMAIL', 'clays7614@gmail.com')
    
    # 最新データを読み込み
    data = load_latest_data()
    if not data:
        print("データがありません")
        return 1
    
    # メール本文を作成
    body = create_email_content(data)
    
    # 26年3月入居の件数を件名に含める
    march_count = count_march_2026(data.get('properties', []))
    date_str = data.get('date', datetime.now().strftime('%Y-%m-%d'))
    
    if march_count > 0:
        subject = f"🌸【26年3月入居{march_count}件】SUUMO物件情報 {date_str}"
    else:
        subject = f"🏠 SUUMO物件情報 {date_str}"
    
    # メール送信
    success = send_email(subject, body, to_email)
    
    print(f"メール通知終了: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    return 0 if success else 1


if __name__ == '__main__':
    exit(main())
