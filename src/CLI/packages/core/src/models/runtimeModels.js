/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import { createDebugLogger } from '../utils/debugLogger.js';
const debugLogger = createDebugLogger('RUNTIME_MODELS');
function getByPath(value, path) {
    if (!path) {
        return value;
    }
    let current = value;
    for (const segment of path.split('.')) {
        if (current === null ||
            typeof current !== 'object' ||
            !(segment in current)) {
            return undefined;
        }
        current = current[segment];
    }
    return current;
}
function toStringValue(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function toNumberValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return undefined;
}
function normalizeModelList(input, parser) {
    const sourceArray = Array.isArray(input)
        ? input
        : getByPath(input, parser?.arrayPath || 'data');
    if (!Array.isArray(sourceArray)) {
        return [];
    }
    const parsedModels = [];
    for (const candidate of sourceArray) {
        if (candidate === null || typeof candidate !== 'object') {
            continue;
        }
        if (parser?.filterField && parser?.filterValue !== undefined) {
            const filterValue = getByPath(candidate, parser.filterField);
            if (String(filterValue ?? '') !== parser.filterValue) {
                continue;
            }
        }
        const idField = parser?.idField || 'id';
        const nameField = parser?.nameField || 'name';
        const descriptionField = parser?.descriptionField || 'description';
        const contextLengthField = parser?.contextLengthField;
        const tagsField = parser?.tagsField;
        const id = toStringValue(getByPath(candidate, idField));
        if (!id) {
            continue;
        }
        const name = toStringValue(getByPath(candidate, nameField));
        const description = toStringValue(getByPath(candidate, descriptionField));
        const contextWindowSize = contextLengthField
            ? toNumberValue(getByPath(candidate, contextLengthField))
            : undefined;
        const rawTags = tagsField ? getByPath(candidate, tagsField) : undefined;
        const tags = Array.isArray(rawTags)
            ? rawTags.flatMap((tag) => (typeof tag === 'string' ? [tag] : []))
            : undefined;
        parsedModels.push({
            id,
            name,
            description,
            contextWindowSize,
            tags
        });
    }
    return parsedModels;
}
function resolveModelsEndpoint(baseUrl, modelsEndpoint) {
    if (!modelsEndpoint) {
        return `${baseUrl.replace(/\/$/, '')}/models`;
    }
    if (/^https?:\/\//i.test(modelsEndpoint)) {
        return modelsEndpoint;
    }
    return `${baseUrl.replace(/\/$/, '')}${modelsEndpoint.startsWith('/') ? '' : '/'}${modelsEndpoint}`;
}
function resolveApiKey(model, env, fallbackApiKey) {
    const directKey = model.apiKey?.trim();
    if (directKey) {
        return directKey;
    }
    if (model.envKey) {
        const envKey = env[model.envKey]?.trim();
        if (envKey) {
            return envKey;
        }
    }
    return fallbackApiKey?.trim() || undefined;
}
async function fetchRuntimeModelsForConfig(authType, model, env, fallbackApiKey) {
    if (!model.fetchModels) {
        return [];
    }
    const baseUrl = model.baseUrl?.trim();
    if (!baseUrl) {
        debugLogger.warn(`Skipping runtime model discovery for authType "${authType}" model "${model.id}" because baseUrl is missing.`);
        return [];
    }
    const url = resolveModelsEndpoint(baseUrl, model.modelsEndpoint);
    const headers = {
        Accept: 'application/json',
        ...(model.customHeader || {})
    };
    const apiKey = resolveApiKey(model, env, fallbackApiKey);
    if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
    }
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) {
            debugLogger.warn(`Runtime model discovery for authType "${authType}" model "${model.id}" returned HTTP ${response.status}.`);
            return [];
        }
        const payload = (await response.json());
        const parsedModels = normalizeModelList(payload, model.modelParser);
        return parsedModels.map((runtimeModel) => ({
            ...model,
            id: runtimeModel.id,
            name: runtimeModel.name || runtimeModel.id,
            description: runtimeModel.description || model.description,
            model: runtimeModel.id,
            fetchModels: false,
            modelsEndpoint: undefined,
            modelParser: undefined,
            apiKey: model.apiKey || fallbackApiKey,
            generationConfig: {
                ...(model.generationConfig || {}),
                ...(runtimeModel.contextWindowSize !== undefined
                    ? { contextWindowSize: runtimeModel.contextWindowSize }
                    : {})
            }
        }));
    }
    catch (error) {
        debugLogger.warn(`Failed to discover runtime models for authType "${authType}" model "${model.id}":`, error);
        return [];
    }
}
export async function discoverRuntimeModelProviders(modelProvidersConfig, env, fallbackApiKey) {
    if (!modelProvidersConfig) {
        return undefined;
    }
    const discoveredEntries = await Promise.all(Object.entries(modelProvidersConfig).map(async ([authType, models]) => {
        const runtimeModels = [];
        for (const model of models) {
            if (model.fetchModels) {
                const fetchedModels = await fetchRuntimeModelsForConfig(authType, model, env, fallbackApiKey);
                runtimeModels.push(...fetchedModels);
            }
        }
        return [authType, runtimeModels];
    }));
    const discovered = {};
    for (const [authType, models] of discoveredEntries) {
        if (models.length > 0) {
            discovered[authType] = models;
        }
    }
    return Object.keys(discovered).length > 0 ? discovered : undefined;
}
//# sourceMappingURL=runtimeModels.js.map