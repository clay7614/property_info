import { loadProperties, saveProperties, Property } from './common';

function addProperty(propertyName: string, propertyUrl: string): boolean {
    console.log(`物件を追加: ${propertyName}`);
    console.log(`URL: ${propertyUrl}`);

    // URLからIDを生成
    // 例: https://suumo.jp/library/tf_27/sc_27107/to_000000000/
    const urlMatch = propertyUrl.match(/\/to_(\d+)\/?$/);
    let propertyId = "";
    if (urlMatch) {
        propertyId = `property_${urlMatch[1]}`;
    } else {
        console.error(`エラー: URLからプロパティIDを抽出できませんでした: ${propertyUrl}`);
        console.error(`期待されるURL形式: https://suumo.jp/library/.../to_XXXXXXXXXX/`);
        console.error(`有効なSUUMO物件URLを指定してください`);
        return false;
    }

    console.log(`生成されたID: ${propertyId}`);

    const properties = loadProperties();

    if (properties.some(p => p.id === propertyId)) {
        console.error(`物件ID '${propertyId}' は既に存在します`);
        return false;
    }

    const newProperty: Property = {
        id: propertyId,
        name: propertyName,
        url: propertyUrl
    };

    properties.push(newProperty);

    if (saveProperties(properties)) {
        console.log(`物件を追加しました: ${propertyName} (ID: ${propertyId})`);
        return true;
    } else {
        return false;
    }
}

function main() {
    const propertyName = process.env.PROPERTY_NAME || '';
    const propertyUrl = process.env.PROPERTY_URL || '';

    if (!propertyName || !propertyUrl) {
        console.error("エラー: PROPERTY_NAMEとPROPERTY_URLの環境変数が必要です");
        process.exit(1);
    }

    const success = addProperty(propertyName, propertyUrl);
    process.exit(success ? 0 : 1);
}

main();
