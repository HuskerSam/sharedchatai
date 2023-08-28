/** static functions for UI and api calls  */
export default class SharedWithBackend {
  /** min and max returned in multiples of 20
   * @param { string } name model name
   * @return { any } returns model meta (contextualLimit, completionMax, completionMin)
  */
  static getModelMeta(name = ""): any {
    let contextualLimit = 4096;
    let defaultCompletion = 500;
    let completionMax = 2048;
    let type = "gpt";
    const completionMin = 20;
    let temperature = 1;
    if (name === "gpt-3.5-turbo-16k") {
      contextualLimit = 16394;
      defaultCompletion = 2000;
      completionMax = 4000;
    }
    if (name === "gpt-4") {
      contextualLimit = 8192;
      defaultCompletion = 1000;
      completionMax = 4000;
    }
    if (name === "chat-bison-001") {
      contextualLimit = 8192;
      defaultCompletion = 1000;
      completionMax = 3000;
      type = "bard";
      temperature = 0.2;
    }
    const defaults = {
      max_tokens: defaultCompletion,
      temperature,
      top_p: 1,
      top_k: 40,
      presence_penalty: 0,
      frequency_penalty: 0,
    };
    return {
      contextualLimit,
      completionMax,
      completionMin,
      defaultCompletion,
      type,
      defaults,
    };
  }
}
