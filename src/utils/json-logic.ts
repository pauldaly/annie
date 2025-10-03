/**
 * JsonLogic implementation extracted from boltts.ts
 * Provides conditional logic evaluation for Annie components
 */

interface JsonLogic {
  truthy(a: any): boolean;
  apply(logic: any, data?: any): any;
  get_operator(logic: any): string;
  get_values(logic: any): any;
  uses_data(logic: any): any[];
  add_operation(name: string, code: Function): void;
  rm_operation(name: string): void;
  rule_like(rule: any, pattern: any): any;
  is_logic(logic: any): boolean;
}

const operations: Record<string, Function> = {
  "==": (a: any, b: any) => a == b,
  "===": (a: any, b: any) => a === b,
  "!=": (a: any, b: any) => a != b,
  "!==": (a: any, b: any) => a !== b,
  ">": (a: any, b: any) => a > b,
  ">=": (a: any, b: any) => a >= b,
  "<": (a: any, b: any, c?: any) => c === undefined ? a < b : a < b && b < c,
  "<=": (a: any, b: any, c?: any) => c === undefined ? a <= b : a <= b && b <= c,
  "!!": (a: any) => jsonLogic.truthy(a),
  "!": (a: any) => !jsonLogic.truthy(a),
  "%": (a: any, b: any) => a % b,
  "log": (a: any) => { console.log(a); return a; },
  "in": (a: any, b: any) => {
    if (!b || typeof b.indexOf === "undefined") return false;
    return b.indexOf(a) !== -1;
  },
  "cat": (...args: any[]) => Array.prototype.join.call(args, ""),
  "substr": (source: any, start: number, end?: number) => {
    if (end !== undefined && end < 0) {
      const temp = String(source).substr(start);
      return temp.substr(0, temp.length + end);
    }
    return String(source).substr(start, end);
  },
  "+": (...args: any[]) => Array.prototype.reduce.call(args, (a: any, b: any) => parseFloat(String(a)) + parseFloat(String(b)), 0),
  "*": (...args: any[]) => Array.prototype.reduce.call(args, (a: any, b: any) => parseFloat(String(a)) * parseFloat(String(b)), 1),
  "-": (a: any, b?: any) => b === undefined ? -a : a - b,
  "/": (a: any, b: any) => a / b,
  "min": (...args: any[]) => Math.min(...args),
  "max": (...args: any[]) => Math.max(...args),
  "merge": (...args: any[]) => Array.prototype.reduce.call(args, (a: any, b: any) => (a as any[]).concat(b as any[]), []),
  "var": function(this: any, a: any, b?: any) {
    const not_found = b === undefined ? null : b;
    let data = this;
    if (typeof a === "undefined" || a === "" || a === null) {
      return data;
    }
    const sub_props = String(a).split(".");
    for (let i = 0; i < sub_props.length; i++) {
      if (data === null) {
        return not_found;
      }
      data = data[sub_props[i]];
      if (data === undefined) {
        return not_found;
      }
    }
    return data;
  },
  "missing": function(this: any, ...args: any[]) {
    const missing = [];
    const keys = Array.isArray(args[0]) ? args[0] : args;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = jsonLogic.apply({ var: key }, this);
      if (value === null || value === "") {
        missing.push(key);
      }
    }
    return missing;
  },
  "missing_some": function(this: any, need_count: number, options: any[]) {
    const are_missing = jsonLogic.apply({ missing: options }, this);
    if (options.length - are_missing.length >= need_count) {
      return [];
    } else {
      return are_missing;
    }
  },
  "if": (condition: any, then_value: any, else_value?: any) => {
    return jsonLogic.truthy(condition) ? then_value : else_value;
  },
  "and": (...args: any[]) => {
    for (let i = 0; i < args.length; i++) {
      if (!jsonLogic.truthy(args[i])) {
        return args[i];
      }
    }
    return args[args.length - 1];
  },
  "or": (...args: any[]) => {
    for (let i = 0; i < args.length; i++) {
      if (jsonLogic.truthy(args[i])) {
        return args[i];
      }
    }
    return args[args.length - 1];
  },
  "filter": function(this: any, array: any[], condition: any) {
    return array.filter((item) => {
      return jsonLogic.truthy(jsonLogic.apply(condition, item));
    });
  },
  "map": function(this: any, array: any[], transform: any) {
    return array.map((item) => {
      return jsonLogic.apply(transform, item);
    });
  },
  "reduce": function(this: any, array: any[], reducer: any, initial?: any) {
    return array.reduce((accumulator, current) => {
      return jsonLogic.apply(reducer, { current, accumulator });
    }, initial);
  },
  "some": function(this: any, array: any[], condition: any) {
    return array.some((item) => {
      return jsonLogic.truthy(jsonLogic.apply(condition, item));
    });
  },
  "none": function(this: any, array: any[], condition: any) {
    return !array.some((item) => {
      return jsonLogic.truthy(jsonLogic.apply(condition, item));
    });
  },
  "all": function(this: any, array: any[], condition: any) {
    return array.every((item) => {
      return jsonLogic.truthy(jsonLogic.apply(condition, item));
    });
  }
};

export const jsonLogic: JsonLogic = {
  is_logic(logic: any): boolean {
    return (
      typeof logic === "object" && // An object
      logic !== null && // but not null
      !Array.isArray(logic) && // and not an array
      Object.keys(logic).length === 1 // with exactly one key
    );
  },

  truthy(value: any): boolean {
    if (Array.isArray(value) && value.length === 0) {
      return false;
    }
    return !!value;
  },

  get_operator(logic: any): string {
    return Object.keys(logic)[0];
  },

  get_values(logic: any): any {
    return logic[this.get_operator(logic)];
  },

  apply(logic: any, data?: any): any {
    // Does this array contain logic? Only one way to find out.
    if (Array.isArray(logic)) {
      return logic.map((l) => this.apply(l, data));
    }
    
    // You've recursed to a primitive, stop!
    if (!this.is_logic(logic)) {
      return logic;
    }

    const operator = this.get_operator(logic);
    const values = this.get_values(logic);
    
    if (!operations[operator]) {
      throw new Error(`Unknown operation: ${operator}`);
    }

    // Build arguments array, recursively applying logic to each
    const args = Array.isArray(values) ? 
      values.map((val) => this.apply(val, data)) : 
      [this.apply(values, data)];

    // Call the operation with proper context
    return operations[operator].apply(data, args);
  },

  uses_data(logic: any): any[] {
    const collection = [];

    if (this.is_logic(logic)) {
      const operator = this.get_operator(logic);
      const values = this.get_values(logic);

      if (operator === "var") {
        // This rule *is* a variable
        collection.push(values);
      } else {
        // This rule *uses* a variable
        if (Array.isArray(values)) {
          values.forEach((val) => {
            collection.push(...this.uses_data(val));
          });
        } else {
          collection.push(...this.uses_data(values));
        }
      }
    }

    return collection;
  },

  add_operation(name: string, code: Function): void {
    operations[name] = code;
  },

  rm_operation(name: string): void {
    delete operations[name];
  },

  rule_like(_rule: any, _pattern: any): any {
    // This would need a more complex implementation for pattern matching
    // For now, just return false
    return false;
  }
};

/**
 * Helper functions for component conditional logic
 */
export class ComponentLogic {
  /**
   * Evaluate conditional logic for component visibility
   */
  static shouldShow(condition: any, data: any): boolean {
    if (typeof condition === 'boolean') return condition;
    if (typeof condition === 'string') {
      // Handle simple string conditions
      if (condition === 'true') return true;
      if (condition === 'false') return false;
      // Handle variable references
      if (condition.startsWith('{{') && condition.endsWith('}}')) {
        const varPath = condition.slice(2, -2).trim();
        return jsonLogic.truthy(jsonLogic.apply({ var: varPath }, data));
      }
    }
    
    // Handle JsonLogic conditions
    try {
      return jsonLogic.truthy(jsonLogic.apply(condition, data));
    } catch (error) {
      console.warn('Component condition evaluation failed:', error);
      return false;
    }
  }

  /**
   * Evaluate loop logic for component repetition
   */
  static getLoopItems(loopSpec: any, data: any): any[] {
    if (Array.isArray(loopSpec)) return loopSpec;
    
    if (typeof loopSpec === 'string') {
      // Handle "item in items" syntax
      const match = loopSpec.match(/^(\w+)\s+in\s+(.+)$/);
      if (match) {
        const [, , arrayPath] = match;
        const array = jsonLogic.apply({ var: arrayPath }, data);
        return Array.isArray(array) ? array : [];
      }
      
      // Handle direct variable reference
      const array = jsonLogic.apply({ var: loopSpec }, data);
      return Array.isArray(array) ? array : [];
    }
    
    // Handle JsonLogic array expressions
    try {
      const result = jsonLogic.apply(loopSpec, data);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.warn('Component loop evaluation failed:', error);
      return [];
    }
  }

  /**
   * Evaluate computed class names
   */
  static getClasses(classSpec: any, data: any): string {
    if (typeof classSpec === 'string') return classSpec;
    
    if (typeof classSpec === 'object' && !Array.isArray(classSpec)) {
      const classes = [];
      for (const [className, condition] of Object.entries(classSpec)) {
        if (this.shouldShow(condition, data)) {
          classes.push(className);
        }
      }
      return classes.join(' ');
    }
    
    return '';
  }

  /**
   * Create a scoped data context for loops
   */
  static createLoopContext(data: any, itemVar: string, item: any, index?: number): any {
    return {
      ...data,
      [itemVar]: item,
      $index: index,
      $first: index === 0,
      $last: false, // Would need array length to determine
      $even: index !== undefined ? index % 2 === 0 : false,
      $odd: index !== undefined ? index % 2 === 1 : false
    };
  }
}

/**
 * Parse attribute-based conditional expressions
 */
export class AttributeParser {
  /**
   * Parse data-annie-if attribute
   */
  static parseCondition(value: string): any {
    // Try JSON first
    try {
      return JSON.parse(value);
    } catch {}
    
    // Handle simple expressions
    if (value === 'true' || value === 'false') {
      return value === 'true';
    }
    
    // Handle variable references
    if (value.startsWith('{{') && value.endsWith('}}')) {
      return value;
    }
    
    // Handle simple comparisons like "user.isActive"
    return { var: value };
  }

  /**
   * Parse data-annie-for attribute
   */
  static parseLoop(value: string): { itemVar: string; arrayPath: string } | null {
    const match = value.match(/^(\w+)\s+in\s+(.+)$/);
    if (match) {
      return {
        itemVar: match[1],
        arrayPath: match[2]
      };
    }
    return null;
  }

  /**
   * Parse data-annie-class attribute
   */
  static parseClass(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value; // Return as string if not JSON
    }
  }
}