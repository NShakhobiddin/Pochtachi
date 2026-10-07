/* Pochtam AI — Gemini zaxirasi (2026-10-07).
 *
 * Worker hamma joyda Anthropic Messages API shaklida ishlaydi (vositalar
 * sikli, skrinshot, qidiruv so'zlari). Bu modul o'sha so'rovni Gemini
 * generateContent shakliga o'giradi va javobni yana Claude shakliga
 * qaytaradi — ai.js dagi qolgan kod o'zgarmaydi. Ishlatiladi:
 *   – Claude ishlamasa (kredit/chegara, yuklama, tarmoq, kalit) — zaxira;
 *   – AI_PROVIDER = "gemini" yoki sinovda x-pochtam-provider: gemini.
 *
 * Gemini REST (v1beta, x-goog-api-key): vositalar functionDeclarations
 * (parametersJsonSchema — JSON Schema to'g'ridan-to'g'ri), JSON javob
 * generationConfig.responseJsonSchema, rasm inlineData. Gemini 3 vosita
 * chaqiruvi bilan "fikr imzosi" (thoughtSignature) qaytaradi — keyingi
 * raundda o'sha qismga qaytarilmasa 400. Shuning uchun imzo Claude
 * blokida (gsig) saqlanadi; Claude yozgan chaqiruvga (zaxiraga o'tishdan
 * oldingi raund) hujjatdagi maxsus qiymat qo'yiladi.
 * Veb-qidiruv (Claude server vositasi) Gemini'da standart o'chiq:
 * GEMINI_SEARCH = "1" bo'lsa googleSearch qo'shiladi. Kalit faqat
 * Cloudflare siri (GEMINI_API_KEY), brauzerga tushmaydi. */

export const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
const SKIP_SIG = 'skip_thought_signature_validator';
const REFUSE = ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'IMAGE_SAFETY', 'IMAGE_PROHIBITED_CONTENT', 'LANGUAGE'];

/* Claude modeli → Gemini modeli: arzon (Haiku: skrinshot, qidiruv
   so'zlari) va asosiy (suhbat). Ikkalasi ham sozlamada. */
export function geminiModel(claudeModel, env) {
  const cheap = /haiku/i.test(String(claudeModel || ''));
  return String((cheap && env.GEMINI_SHOT_MODEL) || env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL).trim();
}

const isServerTool = t => t && !t.input_schema && typeof t.type === 'string' && /^(web_search|web_fetch|code_execution)/.test(t.type);
const textOf = c => typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b && b.type === 'text').map(b => b.text).join('\n') : '';

/* Vosita natijasi (Claude'da JSON matn) → functionResponse.response (obyekt). */
function responseObj(content) {
  const t = textOf(content);
  let v = t;
  try { v = JSON.parse(t); } catch (e) { v = t; }
  return v && typeof v === 'object' && !Array.isArray(v) ? v : { result: v };
}

/* Anthropic Messages so'rovi → Gemini generateContent tanasi. */
export function toGemini(body, env = {}) {
  const tools = Array.isArray(body.tools) ? body.tools : [];
  const search = String(env.GEMINI_SEARCH || '') === '1' && tools.some(isServerTool);
  /* Tizim ko'rsatmasi: bloklar bitta matnga. Veb-qidiruv o'chiq bo'lsa
     u haqidagi ko'rsatma olib tashlanadi — model yo'q vositani "chaqirmasin". */
  let sys = typeof body.system === 'string' ? [body.system] : (Array.isArray(body.system) ? body.system.map(b => b && b.text || '') : []);
  if (!search) sys = sys.filter(t => !/web_search/.test(t));
  const out = {};
  if (sys.filter(Boolean).length) out.systemInstruction = { parts: [{ text: sys.filter(Boolean).join('\n\n') }] };

  /* tool_use id → nom (functionResponse nom bilan bog'lanadi); Gemini
     bergan chaqiruvlar id si javobda qaytariladi. */
  const names = {}, gids = new Set();
  for (const m of body.messages || []) if (Array.isArray(m.content)) for (const b of m.content) if (b && b.type === 'tool_use') { names[b.id] = b.name; if (b.gsrc) gids.add(b.id); }

  out.contents = [];
  for (const m of body.messages || []) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const parts = [];
    if (typeof m.content === 'string') { if (m.content) parts.push({ text: m.content }); }
    else if (Array.isArray(m.content)) {
      let firstCall = true;
      for (const b of m.content) {
        if (!b || typeof b !== 'object') continue;
        if (b.type === 'text') { if (b.text) parts.push(b.gsig ? { text: b.text, thoughtSignature: b.gsig } : { text: b.text }); }
        else if (b.type === 'image' && b.source && b.source.type === 'base64') parts.push({ inlineData: { mimeType: b.source.media_type, data: b.source.data } });
        else if (b.type === 'tool_use') {
          const p = { functionCall: { name: b.name, args: b.input || {} } };
          if (b.gsrc && b.id) p.functionCall.id = b.id;
          /* Gemini o'zi bergan chaqiruv — o'z imzosi bilan (parallel
             chaqiruvda faqat birinchisida bor). Claude bergan chaqiruv —
             imzosiz, shuning uchun birinchisiga maxsus qiymat. */
          if (b.gsig) p.thoughtSignature = b.gsig;
          else if (!b.gsrc && firstCall) p.thoughtSignature = SKIP_SIG;
          firstCall = false;
          parts.push(p);
        } else if (b.type === 'tool_result') {
          const fr = { name: names[b.tool_use_id] || 'tool', response: responseObj(b.content) };
          if (gids.has(b.tool_use_id)) fr.id = b.tool_use_id;
          parts.push({ functionResponse: fr });
        }
        /* thinking, redacted_thinking, server_tool_use, web_search_tool_result —
           Claude'ga xos, Gemini'ga yuborilmaydi. */
      }
    }
    if (!parts.length) continue;
    /* Ketma-ket bir xil rol — bitta xabarga qo'shiladi. */
    const last = out.contents[out.contents.length - 1];
    if (last && last.role === role) last.parts.push(...parts); else out.contents.push({ role, parts });
  }

  const decls = tools.filter(t => t && t.input_schema).map(t => ({ name: t.name, description: t.description || '', parametersJsonSchema: t.input_schema }));
  const gt = [];
  if (decls.length) gt.push({ functionDeclarations: decls });
  if (search) gt.push({ googleSearch: {} });
  if (gt.length) out.tools = gt;
  const tc = body.tool_choice;
  if (tc && decls.length) {
    if (tc.type === 'tool' && tc.name) out.toolConfig = { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: [tc.name] } };
    else if (tc.type === 'any') out.toolConfig = { functionCallingConfig: { mode: 'ANY' } };
    else if (tc.type === 'none') out.toolConfig = { functionCallingConfig: { mode: 'NONE' } };
  }

  const gen = {};
  if (+body.max_tokens > 0) gen.maxOutputTokens = +body.max_tokens;
  const fmt = body.output_config && body.output_config.format;
  if (fmt && fmt.type === 'json_schema' && fmt.schema) { gen.responseMimeType = 'application/json'; gen.responseJsonSchema = fmt.schema; }
  /* Fikrlash darajasi faqat aniq sozlansa (modelga qarab qiymatlar farq
     qiladi): GEMINI_THINKING = MINIMAL | LOW | MEDIUM | HIGH. */
  const lvl = String(env.GEMINI_THINKING || '').toUpperCase();
  if (['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'].includes(lvl)) gen.thinkingConfig = { thinkingLevel: lvl };
  if (Object.keys(gen).length) out.generationConfig = gen;
  return out;
}

/* Gemini javob qismlari → Claude bloklari. Ketma-ket matn qismlari
   (oqimda bo'lak-bo'lak keladi) bitta blokka qo'shiladi. */
let seq = 0;
export function partsToBlocks(parts) {
  const blocks = [];
  for (const p of parts || []) {
    if (!p || p.thought) continue;
    if (p.functionCall) {
      seq = (seq + 1) % 1e6;
      blocks.push({ type: 'tool_use', id: p.functionCall.id || ('g' + Date.now().toString(36) + seq), name: p.functionCall.name, input: p.functionCall.args || {}, gsrc: 1, ...(p.thoughtSignature ? { gsig: p.thoughtSignature } : {}) });
    } else if (typeof p.text === 'string') {
      /* Ketma-ket matn — bitta blok (ilova matnni bloklar orasiga yangi
         qator qo'yib yig'adi, bo'lak o'rtasida qator uzilmasin). Matndagi
         imzo majburiy emas — birinchisi saqlanadi. */
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'text') { last.text += p.text; if (!last.gsig && p.thoughtSignature) last.gsig = p.thoughtSignature; }
      else blocks.push({ type: 'text', text: p.text, ...(p.thoughtSignature ? { gsig: p.thoughtSignature } : {}) });
    } else if (p.thoughtSignature && blocks.length) {
      /* Bo'sh qismdagi imzo (oqim oxiri) — oxirgi blokka. */
      const last = blocks[blocks.length - 1];
      if (!last.gsig) last.gsig = p.thoughtSignature;
    }
  }
  return blocks.filter(b => b.type !== 'text' || b.text || b.gsig);
}

function stopOf(finish, blocks, blocked) {
  if (blocked || REFUSE.includes(finish)) return 'refusal';
  if (blocks.some(b => b.type === 'tool_use')) return 'tool_use';
  if (finish === 'MAX_TOKENS') return 'max_tokens';
  return 'end_turn';
}

/* usageMetadata → Claude usage (narx hisobi costUsd da). Fikrlash
   tokenlari chiqish narxida. */
export function usageOf(um) {
  const u = um || {};
  const cached = +u.cachedContentTokenCount || 0;
  return {
    input_tokens: Math.max(0, (+u.promptTokenCount || 0) + (+u.toolUsePromptTokenCount || 0) - cached),
    output_tokens: (+u.candidatesTokenCount || 0) + (+u.thoughtsTokenCount || 0),
    cache_read_input_tokens: cached, cache_creation_input_tokens: 0
  };
}

/* To'liq Gemini javobi → Claude xabari. */
export function fromGemini(j, model) {
  const c = (j && Array.isArray(j.candidates) && j.candidates[0]) || {};
  const blocks = partsToBlocks(c.content && c.content.parts);
  const blocked = !!(j && j.promptFeedback && j.promptFeedback.blockReason);
  return { model: (j && j.modelVersion) || model, provider: 'gemini', content: blocks, stop_reason: stopOf(c.finishReason, blocks, blocked), usage: usageOf(j && j.usageMetadata) };
}

/* Oqim (alt=sse): har "data:" — qisman GenerateContentResponse. Matn
   bo'laklari darhol onEvent ga, vosita chaqiruvi — holat sifatida. */
export async function readGeminiSse(stream, model, onEvent) {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  const parts = []; let buf = '', finish = '', um = null, version = '', blocked = false, failed = null;
  const handle = j => {
    if (!j || typeof j !== 'object') return;
    if (j.error) { failed = j.error; return; }
    if (j.modelVersion) version = j.modelVersion;
    if (j.usageMetadata) um = j.usageMetadata;
    if (j.promptFeedback && j.promptFeedback.blockReason) blocked = true;
    const c = Array.isArray(j.candidates) && j.candidates[0];
    if (!c) return;
    if (c.finishReason) finish = c.finishReason;
    for (const p of (c.content && c.content.parts) || []) {
      parts.push(p);
      if (p.thought) continue;
      if (p.functionCall) onEvent({ kind: 'tool', name: p.functionCall.name });
      else if (p.text) onEvent({ kind: 'text', text: p.text });
    }
  };
  const flush = chunk => {
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const t = line.slice(5).trim();
      if (!t) continue;
      try { handle(JSON.parse(t)); } catch (e) { /* buzuq qator */ }
    }
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) { flush(buf.slice(0, i)); buf = buf.slice(i + 2); }
  }
  if (buf.trim()) flush(buf);
  if (failed) return { error: 'gemini: ' + (failed.message || 'oqim xatosi'), status: +failed.code || 500, type: failed.status || '' };
  const blocks = partsToBlocks(parts);
  return { data: { model: version || model, provider: 'gemini', content: blocks, stop_reason: stopOf(finish, blocks, blocked), usage: usageOf(um) } };
}

/* Bitta chaqiruv. Natija ai.js dagi callClaude bilan bir xil shaklda:
   { data } yoki { error, status, type }. */
export async function callGemini(body, env, fetchImpl, onEvent) {
  if (!env.GEMINI_API_KEY) return { error: 'gemini: kalit yo\'q', status: 401, type: 'no_key' };
  const model = geminiModel(body.model, env);
  const url = GEMINI_URL + encodeURIComponent(model) + (onEvent ? ':streamGenerateContent?alt=sse' : ':generateContent');
  const init = { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify(toGemini(body, env)) };
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) init.signal = AbortSignal.timeout(+env.AI_TIMEOUT_MS || 50000);
  let res;
  try { res = await fetchImpl(url, init); } catch (e) { return { error: 'gemini tarmoq: ' + (e && e.message || e), status: 0 }; }
  const ctype = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
  if (onEvent && res.ok && /event-stream/.test(ctype) && res.body) {
    try { return await readGeminiSse(res.body, model, onEvent); } catch (e) { return { error: 'gemini oqim: ' + (e && e.message || e), status: 0 }; }
  }
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) {
    const er = data && (Array.isArray(data) ? data[0] && data[0].error : data.error) || {};
    return { error: 'gemini: ' + (er.message || ('HTTP ' + res.status)), status: res.status, type: er.status || '' };
  }
  /* Oqim so'ralgan, lekin oddiy JSON keldi — matn bitta bo'lak bo'lib chiqadi. */
  const msg = fromGemini(Array.isArray(data) ? data[data.length - 1] : data, model);
  if (onEvent) for (const b of msg.content) { if (b.type === 'text') onEvent({ kind: 'text', text: b.text }); else if (b.type === 'tool_use') onEvent({ kind: 'tool', name: b.name }); }
  return { data: msg };
}
