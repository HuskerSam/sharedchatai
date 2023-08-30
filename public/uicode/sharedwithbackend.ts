const models: any = {
  "gpt-3.5-turbo": {
    "active": 1,
    "type": "gpt",
    "input": 0.0015,
    "output": 0.002,
    "contextualLimit": 4096,
    "defaultCompletion": 500,
    "completionMax": 2048,
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "gpt-3.5-turbo-16k": {
    "active": 1,
    "type": "gpt",
    "input": 0.003,
    "output": 0.004,
    "contextualLimit": 16394,
    "defaultCompletion": 2000,
    "completionMax": 4000,
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "gpt-4": {
    "active": 1,
    "type": "gpt",
    "input": 0.03,
    "output": 0.06,
    "contextualLimit": 8192,
    "defaultCompletion": 1000,
    "completionMax": 4000,
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "gpt-4-32k": {
    "active": 0,
    "type": "gpt",
    "input": 0.06,
    "output": 0.12,
    "contextualLimit": 32768,
    "defaultCompletion": 4000,
    "completionMax": 8000,
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "chat-bison-001": {
    "active": 1,
    "type": "bard",
    "input": 0.015,
    "output": 0.03,
    "contextualLimit": 8192,
    "defaultCompletion": 1000,
    "completionMax": 3000,
    "completionMin": 20,
    "temperature": 0.2,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "claude-instant-1": {
    "active": 0,
    "type": "anthro",
    "input": 0.00163,
    "output": 0.00551,
    "contextualLimit": "",
    "defaultCompletion": "",
    "completionMax": "",
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
  "claude-2": {
    "active": 0,
    "type": "anthro",
    "input": 0.01102,
    "output": 0.03268,
    "contextualLimit": "",
    "defaultCompletion": "",
    "completionMax": "",
    "completionMin": 20,
    "temperature": 1,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
  },
};

/** static functions for UI and api calls  */
export default class SharedWithBackend {
  /** min and max returned in multiples of 20
   * @param { string } name model name
   * @return { any } returns model meta (contextualLimit, completionMax, completionMin)
  */
  static getModelMeta(name = ""): any {
    const modelFound: any = models[name];
    if (!modelFound) {
      console.log("MODEL NOT FOUND", name);
      return null;
    }
    const defaults = {
      max_tokens: modelFound.defaultCompletion,
      temperature: modelFound.temperature,
      top_p: modelFound.top_p,
      top_k: modelFound.top_k,
      presence_penalty: modelFound.presence_penalty,
      frequency_penalty: modelFound.frequency_penalty,
    };
    return {
      contextualLimit: modelFound.contextualLimit,
      completionMax: modelFound.completionMax,
      completionMin: modelFound.completionMin,
      defaultCompletion: modelFound.defaultCompletion,
      type: modelFound.type,
      input: modelFound.input,
      output: modelFound.output,
      defaults,
    };
  }
  /**
   * @return { any }
  */
  getModels(): any {
    return models;
  }
}
