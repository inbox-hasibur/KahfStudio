export type HalalFilterMode = "dsp" | "ml" | "bypass";
export type HalalFilterVariant = "voice" | "nature";

export type WorkletMessageIn =
  | { type: "ML_RESULT"; left: Float32Array; right: Float32Array; tag?: number; gen?: number; adv?: number; pos?: number; abs?: number; cg?: number }
  | { type: "VOCEX_NATURE_RESULT"; payload: any }
  | { type: "UPDATE_SETTINGS"; mode?: HalalFilterMode; mlVariant?: HalalFilterVariant; variant?: HalalFilterVariant; gainLinear?: number }
  | { type: "SET_CONFIG"; mode?: HalalFilterMode; mlVariant?: HalalFilterVariant; gainLinear?: number }
  | { type: "SET_MODE"; mode: HalalFilterMode }
  | { type: "SET_VARIANT"; mlVariant?: HalalFilterVariant; variant?: HalalFilterVariant }
  | { type: "SET_GAIN"; gainLinear: number }
  | { type: "VIDEO_START_TIME"; time: number }
  | { type: "ML_ALIGN_FORWARD" }
  | { type: "PLAY_STATE"; playing: boolean }
  | { type: "ML_FULL_RESET" };

export type WorkletMessageOut =
  | { type: "ML_CHUNK"; left: Float32Array; right: Float32Array; tag: number; gen: number; adv: number; pos: number; abs: number; cg: number; sampleRate: number; variant: HalalFilterVariant }
  | { type: "VOCEX_NATURE_CHUNK"; payload: any }
  | { type: "NATURE_CHUNK"; payload: any }
  | { type: "VOCEX_ML_READY" }
  | { type: "ML_READY" }
  | { type: "VOCEX_STATS"; rmsDb: number; rms: number };

export type WorkerMessageIn =
  | { type: "INIT" }
  | { type: "INFER"; payload: { left: Float32Array; right: Float32Array; tag?: number; gen?: number; adv?: number; pos?: number; abs?: number; cg?: number; variant?: HalalFilterVariant } }
  | { type: "NATURE_INFER"; payload: any };

export type WorkerMessageOut =
  | { type: "STATUS"; payload: string }
  | { type: "MODEL_READY"; payload: string }
  | { type: "MODEL_ERROR"; payload: string }
  | { type: "INFER_RESULT"; payload: { left: Float32Array; right: Float32Array; tag?: number; gen?: number; adv?: number; pos?: number; abs?: number; cg?: number } }
  | { type: "NATURE_INFER_RESULT"; payload: any };
