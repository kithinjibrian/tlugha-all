import { Frame, id, Module, StructType, Token } from "../types";

export interface ASTVisitor {
    before_accept?(node: ASTNode, args?: Record<string, any>): any;
    after_accept?(node: ASTNode, args?: Record<string, any>): any;
    visitNumber?(node: NumberNode, args?: Record<string, any>): any;
    visitBoolean?(node: BooleanNode, args?: Record<string, any>): any;
    visitString?(node: StringNode, args?: Record<string, any>): any;
    visitIfLet?(node: IfLetNode, args?: Record<string, any>): any;
    visitMatch?(node: MatchNode, args?: Record<string, any>): any;
    visitMatchArm?(node: MatchArmNode, args?: Record<string, any>): any;
    visitEnumPattern?(node: EnumPatternNode, args?: Record<string, any>): any;
    visitStructPattern?(node: StructPatternNode, args?: Record<string, any>): any;
    visitFieldPattern?(node: FieldPatternNode, args?: Record<string, any>): any;
    visitTuplePattern?(node: TuplePatternNode, args?: Record<string, any>): any;
    visitProgram?(node: ProgramNode, args?: Record<string, any>): any;
    visitSourceElements?(node: SourceElementsNode, args?: Record<string, any>): any;
    visitBlock?(node: BlockNode, args?: Record<string, any>): any;
    visitWhile?(node: WhileNode, args?: Record<string, any>): any;
    visitFor?(node: ForNode, args?: Record<string, any>): any;
    visitAttribute?(node: AttributeNode, args?: Record<string, any>): any;
    visitMetaItem?(node: MetaItemNode, args?: Record<string, any>): any;
    visitMetaSeqItem?(node: MetaSeqItemNode, args?: Record<string, any>): any;
    visitFunctionDec?(node: FunctionDecNode, args?: Record<string, any>): any;
    visitMemberDec?(node: MemberDecNode, args?: Record<string, any>): any;
    visitLambda?(node: LambdaNode, args?: Record<string, any>): any;
    visitContinuation?(node: ContinuationNode, args?: Record<string, any>): any;
    visitParametersList?(node: ParametersListNode, args?: Record<string, any>): any;
    visitParameter?(node: ParameterNode, args?: Record<string, any>): any;
    visitReturn?(node: ReturnNode, args?: Record<string, any>): any;
    visitBreak?(node: ASTNode, args?: Record<string, any>): any;
    visitContinue?(node: ASTNode, args?: Record<string, any>): any;
    visitVariableList?(node: VariableStatementNode, args?: Record<string, any>): any;
    visitVariable?(node: VariableNode, args?: Record<string, any>): any;
    visitAlias?(node: AliasNode, args?: Record<string, any>): any;
    visitExpressionStatement?(node: ExpressionStatementNode, args?: Record<string, any>): any;
    visitAssignmentExpression?(node: BinaryOpNode, args?: Record<string, any>): any;
    visitTertiaryExpression?(node: ASTNode, args?: Record<string, any>): any;
    visitExpression?(node: ExpressionNode, args?: Record<string, any>): any;
    visitArray?(node: ArrayNode, args?: Record<string, any>): any;
    visitMap?(node: MapNode, args?: Record<string, any>): any;
    visitSet?(node: SetNode, args?: Record<string, any>): any;
    visitTuple?(node: TupleNode, args?: Record<string, any>): any;
    visitStructInit?(node: StructInitNode, args?: Record<string, any>): any;
    visitStructAlreadyInit?(node: StructAlreadyInitNode, args?: Record<string, any>): any;
    visitStructField?(node: StructFieldNode, args?: Record<string, any>): any;
    visitProperty?(node: PropertyNode, args?: Record<string, any>): any;
    visitBinaryOp?(node: BinaryOpNode, args?: Record<string, any>): any;
    visitTertiaryExpression?(node: TertiaryExpressionNode, args?: Record<string, any>): any;
    visitIfElse?(node: IfElseNode, args?: Record<string, any>): any;
    visitUnaryOp?(node: UnaryOpNode, args?: Record<string, any>): any;
    visitMemberExpression?(node: MemberExpressionNode, args?: Record<string, any>): any;
    visitCallExpression?(node: CallExpressionNode, args?: Record<string, any>): any;
    visitMacroFunction?(node: MacroFunctionNode, args?: Record<string, any>): any;
    visitArrowExpression?(node: ArrowExpressionNode, args?: Record<string, any>): any;
    visitPostfixExpression?(node: PostfixExpressionNode, args?: Record<string, any>): any;
    visitSpreadElement?(node: SpreadElementNode, args?: Record<string, any>): any;
    visitIdentifier?(node: IdentifierNode, args?: Record<string, any>): any;
    visitWildcard?(node: WildcardNode, args?: Record<string, any>): any;
    visitScopedIdentifier?(node: ScopedIdentifierNode, args?: Record<string, any>): any;
    visitType?(node: TypeNode, args?: Record<string, any>): any;
    visitAssignment?(node: AssignmentNode, args?: Record<string, any>): any;
    visitTypeParameter?(node: TypeParameterNode, args?: Record<string, any>): any;
    visitGenericType?(node: GenericTypeNode, args?: Record<string, any>): any;
    visitStruct?(node: StructNode, args?: Record<string, any>): any;
    visitImpl?(node: ImplNode, args?: Record<string, any>): any;
    visitTagged?(node: TaggedNode, args?: Record<string, any>): any;
    visitField?(node: FieldNode, args?: Record<string, any>): any;
    visitEnum?(node: EnumNode, args?: Record<string, any>): any;
    visitEnumVariant?(node: EnumVariantNode, args?: Record<string, any>): any;
    visitTupleVariant?(node: TupleVariantNode, args?: Record<string, any>): any;
    visitModule?(node: ModuleNode, args?: Record<string, any>): any;
    visitImport?(node: ImportNode, args?: Record<string, any>): any;
    visitUse?(node: UseNode, args?: Record<string, any>): any;
    visitUsePath?(node: UsePathNode, args?: Record<string, any>): any;
    visitUseList?(node: UseListNode, args?: Record<string, any>): any;
    visitUseItem?(node: UseItemNode, args?: Record<string, any>): any;
    visitRangeExpression?(node: ASTNode, args?: Record<string, any>): any;
}


export interface ASTNode {
    type: string;
    token: Token | null;
    attributes?: AttributeNode[];
    parent?: ASTNode;
    hot: Map<string, any>;
    accept(visitor: ASTVisitor, args?: Record<string, any>): any;
}

export abstract class ASTNodeBase implements ASTNode {
    abstract type: string;
    abstract token: Token | null;
    public hot: Map<string, any> = new Map();

    constructor(
        public parent?: ASTNode,
        public attributes?: AttributeNode[],
    ) { }

    async accept(visitor: ASTVisitor, args?: Record<string, any>) {
        await visitor.before_accept?.(this, args);
        const res = await this._accept(visitor, args);
        await visitor.after_accept?.(this, args);

        return res;
    }

    abstract _accept(visitor: ASTVisitor, args?: Record<string, any>): any;
}

export class ProgramNode extends ASTNodeBase {
    type = 'ProgramNode';

    constructor(
        public token: Token | null,
        public program: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitProgram?.(this, args);
    }
}

export class SourceElementsNode extends ASTNodeBase {
    type = 'SourceElements';

    constructor(
        public token: Token | null,
        public sources: ASTNode[]
    ) {
        super();

        for (let src of sources) {
            src.parent = this;
        }
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitSourceElements?.(this, args);
    }
}

export class BlockNode extends ASTNodeBase {
    type = 'Block';

    constructor(
        public token: Token | null,
        public body: ASTNode[],
        public name: string = ""
    ) {
        super();

        for (let node of body) {
            node.parent = this;
        }
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitBlock?.(this, args);
    }
}

export class WhileNode extends ASTNodeBase {
    type = 'While';

    constructor(
        public token: Token | null,
        public expression: ASTNode,
        public body: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitWhile?.(this, args);
    }
}

export class ForNode extends ASTNodeBase {
    type = 'For';

    constructor(
        public token: Token | null,
        public variable: IdentifierNode,
        public expression: ASTNode,
        public body: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitFor?.(this, args);
    }
}

export class ContinuationNode extends ASTNodeBase {
    type = "Continuation";

    constructor(
        public token: Token | null,
        public params: any[],
        public body: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitContinuation?.(this, args);
    }
}

export class AttributeNode extends ASTNodeBase {
    type = 'Attribute';

    constructor(
        public token: Token | null,
        public meta: MetaItemNode,
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitAttribute?.(this, args);
    }
}

export class MetaItemNode extends ASTNodeBase {
    type = 'MetaItem';

    constructor(
        public token: Token | null,
        public path: ScopedIdentifierNode,
        public value?: ASTNode,
        public meta?: MetaSeqItemNode[],
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMetaItem?.(this, args);
    }
}

export class MetaSeqItemNode extends ASTNodeBase {
    type = 'MetaSeqItem';

    constructor(
        public token: Token | null,
        public meta?: MetaItemNode,
        public literal?: ASTNode,
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMetaSeqItem?.(this, args);
    }
}

export class FunctionDecNode extends ASTNodeBase {
    type = 'FunctionDec';
    public frame: Frame | null = null;
    public module: Module | null = null;

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode,
        public params: ParametersListNode | undefined,
        public body: BlockNode,
        public inbuilt: boolean = false,
        public is_: boolean = false,
        public exported: boolean = false,
        public type_parameters?: TypeParameterNode[],
        public return_type?: ASTNode,
        attributes?: AttributeNode[]
    ) {
        super(
            undefined,
            attributes
        );
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitFunctionDec?.(this, args);
    }
}

export class MemberDecNode extends FunctionDecNode {
    type = 'MemberDec';

    constructor(
        public token: Token | null,
        fun: FunctionDecNode,
    ) {
        super(
            token,
            fun.identifier,
            fun.params,
            fun.body,
            fun.inbuilt,
            fun.is_,
            fun.exported,
            fun.type_parameters,
            fun.return_type
        );
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMemberDec?.(this, args);
    }
}

export class LambdaNode extends ASTNodeBase {
    type = 'Lambda';
    public frame: Frame | null = null;
    public module: Module | null = null;

    constructor(
        public token: Token | null,
        public params: ParametersListNode | undefined,
        public body: ASTNode,
        public is_async: boolean = false,
        public type_parameters?: TypeParameterNode[],
        public return_type?: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitLambda?.(this, args);
    }
}

export class ParametersListNode extends ASTNodeBase {
    type = 'ParametersList';

    constructor(
        public token: Token | null,
        public parameters: ParameterNode[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitParametersList?.(this, args);
    }
}

export class ParameterNode extends ASTNodeBase {
    type = 'Parameter';

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode,
        public variadic: boolean,
        public mutable: boolean,
        public data_type: ASTNode | null,
        public expression?: ASTNode,
        public value?: any
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitParameter?.(this, args);
    }
}

export class ReturnNode extends ASTNodeBase {
    type = 'Return';

    constructor(
        public token: Token | null,
        public expression?: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitReturn?.(this, args);
    }
}

export class VariableStatementNode extends ASTNodeBase {
    type = 'Let';

    constructor(
        public token: Token | null,
        public variables: VariableNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitVariableList?.(this, args);
    }
}

export class AliasNode extends ASTNodeBase {
    type = 'Alias';

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode,
        public data_type?: any,
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitAlias?.(this, args);
    }
}

export class Lifetime {
    id: string;

    constructor(
        public startNode?: ASTNode,
        public endNode?: ASTNode,
    ) {
        this.id = id();
    }
}

export class ActiveBorrow {
    type: 'shared' | 'mutable';
    borrowerNode: ScopedIdentifierNode;
    lifetime: Lifetime;

    constructor(
        type: 'shared' | 'mutable',
        borrowerNode: ScopedIdentifierNode,
        lifetime: Lifetime
    ) {
        this.type = type;
        this.borrowerNode = borrowerNode;
        this.lifetime = lifetime;
    }
}

export class VariableNode extends ASTNodeBase {
    type = 'Variable';
    public moved: boolean = false;
    public active_borrows: ActiveBorrow[] = [];
    public owner_lifetime: Lifetime;

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode,
        public constant: boolean,
        public mutable: boolean,
        public expression?: ASTNode,
        public value?: any,
        public data_type?: any,
    ) {
        super();

        this.owner_lifetime = new Lifetime();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitVariable?.(this, args);
    }
}

export class ExpressionStatementNode extends ASTNodeBase {
    type = 'ExpressionStatement';

    constructor(
        public token: Token | null,
        public expression: ASTNode
    ) {
        super();

        expression.parent = this;
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitExpressionStatement?.(this, args);
    }
}

export class ExpressionNode extends ASTNodeBase {
    type = 'Expression';

    constructor(
        public token: Token | null,
        public expression: ASTNode
    ) {
        super();

        expression.parent = this;
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitExpression?.(this, args);
    }
}

export class NumberNode extends ASTNodeBase {
    type = 'Number';

    constructor(
        public token: Token | null,
        public value: number
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitNumber?.(this, args);
    }
}

export class BooleanNode extends ASTNodeBase {
    type = 'Boolean';

    constructor(
        public token: Token | null,
        public value: boolean
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitBoolean?.(this, args);
    }
}

export class StringNode extends ASTNodeBase {
    type = 'String';

    constructor(
        public token: Token | null,
        public value: string,
        public is_raw = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitString?.(this, args);
    }
}

export class IfLetNode extends ASTNodeBase {
    type = 'IfLet';

    constructor(
        public token: Token | null,
        public pattern: ASTNode,
        public expression: ASTNode,
        public consequent: ASTNode,
        public alternate?: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitIfLet?.(this, args);
    }
}

export class MatchNode extends ASTNodeBase {
    type = 'Match';

    constructor(
        public token: Token | null,
        public expression: ASTNode,
        public arms: MatchArmNode[],
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMatch?.(this, args);
    }
}

export class MatchArmNode extends ASTNodeBase {
    type = 'MatchArm';

    constructor(
        public token: Token | null,
        public pattern: ASTNode,
        public guard: ASTNode | null,
        public exp_block: ASTNode,
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMatchArm?.(this, args);
    }
}

export class FieldPatternNode extends ASTNodeBase {
    type = 'FieldPattern';

    constructor(
        public token: Token | null,
        public iden: IdentifierNode,
        public patterns?: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitFieldPattern?.(this, args);
    }
}

export class StructPatternNode extends ASTNodeBase {
    type = 'StructPattern';

    constructor(
        public token: Token | null,
        public path: ASTNode,
        public patterns: FieldPatternNode[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitStructPattern?.(this, args);
    }
}

export class EnumPatternNode extends ASTNodeBase {
    type = 'EnumPattern';

    constructor(
        public token: Token | null,
        public path: ASTNode,
        public patterns?: ASTNode[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitEnumPattern?.(this, args);
    }
}

export class TuplePatternNode extends ASTNodeBase {
    type = 'TuplePattern';

    constructor(
        public token: Token | null,
        public patterns: ASTNode[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTuplePattern?.(this, args);
    }
}

export class ArrayNode extends ASTNodeBase {
    type = 'Array';

    constructor(
        public token: Token | null,
        public elements: ASTNode[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitArray?.(this, args);
    }
}

export class MapNode extends ASTNodeBase {
    type = 'Map';

    constructor(
        public token: Token | null,
        public properties: PropertyNode[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMap?.(this, args);
    }
}

export class SetNode extends ASTNodeBase {
    type = 'Set';

    constructor(
        public token: Token | null,
        public values: ASTNode[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitSet?.(this, args);
    }
}

export class TupleNode extends ASTNodeBase {
    type = 'Tuple';

    constructor(
        public token: Token | null,
        public values: ASTNode[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTuple?.(this, args);
    }
}

export class MacroFunctionNode extends ASTNodeBase {
    type = 'MacroFunction';

    constructor(
        public token: Token | null,
        public name: ScopedIdentifierNode,
        public args: ASTNode[],
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMacroFunction?.(this, args);
    }
}

export class StructInitNode extends ASTNodeBase {
    type = 'StructInit';

    constructor(
        public token: Token | null,
        public name: ASTNode,
        public fields: StructFieldNode[],
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitStructInit?.(this, args);
    }
}

export class StructAlreadyInitNode extends ASTNodeBase {
    type = 'StructAlreadyInit';

    constructor(
        public token: Token | null,
        public struct: StructType,
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitStructAlreadyInit?.(this, args);
    }
}

export class StructFieldNode extends ASTNodeBase {
    type = 'StructField';

    constructor(
        public token: Token | null,
        public iden: IdentifierNode,
        public expression?: ASTNode,
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitStructField?.(this, args);
    }
}

export class PropertyNode extends ASTNodeBase {
    type = 'Property';

    constructor(
        public token: Token | null,
        public key: string,
        public value?: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitProperty?.(this, args);
    }
}

export class AssignmentExpressionNode extends ASTNodeBase {
    type = 'AssignmentExpression';

    constructor(
        public token: Token | null,
        public operator: string,
        public left: ASTNode,
        public right: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitAssignmentExpression?.(this, args);
    }
}

export class RangeNode extends ASTNodeBase {
    type = 'RangeExpression';

    constructor(
        public token: Token | null,
        public start: ASTNode | null,
        public end: ASTNode | null,
        public is_inclusive: boolean,
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitRangeExpression?.(this, args);
    }
}

export class BinaryOpNode extends ASTNodeBase {
    type = 'BinaryExpression';

    constructor(
        public token: Token | null,
        public operator: string,
        public left: ASTNode,
        public right: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitBinaryOp?.(this, args);
    }
}

export class TertiaryExpressionNode extends ASTNodeBase {
    type = 'TertiaryExpression';

    constructor(
        public token: Token | null,
        public condition: ASTNode,
        public consequent: ASTNode,
        public alternate: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTertiaryExpression?.(this, args);
    }
}

export class IfElseNode extends ASTNodeBase {
    type = 'IfElse';

    constructor(
        public token: Token | null,
        public condition: ASTNode,
        public consequent: ASTNode,
        public alternate?: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitIfElse?.(this, args);
    }
}

export class UnaryOpNode extends ASTNodeBase {
    type = 'UnaryOp';

    constructor(
        public token: Token | null,
        public operator: string,
        public operand: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitUnaryOp?.(this, args);
    }
}

export class MemberExpressionNode extends ASTNodeBase {
    type = 'MemberExpression';

    constructor(
        public token: Token | null,
        public object: ASTNode,
        public property: ASTNode,
        public computed: boolean
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMemberExpression?.(this, args);
    }
}

export class CallExpressionNode extends ASTNodeBase {
    type = 'CallExpression';

    constructor(
        public token: Token | null,
        public callee: ASTNode,
        public args: ASTNode[],
        public type_params?: ASTNode[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitCallExpression?.(this, args);
    }
}

export class ArrowExpressionNode extends ASTNodeBase {
    type = 'ArrowExpression';

    constructor(
        public token: Token | null,
        public params: ASTNode,
        public body: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitArrowExpression?.(this, args);
    }
}

export class PostfixExpressionNode extends ASTNodeBase {
    type = 'PostfixExpression';

    constructor(
        public token: Token | null,
        public operator: string,
        public argument: ASTNode,
        public prefix: boolean
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitPostfixExpression?.(this, args);
    }
}

export class SpreadElementNode extends ASTNodeBase {
    type = 'SpreadElement';

    constructor(
        public token: Token | null,
        public expression: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitSpreadElement?.(this, args);
    }
}

export class WildcardNode extends ASTNodeBase {
    type = 'Wildcard';

    constructor(
        public token: Token | null
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitWildcard?.(this, args);
    }
}

export class IdentifierNode extends ASTNodeBase {
    type = 'Identifier';

    constructor(
        public token: Token | null,
        public name: string
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitIdentifier?.(this, args);
    }
}

export class ScopedIdentifierNode extends ASTNodeBase {
    type = 'ScopedIdentifier';
    public borrowed_ref_into?: ActiveBorrow;

    constructor(
        public token: Token | null,
        public name: string[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitScopedIdentifier?.(this, args);
    }
}

export class TypeParameterNode extends ASTNodeBase {
    type = "TypeParameter";

    constructor(
        public token: Token | null,
        public name: string,
        public constraints: string[] = []
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTypeParameter?.(this, args);
    }
}

export class TypeNode extends ASTNodeBase {
    type = "Type";
    public genericParams?: TypeNode[];

    constructor(
        public token: Token | null,
        public name: string,
        public types?: TypeNode[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitType?.(this, args);
    }
}

export class GenericTypeNode extends ASTNodeBase {
    type = "GenericType";

    constructor(
        public token: Token | null,
        public type_parameters: TypeParameterNode[],
        public base_type: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitGenericType?.(this, args);
    }
}

export class AssignmentNode extends ASTNodeBase {
    type = 'Assignment';

    constructor(
        public token: Token | null,
        public variable: IdentifierNode,
        public value: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitAssignment?.(this, args);
    }
}

export class ImplNode extends ASTNodeBase {
    type = "Impl";

    constructor(
        public token: Token | null,
        public iden: IdentifierNode,
        public body: Array<FunctionDecNode | MemberDecNode>
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitImpl?.(this, args);
    }
}

export class StructNode extends ASTNodeBase {
    type = "Struct";
    public module?: any;

    constructor(
        public token: Token | null,
        public name: string,
        public body: ASTNode[],
        public exported: boolean = false,
        public type_parameters?: TypeParameterNode[],
        public attributes?: AttributeNode[],
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitStruct?.(this, args);
    }
}

export class TaggedNode extends ASTNodeBase {
    type = "Tagged";

    constructor(
        public token: Token | null,
        public name: string,
        public body: ASTNode,
        public members: Array<FunctionDecNode | MemberDecNode> = []
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTagged?.(this, args);
    }
}

export class FieldNode extends ASTNodeBase {
    type = "Field"

    constructor(
        public token: Token | null,
        public field: IdentifierNode,
        public mutable: boolean,
        public data_type?: ASTNode
    ) {
        super()
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitField?.(this, args);
    }
}

export class EnumNode extends ASTNodeBase {
    type = "Enum";

    constructor(
        public token: Token | null,
        public name: string,
        public body: EnumVariantNode[],
        public exported: boolean,
        public type_parameters?: TypeParameterNode[]

    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitEnum?.(this, args);
    }
}

export type EnumVariantValueNode = StructNode | TupleVariantNode;

export class EnumVariantNode extends ASTNodeBase {
    type = "EnumVariant";

    constructor(
        public token: Token | null,
        public name: string,
        public value?: EnumVariantValueNode

    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitEnumVariant?.(this, args);
    }
}

export class TupleVariantNode extends ASTNodeBase {
    type = "TupleVariant"

    constructor(public token: Token | null, public types: ASTNode[]) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTupleVariant?.(this, args);
    }
}

export class ModuleNode extends ASTNodeBase {
    type = "Module"

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode,
        public body: ASTNode[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitModule?.(this, args);
    }
}

export class ImportNode extends ASTNodeBase {
    type = "Import"

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitImport?.(this, args);
    }
}

export class UseNode extends ASTNodeBase {
    type = "Use"

    constructor(
        public token: Token | null,
        public path: UsePathNode,
        public list?: UseListNode,
        public alias?: string
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitUse?.(this, args);
    }
}

export class UsePathNode extends ASTNodeBase {
    type = "UsePath"

    constructor(
        public token: Token | null,
        public path: string[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitUsePath?.(this, args);
    }
}

export class UseListNode extends ASTNodeBase {
    type = "UseList"

    constructor(
        public token: Token | null,
        public items: UseItemNode[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitUseList?.(this, args);
    }
}

export class UseItemNode extends ASTNodeBase {
    type = "UseItem"

    constructor(
        public token: Token | null,
        public name: string,
        public alias?: string
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitUseItem?.(this, args);
    }
}
