export enum ProviderKey {
	AIHubMix = 'aihubmix',
	Aimlapi = 'aimlapi',
	Apertis = 'apertis',
	Baseten = 'baseten',
	Berget = 'berget',
	Blackbox = 'blackbox',
	ChatJimmy = 'chatjimmy',
	Chutes = 'chutes',
	Clarifai = 'clarifai',
	Cline = 'cline',
	Codex = 'codex',
	Commonstack = 'commonstack',
	Compatible = 'compatible',
	Cortecs = 'cortecs',
	Crof = 'crof',
	Dashscope = 'dashscope',
	DeepInfra = 'deepinfra',
	DeepSeek = 'deepseek',
	Dialagram = 'dialagram',
	Dinference = 'dinference',
	Edenai = 'edenai',
	Fastrouter = 'fastrouter',
	Fireworks = 'fireworks',
	Friendli = 'friendli',
	Helicone = 'helicone',
	Hicapai = 'hicapai',
	Huggingface = 'huggingface',
	Jiekou = 'jiekou',
	Kilo = 'kilo',
	Kimi = 'kimi',
	Knox = 'knox',
	LightningAI = 'lightningai',
	Llmgateway = 'llmgateway',
	Meganova = 'meganova',
	MiniMax = 'minimax',
	MiniMaxCoding = 'minimax-coding',
	Mistral = 'mistral',
	Moark = 'moark',
	Modal = 'modal',
	ModelScope = 'modelscope',
	Moonshot = 'moonshot',
	Nanogpt = 'nanogpt',
	Nvidia = 'nvidia',
	Ofox = 'ofox',
	Ollama = 'ollama',
	OpenAI = 'openai',
	OpenCode = 'opencode',
	Opencodego = 'opencodego',
	Pollinations = 'pollinations',
	Portkey = 'portkey',
	Puter = 'puter',
	QwenCli = 'qwencli',
	Requesty = 'requesty',
	Routingrun = 'routingrun',
	Seraphyn = 'seraphyn',
	Sherlock = 'sherlock',
	Vercelai = 'vercelai',
	Zenmux = 'zenmux',
	Zhipu = 'zhipu',
}

/**
 * Provider category for unified settings organization
 */
export enum ProviderCategory {
	OpenAI = 'openai',
	Anthropic = 'anthropic',
	OAuth = 'oauth',
}

/**
 * Provider feature flags used by unified settings UI
 */
export interface ProviderFeatureFlags {
	supportsApiKey: boolean;
	supportsOAuth: boolean;
	supportsMultiAccount: boolean;
	supportsConfigWizard: boolean;
}

/**
 * Provider metadata for unified settings and configuration wizard
 */
export interface ProviderMetadata {
	id: string;
	key?: ProviderKey;
	displayName: string;
	category: ProviderCategory;
	sdkMode?: 'openai' | 'anthropic' | 'oai-response' | 'mixed';
	description?: string;
	icon?: string;
	settingsPrefix?: string;
	baseUrl?: string;
	features: ProviderFeatureFlags;
	order: number;
}
