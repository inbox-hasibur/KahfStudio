/**
 * VocEx Web ML Worker - Standalone Web Worker for ONNX Runtime Inference
 * Handles MDX-Net (vocals.onnx, inst3.onnx) & Bandit-v2 (bandit_v2_sfx.onnx)
 */

const S = {
  N_FFT: 7680,
  HOP: 1024,
  DIM_F: 3072,
  DIM_T: 256,
  COMPENSATE: 1.021,
  INST_COMPENSATE: 1.028
};

const B = {
  WIN: 8 * 48000
};

const b = S.N_FFT;
const K = S.HOP;
const ve = S.DIM_T;
const P = b / 2 + 1;
const j = K * (ve - 1);
const R = j + b;
const g = ve * P;

function re(e, t, n) {
  const r = e.length;
  for (let o = 1, c = 0; o < r; o++) {
    let i = r >> 1;
    for (; c & i; i >>= 1) c ^= i;
    if (c ^= i, o < c) {
      const f = e[o]; e[o] = e[c]; e[c] = f;
      const d = t[o]; t[o] = t[c]; t[c] = d;
    }
  }
  for (let o = 2; o <= r; o <<= 1) {
    const c = (n ? 2 : -2) * Math.PI / o;
    const i = Math.cos(c), f = Math.sin(c);
    for (let d = 0; d < r; d += o) {
      let s = 1, a = 0;
      for (let l = 0; l < o >> 1; l++) {
        const u = d + l, m = d + l + (o >> 1);
        const h = e[m] * s - t[m] * a;
        const w = e[m] * a + t[m] * s;
        e[m] = e[u] - h; t[m] = t[u] - w;
        e[u] = e[u] + h; t[u] = t[u] + w;
        const p = s * i - a * f;
        a = s * f + a * i; s = p;
      }
    }
  }
  if (n) {
    const o = 1 / r;
    for (let c = 0; c < r; c++) {
      e[c] = e[c] * o;
      t[c] = t[c] * o;
    }
  }
}

const Ae = (() => {
  let e = b;
  for (; e % 2 === 0;) e >>= 1;
  return b / e;
})();
const V = b / Ae;
const F = V === 1 || (V <= 15 && Ae >= 8);
const pe = F && V > 1 ? new Float32Array(b) : null;
const ye = F && V > 1 ? new Float32Array(b) : null;
const Ie = F && V > 1 ? new Float32Array(b) : null;
const ke = F && V > 1 ? new Float32Array(b) : null;

if (pe && ye) {
  for (let e = 0; e < b; e++) {
    const t = 2 * Math.PI * e / b;
    pe[e] = Math.cos(t);
    ye[e] = -Math.sin(t);
  }
}

function ct(e, t) {
  const n = V, r = Ae, o = b;
  for (let a = 0; a < n; a++) {
    const l = Ie.subarray(a * r, (a + 1) * r);
    const u = ke.subarray(a * r, (a + 1) * r);
    for (let m = 0, h = a; m < r; m++, h += n) {
      l[m] = e[h]; u[m] = t[h];
    }
    re(l, u, false);
  }
  const c = pe, i = ye, f = Ie, d = ke, s = r - 1;
  for (let a = 0; a < o; a++) {
    const l = a & s;
    let u = 0, m = 0, h = 0;
    for (let w = 0; w < n; w++) {
      const p = f[w * r + l], y = d[w * r + l], $ = c[h], H = i[h];
      u += p * $ - y * H;
      m += p * H + y * $;
      h += a;
      if (h >= o) h -= o;
    }
    e[a] = u; t[a] = m;
  }
}

const M = b;
let O = 1;
for (; O < 2 * M + 1;) O <<= 1;
const ee = new Float32Array(F ? 0 : M);
const te = new Float32Array(F ? 0 : M);
const q = new Float32Array(F ? 0 : O);
const Y = new Float32Array(F ? 0 : O);

if (!F) {
  for (let e = 0; e < M; e++) {
    const t = Math.PI * (e * e % (2 * M)) / M;
    ee[e] = Math.cos(t);
    te[e] = Math.sin(t);
  }
  q[0] = ee[0]; Y[0] = te[0];
  for (let e = 1; e < M; e++) {
    q[e] = q[O - e] = ee[e];
    Y[e] = Y[O - e] = te[e];
  }
  re(q, Y, false);
}

const x = new Float32Array(F ? 0 : O);
const I = new Float32Array(F ? 0 : O);

function lt(e, t) {
  for (let n = 0; n < M; n++) {
    const r = ee[n], o = -te[n];
    x[n] = e[n] * r - t[n] * o;
    I[n] = e[n] * o + t[n] * r;
  }
  x.fill(0, M, O);
  I.fill(0, M, O);
  re(x, I, false);
  for (let n = 0; n < O; n++) {
    const r = x[n] * q[n] - I[n] * Y[n];
    I[n] = x[n] * Y[n] + I[n] * q[n];
    x[n] = r;
  }
  re(x, I, true);
  for (let n = 0; n < M; n++) {
    const r = ee[n], o = -te[n];
    e[n] = x[n] * r - I[n] * o;
    t[n] = x[n] * o + I[n] * r;
  }
}

function Le(e, t) {
  if (V === 1) { re(e, t, false); return; }
  if (F) { ct(e, t); return; }
  lt(e, t);
}

function Xe(e, t, n) {
  if (!n) { Le(e, t); return; }
  for (let o = 0; o < M; o++) t[o] = -t[o];
  Le(e, t);
  const r = 1 / M;
  for (let o = 0; o < M; o++) {
    e[o] = e[o] * r;
    t[o] = -t[o] * r;
  }
}

const oe = new Float32Array(b);
for (let e = 0; e < b; e++) oe[e] = 0.5 - 0.5 * Math.cos(2 * Math.PI * e / b);

const fe = new Float32Array(R);
{
  const e = new Float32Array(R);
  for (let t = 0; t < ve; t++) {
    const n = t * K;
    for (let r = 0; r < b; r++) e[n + r] += oe[r] * oe[r];
  }
  for (let t = 0; t < R; t++) fe[t] = e[t] > 1e-8 ? 1 / e[t] : 0;
}

function ge(e, t) {
  const n = b / 2, r = e.length;
  for (let o = 0; o < r; o++) t[n + o] = e[o];
  for (let o = 0; o < n; o++) {
    t[n - 1 - o] = e[Math.min(o + 1, r - 1)];
    t[n + r + o] = e[Math.max(r - 2 - o, 0)];
  }
}

const C = new Float32Array(b);
const W = new Float32Array(b);

function it(e, t, n, r, o, c = 0) {
  for (let i = r; i < o; i++) {
    const f = i * K;
    for (let s = 0; s < b; s++) {
      C[s] = e[f + s] * oe[s];
      W[s] = 0;
    }
    Xe(C, W, false);
    const d = c + (i - r) * P;
    for (let s = 0; s < P; s++) {
      t[d + s] = C[s];
      n[d + s] = W[s];
    }
  }
}

function ut(e, t, n, r, o, c = 0) {
  for (let i = r; i < o; i++) {
    const f = c + (i - r) * P;
    for (let s = 0; s < P; s++) {
      C[s] = e[f + s];
      W[s] = t[f + s];
    }
    for (let s = 1; s < b / 2; s++) {
      C[b - s] = C[s];
      W[b - s] = -W[s];
    }
    Xe(C, W, true);
    const d = (i - r) * K;
    for (let s = 0; s < b; s++) {
      n[d + s] += C[s] * oe[s];
    }
  }
}

let v = null;
const VOCALS_MODEL_PATH = "/models/vocals.onnx";
const INST_MODEL_PATH = "/models/inst3.onnx";
const BANDIT_MODEL_PATH = "/models/bandit_v2_sfx.onnx";

const k = S.DIM_F;
const E = S.DIM_T;

let vocalSession = null;
let vocalInputName = "input";
let vocalOutputName = "output";

let instSession = null;
let instInputName = "input";
let instOutputName = "output";

let banditSession = null;
let banditInputName = "input";
let banditOutputName = "output";

let activeBackend = "wasm";
const modelBufferCache = new Map();

async function fetchModelBuffer(url, modelName = "AI Model") {
  const cached = modelBufferCache.get(url);
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Model fetch failed (${url}): ${res.status}`);
  
  const contentLength = res.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  
  if (total && res.body) {
    let loaded = 0;
    const reader = res.body.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      const percent = Math.round((loaded / total) * 100);
      self.postMessage({ type: "PROGRESS", payload: { model: modelName, loaded, total, percent } });
    }
    const buf = new Uint8Array(loaded);
    let position = 0;
    for (const chunk of chunks) {
      buf.set(chunk, position);
      position += chunk.length;
    }
    const arrayBuf = buf.buffer;
    modelBufferCache.set(url, arrayBuf);
    return arrayBuf;
  } else {
    const buf = await res.arrayBuffer();
    modelBufferCache.set(url, buf);
    return buf;
  }
}

const me = new Float32Array(2 * R);
const A = new Float32Array(2 * g);
const T = new Float32Array(2 * g);
const Q = new Float32Array(4 * k * E);
const L = new Float32Array(R);
const z = new Float32Array(j);
const X = new Float32Array(j);

function We(e, t) {
  const n = me.subarray(t * R, (t + 1) * R);
  ge(e, n);
  it(n, A.subarray(t * g, (t + 1) * g), T.subarray(t * g, (t + 1) * g), 0, E);
}

function je(e, t) {
  L.fill(0);
  ut(A.subarray(e * g, (e + 1) * g), T.subarray(e * g, (e + 1) * g), L, 0, E);
  const n = b / 2;
  for (let r = 0; r < j; r++) t[r] = L[n + r] * fe[n + r];
}

function $e(e, t, n, r, o, c, i, f, d, s, a) {
  for (let l = 0; l < f; l++) {
    const u = l * d;
    for (let m = 0; m < i; m++) {
      const h = u + m, w = m * f + l;
      const p = n[o + w] * s;
      const y = n[c + w] * s;
      const $ = e[h] - r[o + w] * a;
      const H = t[h] - r[c + w] * a;
      if (p * p + y * y <= $ * $ + H * H) {
        e[h] = p; t[h] = y;
      } else {
        e[h] = $; t[h] = H;
      }
    }
    for (let m = i; m < d; m++) {
      e[u + m] = 0; t[u + m] = 0;
    }
  }
}

async function createSessionWithFallback(modelBuffer) {
  const optionsWebGPU = {
    executionProviders: ["webgpu", "wasm"],
    graphOptimizationLevel: "all"
  };
  
  const optionsWASM = {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all"
  };

  try {
    const session = await v.InferenceSession.create(modelBuffer, optionsWebGPU);
    activeBackend = "webgpu";
    return session;
  } catch (gpuErr) {
    console.warn("[VocEx ML Worker] WebGPU session creation fallback to WASM:", gpuErr);
    const session = await v.InferenceSession.create(modelBuffer, optionsWASM);
    activeBackend = "wasm (cpu-simd)";
    return session;
  }
}

async function initModels() {
  try {
    v = await import("/assets/ort.all.min.mjs");
    v.env.wasm.wasmPaths = "/assets/";
    
    // Enable multi-threading & SIMD acceleration
    try {
      if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
        v.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency, 4);
      }
    } catch (_) {}

    self.postMessage({ type: "STATUS", payload: "Loading MDX-Net & Bandit-v2 Neural Models..." });
    
    // Action 12A & 12C: Load vocals.onnx & bandit_v2_sfx.onnx in parallel
    const [vocBuf, banditBuf] = await Promise.all([
      fetchModelBuffer(VOCALS_MODEL_PATH, "Vocals AI"),
      fetchModelBuffer(BANDIT_MODEL_PATH, "Nature AI").catch((bErr) => {
        console.warn("[VocEx ML Worker] Bandit-v2 model fetch notice:", bErr);
        return null;
      })
    ]);

    vocalSession = await createSessionWithFallback(vocBuf);
    vocalInputName = vocalSession.inputNames[0];
    vocalOutputName = vocalSession.outputNames[0];

    if (banditBuf) {
      try {
        banditSession = await createSessionWithFallback(banditBuf);
        banditInputName = banditSession.inputNames[0];
        banditOutputName = banditSession.outputNames[0];
      } catch (bInitErr) {
        console.warn("[VocEx ML Worker] Bandit-v2 session init notice:", bInitErr);
      }
    }

    // Optional inst3 ensemble model
    try {
      const instBuf = await fetchModelBuffer(INST_MODEL_PATH);
      instSession = await createSessionWithFallback(instBuf);
      instInputName = instSession.inputNames[0];
      instOutputName = instSession.outputNames[0];
    } catch (instErr) {
      console.warn("[VocEx ML Worker] inst3 ensemble model optional load failed:", instErr);
    }

    // Action 12C: Report MODEL_READY only after sessions are initialized
    self.postMessage({ type: "MODEL_READY", payload: activeBackend });
    console.log(`[VocEx ML Worker] All neural models initialized with ${activeBackend} backend.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[VocEx ML Worker] Failed to init models:", msg);
    self.postMessage({ type: "MODEL_ERROR", payload: msg });
  }
}

async function loadBanditModelIfNeeded() {
  if (banditSession) return banditSession;
  try {
    self.postMessage({ type: "STATUS", payload: "Loading Bandit-v2 Nature Model..." });
    const banditBuf = await fetchModelBuffer(BANDIT_MODEL_PATH, "Nature AI");
    banditSession = await createSessionWithFallback(banditBuf);
    banditInputName = banditSession.inputNames[0];
    banditOutputName = banditSession.outputNames[0];
    return banditSession;
  } catch (err) {
    console.warn("[VocEx ML Worker] Bandit-v2 model load fallback to vocals:", err);
    return null;
  }
}

async function runInference(leftPCM, rightPCM, variant = "voice") {
  if (!vocalSession) await initModels();
  if (!vocalSession) throw new Error("Vocal model session unavailable");

  We(leftPCM, 0);
  We(rightPCM, 1);

  const r = k * E;
  for (let s = 0; s < E; s++) {
    for (let a = 0; a < k; a++) {
      const l = s * P + a, u = a * E + s;
      Q[u] = A[l];
      Q[r + u] = T[l];
      Q[2 * r + u] = A[g + l];
      Q[3 * r + u] = T[g + l];
    }
  }

  const tensor = new v.Tensor("float32", Q, [1, 4, k, E]);
  
  // Choose session (Bandit-v2 for nature if available, otherwise Vocal session)
  const targetSession = (variant === "nature" && banditSession) ? banditSession : vocalSession;
  const inputName = targetSession.inputNames[0];
  const outputName = targetSession.outputNames[0];

  const outResult = await targetSession.run({ [inputName]: tensor });
  const outData = outResult[outputName].data;
  
  let instData = null;
  if (instSession && variant === "voice") {
    try {
      const instResult = await instSession.run({ [instInputName]: tensor });
      instData = instResult[instOutputName].data;
    } catch (_) {}
  }

  const isEnsemble = instSession !== null && instData !== null;
  if (isEnsemble) {
    $e(A.subarray(0, g), T.subarray(0, g), outData, instData, 0, r, k, E, P, S.COMPENSATE, S.INST_COMPENSATE);
    $e(A.subarray(g, 2 * g), T.subarray(g, 2 * g), outData, instData, 2 * r, 3 * r, k, E, P, S.COMPENSATE, S.INST_COMPENSATE);
  } else {
    A.fill(0); T.fill(0);
    for (let s = 0; s < E; s++) {
      for (let a = 0; a < k; a++) {
        const l = s * P + a, u = a * E + s;
        A[l] = outData[u];
        T[l] = outData[r + u];
        A[g + l] = outData[2 * r + u];
        T[g + l] = outData[3 * r + u];
      }
    }
  }

  je(0, z);
  je(1, X);

  if (!isEnsemble) {
    const s = S.COMPENSATE;
    for (let a = 0; a < j; a++) {
      z[a] = z[a] * s;
      X[a] = X[a] * s;
    }
  }

  return { left: z.slice(), right: X.slice() };
}

self.onmessage = async (e) => {
  const { type, payload } = e.data;
  if (type === "INIT") {
    await initModels();
  } else if (type === "INFER") {
    try {
      const { left, right, tag, gen, adv, pos, abs, cg, variant } = payload;
      const res = await runInference(left, right, variant);
      self.postMessage({
        type: "INFER_RESULT",
        payload: {
          left: res.left,
          right: res.right,
          tag,
          gen,
          adv,
          pos,
          abs,
          cg
        }
      }, [res.left.buffer, res.right.buffer]);
    } catch (err) {
      self.postMessage({
        type: "INFER_ERROR",
        payload: err instanceof Error ? err.message : String(err)
      });
    }
  } else if (type === "NATURE_INFER") {
    try {
      const p = payload || {};
      const { left, right, tag, gen, nativeRate, sampleRate } = p;
      const res = await runInference(left || new Float32Array(261120), right || left || new Float32Array(261120), "nature");
      const resultMono = res.left;
      self.postMessage({
        type: "NATURE_INFER_RESULT",
        payload: {
          ...p,
          left: res.left,
          right: res.right,
          mono: resultMono,
          gen: typeof gen !== "undefined" ? gen : 0,
          nativeRate: nativeRate || sampleRate || 48000,
          tag
        }
      }, [res.left.buffer, res.right.buffer]);
    } catch (err) {
      self.postMessage({
        type: "NATURE_INFER_ERROR",
        payload: err instanceof Error ? err.message : String(err)
      });
    }
  }
};
