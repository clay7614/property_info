import { loadProperties, saveProperties } from './common';

function removeProperty(propertyIdentifier: string): boolean {
    console.log(`物件を削除: ${propertyIdentifier}`);

    const properties = loadProperties();

    const targetIndex = properties.findIndex(p => p.name === propertyIdentifier || p.id === propertyIdentifier);

    if (targetIndex === -1) {
        console.error(`エラー: 物件 '${propertyIdentifier}' が見つかりませんでした`);
        console.error("物件名またはIDが正確であることを確認してください");
        return false;
    }

    const targetProperty = properties[targetIndex];
    console.log(`削除する物件: ${targetProperty.name} (ID: ${targetProperty.id})`);

    properties.splice(targetIndex, 1);

    if (saveProperties(properties)) {
        console.log("物件を削除しました");
        return true;
    } else {
        return false;
    }
}

function listProperties() {
    return loadProperties();
}

function main() {
    const propertyIdentifier = process.env.PROPERTY_IDENTIFIER || '';

    if (!propertyIdentifier) {
        console.error("エラー: PROPERTY_IDENTIFIERの環境変数が必要です");
        console.log("\n現在登録されている物件:");
        const properties = listProperties();
        for (const prop of properties) {
            console.log(`  - 物件名: ${prop.name}`);
            console.log(`    ID: ${prop.id}`);
            console.log();
        }
        process.exit(1);
    }

    const success = removeProperty(propertyIdentifier);
    process.exit(success ? 0 : 1);
}

main();
