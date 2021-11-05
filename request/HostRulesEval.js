/** @typedef {import('@advanced-rest-client/events').HostRule.HostRule} HostRule */
/**
 * A class responsible for evaluating host rules.
 */
export class HostRulesEval {
  /**
   * Applies `hosts` rules to an URL.
   *
   * @param {string} value An URL to apply the rules to
   * @param {HostRule[]} rules List of host rules. It is a list of objects
   * containing `from` and `to` properties.
   * @return {string} Evaluated URL with hosts rules.
   */
  static applyHosts(value, rules) {
    if (!rules || !rules.length) {
      return value;
    }
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const result = HostRulesEval._evaluateRule(value, rule);
      if (result) {
        value = result;
      }
    }
    return value;
  }

  /**
   * Evaluates hosts rule and applies it to the `url`.
   * @param {string} url The URL to evaluate
   * @param {HostRule} rule ARC rule definition
   * @return {string} Processed url.
   */
  static _evaluateRule(url, rule) {
    if (!rule || !rule.from || !rule.to) {
      return;
    }
    const re = HostRulesEval._createRuleRe(rule.from);
    if (!re.test(url)) {
      return;
    }
    return url.replace(re, rule.to);
  }

  /**
   * @param {string} input Rule body
   * @return {RegExp} Regular expression for the rule.
   */
  static _createRuleRe(input) {
    input = input.replace(/\*/g, '(.*)');
    return new RegExp(input, 'gi');
  }
}
