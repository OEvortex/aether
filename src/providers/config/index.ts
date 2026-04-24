import type { ProviderConfig } from '../../types/sharedTypes.js';
import aihubmix from "./aihubmix.json";
import aimlapi from "./aimlapi.json";
import apertis from "./apertis.json";
import baidu from "./baidu.json";
import baseten from "./baseten.json";
import berget from "./berget.json";
import blackbox from "./blackbox.json";
import chatjimmy from "./chatjimmy.json";
import chutes from "./chutes.json";
import clarifai from "./clarifai.json";
import cline from "./cline.json";
import codex from "./codex.json";
import commonstack from "./commonstack.json";
import cortecs from "./cortecs.json";
import crof from "./crof.json";
import dashscope from "./dashscope.json";
import deepinfra from "./deepinfra.json";
import deepseek from "./deepseek.json";
import dialagram from "./dialagram.json";
import dinference from "./dinference.json";
import edenai from "./edenai.json";
import fastrouter from "./fastrouter.json";
import fireworks from "./fireworks.json";
import friendli from "./friendli.json";
import helicone from "./helicone.json";
import hicapai from "./hicapai.json";
import huggingface from "./huggingface.json";
import jiekou from "./jiekou.json";
import kilo from "./kilo.json";
import knox from "./knox.json";
import lightningai from "./lightningai.json";
import llmgateway from "./llmgateway.json";
import meganova from "./meganova.json";
import minimax from "./minimax.json";
import mistral from "./mistral.json";
import moark from "./moark.json";
import modal from "./modal.json";
import modelark from "./modelark.json";
import modelscope from "./modelscope.json";
import moonshot from "./moonshot.json";
import nanogpt from "./nanogpt.json";
import nvidia from "./nvidia.json";
import ofox from "./ofox.json";
import ollama from "./ollama.json";
import opencode from "./opencode.json";
import opencodego from "./opencodego.json";
import pollinations from "./pollinations.json";
import portkey from "./portkey.json";
import puter from "./puter.json";
import qwencli from "./qwencli.json";
import qzz from "./qzz.json";
import requesty from "./requesty.json";
import rinkoai from "./rinkoai.json";
import routingrun from "./routingrun.json";
import seraphyn from "./seraphyn.json";
import sherlock from "./sherlock.json";
import streamlake from "./streamlake.json";
import tencent from "./tencent.json";
import together from "./together.json";
import vercelai from "./vercelai.json";
import volcengine from "./volcengine.json";
import vsllm from "./vsllm.json";
import xiaomimimo from "./xiaomimimo.json";
import xinjianya from "./xinjianya.json";
import zenmux from "./zenmux.json";
import zhipu from "./zhipu.json";

const providers = {
	aihubmix: aihubmix,
	aimlapi: aimlapi,
	apertis: apertis,
	baidu: baidu,
	baseten: baseten,
	berget: berget,
	blackbox: blackbox,
	chatjimmy: chatjimmy,
	chutes: chutes,
	clarifai: clarifai,
	cline: cline,
	codex: codex,
	commonstack: commonstack,
	cortecs: cortecs,
	crof: crof,
	dashscope: dashscope,
	deepinfra: deepinfra,
	deepseek: deepseek,
	dialagram: dialagram,
	dinference: dinference,
	edenai: edenai,
	fastrouter: fastrouter,
	fireworks: fireworks,
	friendli: friendli,
	helicone: helicone,
	hicapai: hicapai,
	huggingface: huggingface,
	jiekou: jiekou,
	kilo: kilo,
	knox: knox,
	lightningai: lightningai,
	llmgateway: llmgateway,
	meganova: meganova,
	minimax: minimax,
	mistral: mistral,
	moark: moark,
	modal: modal,
	modelark: modelark,
	modelscope: modelscope,
	moonshot: moonshot,
	nanogpt: nanogpt,
	nvidia: nvidia,
	ofox: ofox,
	ollama: ollama,
	opencode: opencode,
	opencodego: opencodego,
	pollinations: pollinations,
	portkey: portkey,
	puter: puter,
	qwencli: qwencli,
	qzz: qzz,
	requesty: requesty,
	rinkoai: rinkoai,
	routingrun: routingrun,
	seraphyn: seraphyn,
	sherlock: sherlock,
	streamlake: streamlake,
	tencent: tencent,
	together: together,
	vercelai: vercelai,
	volcengine: volcengine,
	vsllm: vsllm,
	xiaomimimo: xiaomimimo,
	xinjianya: xinjianya,
	zenmux: zenmux,
	zhipu: zhipu,
};

export type ProviderName = keyof typeof providers;

export const configProviders = providers as Record<
    ProviderName,
    ProviderConfig
>;
