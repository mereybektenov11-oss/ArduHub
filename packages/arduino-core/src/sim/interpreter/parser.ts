/** Deliberately small Arduino grammar. Source is data; it is never evaluated as JS. */
export class InterpreterError extends Error {
  constructor(
    public readonly kind: "syntax" | "unsupported" | "runtime" | "limit",
    message: string,
  ) {
    super(message);
    this.name = "InterpreterError";
  }
}
export type Expr =
  | { type: "literal"; value: number | string }
  | { type: "variable"; name: string }
  | { type: "call"; name: string; args: Expr[] }
  | { type: "unary"; op: string; value: Expr }
  | { type: "binary"; op: string; left: Expr; right: Expr }
  | { type: "conditional"; condition: Expr; yes: Expr; no: Expr }
  | { type: "assign"; name: string; op: string; value: Expr };
export type Statement =
  | { type: "block"; body: Statement[] }
  | { type: "declare"; name: string; constant: boolean; value: Expr }
  | { type: "expression"; value: Expr }
  | { type: "if"; condition: Expr; yes: Statement; no?: Statement }
  | { type: "while"; condition: Expr; body: Statement }
  | {
      type: "for";
      init?: Statement;
      condition?: Expr;
      update?: Expr;
      body: Statement;
    };
export type ArduinoProgram = {
  globals: Statement[];
  setup: Statement;
  loop: Statement;
};
const calls: Record<string, readonly [number, number]> = {
  pinMode: [2, 2],
  digitalWrite: [2, 2],
  digitalRead: [1, 1],
  analogWrite: [2, 2],
  analogRead: [1, 1],
  delay: [1, 1],
  "Serial.begin": [1, 1],
  "Serial.print": [1, 1],
  "Serial.println": [0, 1],
  tone: [2, 3],
  noTone: [1, 1],
};
export const constants: Readonly<Record<string, number>> = {
  HIGH: 1,
  LOW: 0,
  OUTPUT: 1,
  INPUT: 0,
  INPUT_PULLUP: 2,
  LED_BUILTIN: 13,
  A0: 14,
  A1: 15,
  A2: 16,
  A3: 17,
  A4: 18,
  A5: 19,
  true: 1,
  false: 0,
};
const precedence: Record<string, number> = {
  "=": 1,
  "+=": 1,
  "-=": 1,
  "*=": 1,
  "/=": 1,
  "%=": 1,
  "||": 3,
  "&&": 4,
  "==": 5,
  "!=": 5,
  "<": 6,
  "<=": 6,
  ">": 6,
  ">=": 6,
  "+": 7,
  "-": 7,
  "*": 8,
  "/": 8,
  "%": 8,
};

function tokenize(source: string): string[] {
  if (source.length > 32000)
    throw new InterpreterError("limit", "Source is too long");
  const out: string[] = [];
  const token =
    /\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\\r\n]|\\["\\nrt])*"|(?:\d+)|(?:[A-Za-z_]\w*)|(?:\+\+|--|\+=|-=|\*=|\/=|%=|==|!=|<=|>=|&&|\|\|)|[{}();,.?:+\-*/%!=<>]/y;
  let offset = 0;
  while (offset < source.length) {
    token.lastIndex = offset;
    const match = token.exec(source);
    if (!match)
      throw new InterpreterError(
        "unsupported",
        `Unsupported token at ${offset}`,
      );
    offset = token.lastIndex;
    if (!/^\s|^\/\//.test(match[0]) && !match[0].startsWith("/*"))
      out.push(match[0]);
    if (out.length > 12000)
      throw new InterpreterError("limit", "Too many tokens");
  }
  return out;
}

class Parser {
  private i = 0;
  private depth = 0;
  constructor(private tokens: string[]) {}
  private peek() {
    return this.tokens[this.i];
  }
  private take(expected?: string) {
    const token = this.tokens[this.i++];
    if (!token || (expected !== undefined && token !== expected))
      throw new InterpreterError("syntax", `Expected ${expected ?? "token"}`);
    return token;
  }
  private accept(token: string) {
    if (this.peek() !== token) return false;
    this.i++;
    return true;
  }
  private identifier() {
    const token = this.take();
    if (
      !/^[A-Za-z_]\w*$/.test(token) ||
      ["void", "int", "const", "if", "else", "while", "for"].includes(token) ||
      Object.hasOwn(constants, token)
    )
      throw new InterpreterError("syntax", "Expected variable name");
    return token;
  }
  parse(): ArduinoProgram {
    const globals: Statement[] = [];
    const funcs: Partial<Record<"setup" | "loop", Statement>> = {};
    while (this.peek()) {
      if (this.peek() === "int" || this.peek() === "const") {
        globals.push(this.declaration());
        this.take(";");
        continue;
      }
      this.take("void");
      const name = this.take();
      if (name !== "setup" && name !== "loop")
        throw new InterpreterError(
          "unsupported",
          "Only setup and loop are supported",
        );
      if (funcs[name])
        throw new InterpreterError("syntax", "Duplicate function");
      this.take("(");
      this.take(")");
      if (this.peek() !== "{")
        throw new InterpreterError("syntax", "Expected function body");
      funcs[name] = this.statement();
    }
    if (!funcs.setup || !funcs.loop)
      throw new InterpreterError("syntax", "setup and loop are required");
    return { globals, setup: funcs.setup, loop: funcs.loop };
  }
  private declaration(): Statement {
    const constant = this.accept("const");
    this.take("int");
    const name = this.identifier();
    if (constant && this.peek() !== "=")
      throw new InterpreterError("syntax", "Constant needs a value");
    const value: Expr = this.accept("=")
      ? this.expression()
      : { type: "literal", value: 0 };
    return { type: "declare", name, constant, value };
  }
  private statement(): Statement {
    if (++this.depth > 80)
      throw new InterpreterError("limit", "Nesting is too deep");
    try {
      return this.readStatement();
    } finally {
      this.depth--;
    }
  }
  private readStatement(): Statement {
    if (this.accept("{")) {
      const body: Statement[] = [];
      while (this.peek() !== "}") {
        if (!this.peek())
          throw new InterpreterError("syntax", "Unclosed block");
        body.push(this.statement());
      }
      this.take("}");
      return { type: "block", body };
    }
    if (this.accept(";")) return { type: "block", body: [] };
    if (this.accept("if")) {
      this.take("(");
      const condition = this.expression();
      this.take(")");
      const yes = this.statement();
      const no = this.accept("else") ? this.statement() : undefined;
      return { type: "if", condition, yes, no };
    }
    if (this.accept("while")) {
      this.take("(");
      const condition = this.expression();
      this.take(")");
      return { type: "while", condition, body: this.statement() };
    }
    if (this.accept("for")) {
      this.take("(");
      const init =
        this.peek() === ";"
          ? undefined
          : this.peek() === "int" || this.peek() === "const"
            ? this.declaration()
            : { type: "expression" as const, value: this.expression() };
      this.take(";");
      const condition = this.peek() === ";" ? undefined : this.expression();
      this.take(";");
      const update = this.peek() === ")" ? undefined : this.expression();
      this.take(")");
      return { type: "for", init, condition, update, body: this.statement() };
    }
    const result =
      this.peek() === "int" || this.peek() === "const"
        ? this.declaration()
        : { type: "expression" as const, value: this.expression() };
    this.take(";");
    return result;
  }
  private expression(min = 1): Expr {
    if (++this.depth > 80)
      throw new InterpreterError("limit", "Expression is too deep");
    try {
      return this.readExpression(min);
    } finally {
      this.depth--;
    }
  }
  private readExpression(min: number): Expr {
    let left = this.primary();
    while (this.peek()) {
      if (this.peek() === "?" && min <= 2) {
        this.take();
        const yes = this.expression();
        this.take(":");
        const no = this.expression(2);
        left = { type: "conditional", condition: left, yes, no };
        continue;
      }
      const op = this.peek(),
        p = Object.hasOwn(precedence, op) ? precedence[op] : undefined;
      if (!p || p < min) break;
      this.take();
      const right = this.expression(p === 1 ? p : p + 1);
      if (p === 1) {
        if (left.type !== "variable")
          throw new InterpreterError("syntax", "Assignment needs a variable");
        left = { type: "assign", name: left.name, op, value: right };
      } else left = { type: "binary", op, left, right };
    }
    return left;
  }
  private primary(): Expr {
    const token = this.take();
    if (["!", "-", "+"].includes(token))
      return { type: "unary", op: token, value: this.expression(9) };
    if (token === "(") {
      const expr = this.expression();
      this.take(")");
      return expr;
    }
    if (/^\d+$/.test(token)) return { type: "literal", value: Number(token) };
    if (token.startsWith('"'))
      return { type: "literal", value: JSON.parse(token) as string };
    if (!/^[A-Za-z_]\w*$/.test(token))
      throw new InterpreterError("syntax", "Expected expression");
    let name = token;
    if (this.accept(".")) name += "." + this.take();
    if (this.accept("(")) {
      const args: Expr[] = [];
      if (this.peek() !== ")")
        do {
          args.push(this.expression());
        } while (this.accept(","));
      this.take(")");
      const arity = Object.hasOwn(calls, name) ? calls[name] : undefined;
      if (!arity || args.length < arity[0] || args.length > arity[1])
        throw new InterpreterError("unsupported", `Unsupported call ${name}`);
      return { type: "call", name, args };
    }
    if (name.includes("."))
      throw new InterpreterError("unsupported", "Unsupported member access");
    if (this.peek() === "++" || this.peek() === "--") {
      const op = this.take();
      return {
        type: "assign",
        name,
        op: op === "++" ? "+=" : "-=",
        value: { type: "literal", value: 1 },
      };
    }
    return { type: "variable", name };
  }
}

export function parseArduino(source: string): ArduinoProgram {
  const program = new Parser(tokenize(source)).parse();
  // Validate every branch before execution, including unreachable code.
  const scopes: Map<string, boolean>[] = [new Map()];
  const variable = (name: string) => {
    for (let i = scopes.length - 1; i >= 0; i--)
      if (scopes[i].has(name)) return scopes[i].get(name)!;
    throw new InterpreterError("unsupported", `Unknown variable ${name}`);
  };
  const expression = (expr: Expr, depth = 0, allowDelay = false): void => {
    if (depth > 80)
      throw new InterpreterError("limit", "Expression is too deep");
    switch (expr.type) {
      case "literal":
        break;
      case "variable":
        if (!Object.hasOwn(constants, expr.name)) variable(expr.name);
        break;
      case "assign":
        if (variable(expr.name))
          throw new InterpreterError("syntax", "Cannot modify a constant");
        expression(expr.value, depth + 1);
        break;
      case "unary":
        expression(expr.value, depth + 1);
        break;
      case "binary":
        expression(expr.left, depth + 1);
        expression(expr.right, depth + 1);
        break;
      case "conditional":
        expression(expr.condition, depth + 1);
        expression(expr.yes, depth + 1);
        expression(expr.no, depth + 1);
        break;
      case "call":
        if (expr.name === "delay" && !allowDelay)
          throw new InterpreterError(
            "unsupported",
            "delay must be a statement",
          );
        for (const arg of expr.args) expression(arg, depth + 1);
        break;
    }
  };
  const statement = (stmt: Statement): void => {
    switch (stmt.type) {
      case "block":
        scopes.push(new Map());
        for (const child of stmt.body) statement(child);
        scopes.pop();
        break;
      case "declare": {
        expression(stmt.value);
        const scope = scopes[scopes.length - 1];
        if (scope.has(stmt.name))
          throw new InterpreterError("syntax", "Duplicate variable");
        scope.set(stmt.name, stmt.constant);
        break;
      }
      case "expression":
        expression(stmt.value, 0, true);
        break;
      case "if":
        expression(stmt.condition);
        statement(stmt.yes);
        if (stmt.no) statement(stmt.no);
        break;
      case "while":
        expression(stmt.condition);
        statement(stmt.body);
        break;
      case "for":
        scopes.push(new Map());
        if (stmt.init) statement(stmt.init);
        if (stmt.condition) expression(stmt.condition);
        if (stmt.update) expression(stmt.update);
        statement(stmt.body);
        scopes.pop();
        break;
    }
  };
  for (const global of program.globals) statement(global);
  statement(program.setup);
  statement(program.loop);
  return program;
}
export function canInterpretArduino(source: string): boolean {
  try {
    parseArduino(source);
    return true;
  } catch {
    return false;
  }
}
