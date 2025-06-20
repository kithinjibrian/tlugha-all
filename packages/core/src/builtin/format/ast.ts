import { Token } from "./lexer";

export interface ASTVisitor {
    visitProgString?(node: StringProgNode, args?: Record<string, any>): any;
    visitSourceElements?(node: SourceElementsNode, args?: Record<string, any>): any;
    visitText?(node: TextNode, args?: Record<string, any>): any;
    visitPlaceholder?(node: PlaceholderNode, args?: Record<string, any>): any;
}

export interface ASTNode {
    type: string;
    token: Token | null;
    accept(visitor: ASTVisitor, args?: Record<string, any>): any;
}

export abstract class ASTNodeBase implements ASTNode {
    abstract type: string;
    abstract token: Token | null;

    async accept(visitor: ASTVisitor, args?: Record<string, any>) {
        return await this._accept(visitor, args);
    }

    abstract _accept(visitor: ASTVisitor, args?: Record<string, any>): any;
}

export class StringProgNode extends ASTNodeBase {
    type = 'String';

    constructor(
        public token: Token | null,
        public program: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitProgString?.(this, args);
    }
}

export class SourceElementsNode extends ASTNodeBase {
    type = 'SourceElements';

    constructor(
        public token: Token | null,
        public sources: ASTNode[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitSourceElements?.(this, args);
    }
}

export class TextNode extends ASTNodeBase {
    type = 'Text';

    constructor(
        public token: Token | null,
        public value: string
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitText?.(this, args);
    }
}

export class PlaceholderNode extends ASTNodeBase {
    type = 'Placeholder';

    constructor(
        public token: Token | null,
        public field: number | string,
        public width?: number,
        public alignment?: string,
        public data_type?: string,
        public fill?: string,
        public precision?: number,
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitPlaceholder?.(this, args);
    }
}