import { CanvasNode, CanvasEdge } from '@/types/canvas';

// ------------------------------------------------------------------
// Abstract Syntax Tree (AST) Definition for ML Code Synthesis
// ------------------------------------------------------------------

export type ASTNodeType = 
  | 'Program'
  | 'ClassDef'
  | 'FunctionDef'
  | 'Assignment'
  | 'MethodCall'
  | 'Instantiation'
  | 'ReturnStatement'
  | 'Literal'
  | 'Identifier'
  | 'Tuple'
  | 'List'
  | 'Dict'
  | 'Comment'
  | 'RawCode';

export interface ASTNode {
  type: ASTNodeType;
}

export class Identifier implements ASTNode {
  type: ASTNodeType = 'Identifier';
  constructor(public name: string) {}
}

export class Literal implements ASTNode {
  type: ASTNodeType = 'Literal';
  constructor(public value: any) {}
}

export class Tuple implements ASTNode {
  type: ASTNodeType = 'Tuple';
  constructor(public elements: ASTNode[]) {}
}

export class List implements ASTNode {
  type: ASTNodeType = 'List';
  constructor(public elements: ASTNode[]) {}
}

export class Dict implements ASTNode {
  type: ASTNodeType = 'Dict';
  constructor(public entries: { key: string; value: ASTNode }[]) {}
}

export class MethodCall implements ASTNode {
  type: ASTNodeType = 'MethodCall';
  constructor(
    public caller: ASTNode,
    public method: string,
    public args: ASTNode[] = [],
    public kwargs: Record<string, ASTNode> = {}
  ) {}
}

export class Instantiation implements ASTNode {
  type: ASTNodeType = 'Instantiation';
  constructor(
    public className: string,
    public args: ASTNode[] = [],
    public kwargs: Record<string, ASTNode> = {}
  ) {}
}

export class Assignment implements ASTNode {
  type: ASTNodeType = 'Assignment';
  constructor(
    public targets: ASTNode[],
    public value: ASTNode
  ) {}
}

export class ReturnStatement implements ASTNode {
  type: ASTNodeType = 'ReturnStatement';
  constructor(public value: ASTNode) {}
}

export class Comment implements ASTNode {
  type: ASTNodeType = 'Comment';
  constructor(public text: string) {}
}

export class RawCode implements ASTNode {
  type: ASTNodeType = 'RawCode';
  constructor(public code: string) {}
}

export class FunctionDef implements ASTNode {
  type: ASTNodeType = 'FunctionDef';
  constructor(
    public name: string,
    public args: string[],
    public body: ASTNode[],
    public docstring?: string
  ) {}
}

export class ClassDef implements ASTNode {
  type: ASTNodeType = 'ClassDef';
  constructor(
    public name: string,
    public baseClasses: string[],
    public body: ASTNode[],
    public docstring?: string
  ) {}
}

export class Program implements ASTNode {
  type: ASTNodeType = 'Program';
  constructor(public body: ASTNode[]) {}
}

// ------------------------------------------------------------------
// Code Generator Visitor
// ------------------------------------------------------------------

export class CodeGenerator {
  private indentLevel = 0;
  private indentStr = '    ';

  private indent(): string {
    return this.indentStr.repeat(this.indentLevel);
  }

  public generate(node: ASTNode): string {
    switch (node.type) {
      case 'Program':
        return (node as Program).body.map(n => this.generate(n)).join('\n');
        
      case 'ClassDef': {
        const cdef = node as ClassDef;
        const bases = cdef.baseClasses.length > 0 ? `(${cdef.baseClasses.join(', ')})` : '';
        let code = `${this.indent()}class ${cdef.name}${bases}:\n`;
        this.indentLevel++;
        if (cdef.docstring) {
          code += `${this.indent()}"""\n${this.indent()}${cdef.docstring.replace(/\n/g, `\n${this.indent()}`)}\n${this.indent()}"""\n`;
        }
        if (cdef.body.length === 0) {
          code += `${this.indent()}pass\n`;
        } else {
          code += cdef.body.map(n => this.generate(n)).join('\n\n') + '\n';
        }
        this.indentLevel--;
        return code;
      }

      case 'FunctionDef': {
        const fdef = node as FunctionDef;
        let code = `${this.indent()}def ${fdef.name}(${fdef.args.join(', ')}):\n`;
        this.indentLevel++;
        if (fdef.docstring) {
          code += `${this.indent()}"""\n${this.indent()}${fdef.docstring.replace(/\n/g, `\n${this.indent()}`)}\n${this.indent()}"""\n`;
        }
        if (fdef.body.length === 0) {
          code += `${this.indent()}pass\n`;
        } else {
          code += fdef.body.map(n => this.generate(n)).join('\n');
        }
        this.indentLevel--;
        return code;
      }

      case 'Assignment': {
        const assign = node as Assignment;
        const targetsStr = assign.targets.map(t => this.generate(t)).join(', ');
        const valStr = this.generate(assign.value);
        return `${this.indent()}${targetsStr} = ${valStr}`;
      }

      case 'MethodCall': {
        const mcall = node as MethodCall;
        const callerStr = this.generate(mcall.caller);
        const argsStr = mcall.args.map(a => this.generate(a)).join(', ');
        const kwargsStr = Object.entries(mcall.kwargs).map(([k, v]) => `${k}=${this.generate(v)}`).join(', ');
        const allArgs = [argsStr, kwargsStr].filter(Boolean).join(', ');
        
        // Multi-line formatting if args are too long
        if (allArgs.length > 60 && mcall.caller.type !== 'Identifier') {
           const formattedArgs = mcall.args.map(a => `\n${this.indent()}${this.indentStr}${this.generate(a)}`).join(',');
           const formattedKwargs = Object.entries(mcall.kwargs).map(([k, v]) => `\n${this.indent()}${this.indentStr}${k}=${this.generate(v)}`).join(',');
           const allFormattedArgs = [formattedArgs, formattedKwargs].filter(Boolean).join(',');
           return `${callerStr}.${mcall.method}(${allFormattedArgs}\n${this.indent()})`;
        }
        
        return `${callerStr}.${mcall.method}(${allArgs})`;
      }

      case 'Instantiation': {
        const inst = node as Instantiation;
        const argsStr = inst.args.map(a => this.generate(a)).join(', ');
        const kwargsStr = Object.entries(inst.kwargs).map(([k, v]) => `${k}=${this.generate(v)}`).join(', ');
        const allArgs = [argsStr, kwargsStr].filter(Boolean).join(', ');
        
        if (allArgs.length > 60) {
           const formattedArgs = inst.args.map(a => `\n${this.indent()}${this.indentStr}${this.generate(a)}`).join(',');
           const formattedKwargs = Object.entries(inst.kwargs).map(([k, v]) => `\n${this.indent()}${this.indentStr}${k}=${this.generate(v)}`).join(',');
           const allFormattedArgs = [formattedArgs, formattedKwargs].filter(Boolean).join(',');
           return `${inst.className}(${allFormattedArgs}\n${this.indent()})`;
        }
        
        return `${inst.className}(${allArgs})`;
      }

      case 'ReturnStatement': {
        const ret = node as ReturnStatement;
        return `${this.indent()}return ${this.generate(ret.value)}`;
      }

      case 'Literal': {
        const lit = node as Literal;
        if (typeof lit.value === 'string') return `"${lit.value}"`;
        if (lit.value === null) return 'None';
        if (typeof lit.value === 'boolean') return lit.value ? 'True' : 'False';
        return String(lit.value);
      }

      case 'Identifier':
        return (node as Identifier).name;

      case 'Tuple': {
        const tup = node as Tuple;
        return `(${tup.elements.map(e => this.generate(e)).join(', ')})`;
      }

      case 'List': {
        const lst = node as List;
        return `[${lst.elements.map(e => this.generate(e)).join(', ')}]`;
      }

      case 'Dict': {
        const dict = node as Dict;
        const entries = dict.entries.map(e => `"${e.key}": ${this.generate(e.value)}`).join(', ');
        return `{${entries}}`;
      }

      case 'Comment': {
        const cmt = node as Comment;
        return `${this.indent()}# ${cmt.text}`;
      }

      case 'RawCode': {
        const raw = node as RawCode;
        return raw.code.split('\n').map(line => line ? `${this.indent()}${line}` : '').join('\n');
      }

      default:
        throw new Error(`Unknown AST node type: ${(node as any).type}`);
    }
  }
}

// ------------------------------------------------------------------
// Topological Sort Utility for AST Generation
// ------------------------------------------------------------------

export function getTopologicalOrder(nodes: CanvasNode[], edges: CanvasEdge[]): CanvasNode[] {
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  
  nodes.forEach(n => {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  });
  
  edges.forEach(e => {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  });
  
  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });
  
  const order: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);
    
    const neighbors = adj.get(u) || [];
    neighbors.forEach(v => {
      inDegree.set(v, inDegree.get(v)! - 1);
      if (inDegree.get(v) === 0) {
        queue.push(v);
      }
    });
  }
  
  return order.map(id => nodes.find(n => n.id === id)!).filter(Boolean);
}

export function cleanVarName(id: string, type: string, name?: string): string {
  let base = (name || type || 'layer').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (!/^[a-z_]/.test(base)) {
    base = 'node_' + base;
  }
  const idHash = id.replace(/-/g, '').substring(0, 8);
  return `${base}_${idHash}`;
}
