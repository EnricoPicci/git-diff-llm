export type AppConfig = {
    isTest: boolean,
}

const _defaultConfig: AppConfig = {
    isTest: false,
}

export function getConfig() {
    return _defaultConfig
}