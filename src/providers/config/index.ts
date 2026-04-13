import type { ProviderConfig } from '../../types/sharedTypes';
import aihubmix from './aihubmix.json';
import apertis from './apertis.json';
import avaSupernova from './ava-supernova.json';
import blackbox from './blackbox.json';
import fastrouter from './fastrouter.json';
import chatjimmy from './chatjimmy.json';
import chutes from './chutes.json';
import codex from './codex.json';
import deepinfra from './deepinfra.json';
import deepseek from './deepseek.json';
import huggingface from './huggingface.json';
import kilo from './kilo.json';
import knox from './knox.json';
import lightningai from './lightningai.json';
import llmgateway from './llmgateway.json';
import minimax from './minimax.json';
import mistral from './mistral.json';
import modelscope from './modelscope.json';
import moonshot from './moonshot.json';
import nanogpt from './nanogpt.json';
import modal from './modal.json';
import baseten from './baseten.json';
import berget from './berget.json';
import clarifai from './clarifai.json';
import sherlock from './sherlock.json';
import cortecs from './cortecs.json';
import dinference from './dinference.json';
import nvidia from './nvidia.json';
import fireworks from './fireworks.json';
import friendli from './friendli.json';
import ollama from './ollama.json';
import opencode from './opencode.json';
import opencodego from './opencodego.json';
import pollinations from './pollinations.json';
import puter from './puter.json';
import qwencli from './qwencli.json';
import seraphyn from './seraphyn.json';
import zenmux from './zenmux.json';
import zhipu from './zhipu.json';

const providers = {
	aihubmix: aihubmix,
	apertis: apertis,
	"ava-supernova": avaSupernova,
	baseten: baseten,
	berget: berget,
	blackbox: blackbox,
	chatjimmy: chatjimmy,
	chutes: chutes,
	clarifai: clarifai,
	codex: codex,
	cortecs: cortecs,
	deepinfra: deepinfra,
	deepseek: deepseek,
	dinference: dinference,
	fastrouter: fastrouter,
	fireworks: fireworks,
	friendli: friendli,
	huggingface: huggingface,
	kilo: kilo,
	knox: knox,
	lightningai: lightningai,
	llmgateway: llmgateway,
	minimax: minimax,
	mistral: mistral,
	modal: modal,
	modelscope: modelscope,
	moonshot: moonshot,
	nanogpt: nanogpt,
	nvidia: nvidia,
	ollama: ollama,
	opencode: opencode,
	opencodego: opencodego,
	pollinations: pollinations,
	puter: puter,
	qwencli: qwencli,
	seraphyn: seraphyn,
	sherlock: sherlock,
	zenmux: zenmux,
	zhipu: zhipu,
};

export type ProviderName = keyof typeof providers;

export const configProviders = providers as Record<
    ProviderName,
    ProviderConfig
>;
