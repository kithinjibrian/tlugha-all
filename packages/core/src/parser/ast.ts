import { FatMap } from "../fats/map";
import {
    EEnv,
    id,
    Module,
    Serializer,
    Token,
    Type
} from "../types";

export interface ASTVisitor {
    before_accept?(node: ASTNode, args?: Record<string, any>): any;
    after_accept?(node: ASTNode, args?: Record<string, any>): any;
    visitUnit?(node: UnitNode, args?: Record<string, any>): any;
    visitNumber?(node: NumberNode, args?: Record<string, any>): any;
    visitBoolean?(node: BooleanNode, args?: Record<string, any>): any;
    visitString?(node: StringNode, args?: Record<string, any>): any;
    visitIfLet?(node: IfLetNode, args?: Record<string, any>): any;
    visitSpawn?(node: SpawnNode, args?: Record<string, any>): any;
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
    visitWhileLet?(node: WhileLetNode, args?: Record<string, any>): any;
    visitFor?(node: ForNode, args?: Record<string, any>): any;
    visitAttribute?(node: AttributeNode, args?: Record<string, any>): any;
    visitMetaItem?(node: MetaItemNode, args?: Record<string, any>): any;
    visitMetaSeqItem?(node: MetaSeqItemNode, args?: Record<string, any>): any;
    visitFunctionDec?(node: FunctionDecNode, args?: Record<string, any>): any;
    visitCoro?(node: CoroNode, args?: Record<string, any>): any;
    visitLambda?(node: LambdaNode, args?: Record<string, any>): any;
    visitContinuation?(node: ContinuationNode, args?: Record<string, any>): any;
    visitParametersList?(node: ParametersListNode, args?: Record<string, any>): any;
    visitParameter?(node: ParameterNode, args?: Record<string, any>): any;
    visitReturn?(node: ReturnNode, args?: Record<string, any>): any;
    visitYield?(node: YieldNode, args?: Record<string, any>): any;
    visitBreak?(node: ASTNode, args?: Record<string, any>): any;
    visitContinue?(node: ASTNode, args?: Record<string, any>): any;
    visitVariableList?(node: VariableStatementNode, args?: Record<string, any>): any;
    visitVariable?(node: VariableNode, args?: Record<string, any>): any;
    visitAlias?(node: AliasNode, args?: Record<string, any>): any;
    visitExpressionStatement?(node: ExpressionStatementNode, args?: Record<string, any>): any;
    visitAssignmentExpression?(node: AssignmentExpressionNode, args?: Record<string, any>): any;
    visitTertiaryExpression?(node: ASTNode, args?: Record<string, any>): any;
    visitExpression?(node: ExpressionNode, args?: Record<string, any>): any;
    visitArray?(node: ArrayNode, args?: Record<string, any>): any;
    visitMap?(node: MapNode, args?: Record<string, any>): any;
    visitSet?(node: SetNode, args?: Record<string, any>): any;
    visitTuple?(node: TupleNode, args?: Record<string, any>): any;
    visitStructInit?(node: StructInitNode, args?: Record<string, any>): any;
    visitAlreadyInit?(node: AlreadyInitNode, args?: Record<string, any>): any;
    visitStructField?(node: StructFieldNode, args?: Record<string, any>): any;
    visitProperty?(node: PropertyNode, args?: Record<string, any>): any;
    visitBinaryOp?(node: BinaryOpNode, args?: Record<string, any>): any;
    visitTertiaryExpression?(node: TertiaryExpressionNode, args?: Record<string, any>): any;
    visitIfElse?(node: IfElseNode, args?: Record<string, any>): any;
    visitUnaryOp?(node: UnaryOpNode, args?: Record<string, any>): any;
    visitPostfixOp?(node: PostfixOpNode, args?: Record<string, any>): any;
    visitMemberExpression?(node: MemberExpressionNode, args?: Record<string, any>): any;
    visitCallExpression?(node: CallExpressionNode, args?: Record<string, any>): any;
    visitMacroFunction?(node: MacroFunctionNode, args?: Record<string, any>): any;
    visitArrowExpression?(node: ArrowExpressionNode, args?: Record<string, any>): any;
    visitPostfixExpression?(node: PostfixExpressionNode, args?: Record<string, any>): any;
    visitSpreadElement?(node: SpreadElementNode, args?: Record<string, any>): any;
    visitIdentifier?(node: IdentifierNode, args?: Record<string, any>): any;
    visitWildcard?(node: WildcardNode, args?: Record<string, any>): any;
    visitPath?(node: PathNode, args?: Record<string, any>): any;
    visitType?(node: TypeNode, args?: Record<string, any>): any;
    visitAssignment?(node: AssignmentNode, args?: Record<string, any>): any;
    visitTypeParameter?(node: TypeParameterNode, args?: Record<string, any>): any;
    visitGenericType?(node: GenericTypeNode, args?: Record<string, any>): any;
    visitStruct?(node: StructNode, args?: Record<string, any>): any;
    visitImpl?(node: ImplNode, args?: Record<string, any>): any;
    visitTraitSig?(node: TraitSigNode, args?: Record<string, any>): any;
    visitTrait?(node: TraitNode, args?: Record<string, any>): any;
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
    toJSON(serializer: Serializer): any;
    toString(): string;
}

export abstract class ASTNodeBase implements ASTNode {
    abstract type: string;
    abstract token: Token | null;
    public hot: Map<string, any> = new Map();
    public __id: string = id(26);

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

    toJSON(serializer: Serializer): any {
        return {
            type: this.type,
        };
    }

    static from_json(value: any) {
        let jump_table: Record<string, any> = {
            ProgramNode: () => ProgramNode._from_json(value),
            SourceElementsNode: () => SourceElementsNode._from_json(value),
            BlockNode: () => BlockNode._from_json(value),
            WhileLetNode: () => WhileLetNode._from_json(value),
            WhileNode: () => WhileNode._from_json(value),
            ForNode: () => ForNode._from_json(value),
            AttributeNode: () => AttributeNode._from_json(value),
            MetaItemNode: () => MetaItemNode._from_json(value),
            MetaSeqItemNode: () => MetaSeqItemNode._from_json(value),
            FunctionDecNode: () => FunctionDecNode._from_json(value),
            LambdaNode: () => LambdaNode._from_json(value),
            ParametersListNode: () => ParametersListNode._from_json(value),
            ParameterNode: () => ParameterNode._from_json(value),
            BreakNode: () => BreakNode._from_json(value),
            ContinueNode: () => ContinueNode._from_json(value),
            ReturnNode: () => ReturnNode._from_json(value),
            YieldNode: () => YieldNode._from_json(value),
            VariableStatementNode: () => VariableStatementNode._from_json(value),
            AliasNode: () => AliasNode._from_json(value),
            VariableNode: () => VariableNode._from_json(value),
            ExpressionStatementNode: () => ExpressionStatementNode._from_json(value),
            ExpressionNode: () => ExpressionNode._from_json(value),
            NumberNode: () => NumberNode._from_json(value),
            BooleanNode: () => BooleanNode._from_json(value),
            StringNode: () => StringNode._from_json(value),
            IfLetNode: () => IfLetNode._from_json(value),
            MatchNode: () => MatchNode._from_json(value),
            MatchArmNode: () => MatchArmNode._from_json(value),
            FieldPatternNode: () => FieldPatternNode._from_json(value),
            StructPatternNode: () => StructPatternNode._from_json(value),
            EnumPatternNode: () => EnumPatternNode._from_json(value),
            TuplePatternNode: () => TuplePatternNode._from_json(value),
            ArrayNode: () => ArrayNode._from_json(value),
            MapNode: () => MapNode._from_json(value),
            SetNode: () => SetNode._from_json(value),
            TupleNode: () => TupleNode._from_json(value),
            MacroFunctionNode: () => MacroFunctionNode._from_json(value),
            StructInitNode: () => StructInitNode._from_json(value),
            AlreadyInitNode: () => AlreadyInitNode._from_json(value),
            StructFieldNode: () => StructFieldNode._from_json(value),
            PropertyNode: () => PropertyNode._from_json(value),
            AssignmentExpressionNode: () => AssignmentExpressionNode._from_json(value),
            RangeNode: () => RangeNode._from_json(value),
            BinaryOpNode: () => BinaryOpNode._from_json(value),
            TertiaryExpressionNode: () => TertiaryExpressionNode._from_json(value),
            UnaryOpNode: () => UnaryOpNode._from_json(value),
            PostfixOpNode: () => PostfixOpNode._from_json(value),
            MemberExpressionNode: () => MemberExpressionNode._from_json(value),
            CallExpressionNode: () => CallExpressionNode._from_json(value),
            ArrowExpressionNode: () => ArrowExpressionNode._from_json(value),
            PostfixExpressionNode: () => PostfixExpressionNode._from_json(value),
            SpreadElementNode: () => SpreadElementNode._from_json(value),
            WildcardNode: () => WildcardNode._from_json(value),
            IdentifierNode: () => IdentifierNode._from_json(value),
            PathNode: () => PathNode._from_json(value),
            TypeParameterNode: () => TypeParameterNode._from_json(value),
            TypeNode: () => TypeNode._from_json(value),
            GenericTypeNode: () => GenericTypeNode._from_json(value),
            AssignmentNode: () => AssignmentNode._from_json(value),
            TraitSigNode: () => TraitSigNode._from_json(value),
            TraitNode: () => TraitNode._from_json(value),
            ImplNode: () => ImplNode._from_json(value),
            StructNode: () => StructNode._from_json(value),
            TaggedNode: () => TaggedNode._from_json(value),
            FieldNode: () => FieldNode._from_json(value),
            EnumNode: () => EnumNode._from_json(value),
            EnumVariantNode: () => EnumVariantNode._from_json(value),
            TupleVariantNode: () => TupleVariantNode._from_json(value),
            ModuleNode: () => ModuleNode._from_json(value),
            ImportNode: () => ImportNode._from_json(value),
            UsePathNode: () => UsePathNode._from_json(value),
            UseListNode: () => UseListNode._from_json(value),
            UseItemNode: () => UseItemNode._from_json(value),
        }

        if (value.type in jump_table) {
            return jump_table[value.type]()
        }

        throw new Error(`Internal error: Can't jump to '${value.type}'`);
    }

    toString() {
        return this.type;
    }

    abstract _accept(visitor: ASTVisitor, args?: Record<string, any>): any;
}

export class ProgramNode extends ASTNodeBase {
    type = 'ProgramNode';

    constructor(
        public token: Token | null,
        public program: SourceElementsNode,
        skip_parenting = false
    ) {
        super();

        if (!skip_parenting) {
            this.program.parent = this;
        }
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitProgram?.(this, args);
    }

    toJSON(serializer: Serializer) {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "ast",
            value: {
                type: this.type,
                parent: serializer.to_json(this.parent),
                program: serializer.to_json(this.program)
            }
        }
    }

    static _from_json(value: any) {
        const {
            program,
            parent
        } = value;

        const prog = new ProgramNode(
            null,
            program,
            true
        );

        return prog
    }
}

export class SourceElementsNode extends ASTNodeBase {
    type = 'SourceElementsNode';

    constructor(
        public token: Token | null,
        public sources: ASTNode[],
        skip_parenting = false
    ) {
        super();

        if (!skip_parenting) {
            for (let src of sources) {
                src.parent = this;
            }
        }
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitSourceElements?.(this, args);
    }

    toJSON(serializer: Serializer) {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "ast",
            value: {
                type: this.type,
                parent: serializer.to_json(this.parent),
                sources: this.sources.map((src) => serializer.to_json(src))
            },
        }
    }

    static _from_json(value: any): SourceElementsNode {
        const {
            sources,
            parent
        } = value;

        const source = new SourceElementsNode(
            null,
            sources,
            true
        );

        source.parent = parent;

        return source
    }
}

export class BlockNode extends ASTNodeBase {
    type = 'BlockNode';

    constructor(
        public token: Token | null,
        public body: ASTNode[],
        public name: string = "",
        skip_parenting = false
    ) {
        super();

        if (!skip_parenting) {
            for (let node of body) {
                node.parent = this;
            }
        }
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitBlock?.(this, args);
    }

    toJSON(serializer: Serializer) {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "ast",
            value: {
                type: this.type,
                parent: serializer.to_json(this.parent),
                body: this.body.map((src) => serializer.to_json(src))
            }
        }
    }

    static _from_json(value: any): BlockNode {
        const {
            body,
            parent
        } = value;

        const block = new BlockNode(
            null,
            body,
            "",
            true
        )

        block.parent = parent;

        return block
    }
}

export class WhileLetNode extends ASTNodeBase {
    type = 'WhileLetNode';

    constructor(
        public token: Token | null,
        public pattern: ASTNode,
        public expression: ASTNode,
        public body: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitWhileLet?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class WhileNode extends ASTNodeBase {
    type = 'WhileNode';

    constructor(
        public token: Token | null,
        public expression: ASTNode,
        public body: ASTNode,
        skip_parenting = false
    ) {
        super();

        if (!skip_parenting) {
            this.body.parent = this;
            this.expression.parent = this;
        }
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitWhile?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class ForNode extends ASTNodeBase {
    type = 'ForNode';

    constructor(
        public token: Token | null,
        public variable: IdentifierNode,
        public expression: ASTNode,
        public body: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitFor?.(this, args);
    }

    static _from_json(value: any) {

    }
}

// what the HECK
export class ContinuationNode extends ASTNodeBase {
    type = "Continuation";

    constructor(
        public token: Token | null,
        public params: any[],
        public body: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitContinuation?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class AttributeNode extends ASTNodeBase {
    type = 'AttributeNode';

    constructor(
        public token: Token | null,
        public meta: MetaItemNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitAttribute?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class MetaItemNode extends ASTNodeBase {
    type = 'MetaItemNode';

    constructor(
        public token: Token | null,
        public path: PathNode,
        public value?: ASTNode,
        public meta?: MetaSeqItemNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMetaItem?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class MetaSeqItemNode extends ASTNodeBase {
    type = 'MetaSeqItemNode';

    constructor(
        public token: Token | null,
        public meta?: MetaItemNode,
        public literal?: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMetaSeqItem?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class FunctionDecNode extends ASTNodeBase {
    type = 'FunctionDecNode';
    public env: FatMap<string, EEnv> = new FatMap();
    public module: FatMap<string, Module> = new FatMap();
    public is_trait: boolean = false;

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode,
        public params: ParametersListNode | undefined,
        public body: BlockNode,
        public inbuilt: boolean = false,
        public is_async: boolean = false,
        public exported: boolean = false,
        public type_parameters?: TypeParameterNode[],
        public return_type?: ASTNode,
        attributes?: AttributeNode[],
        public generator: boolean = false,
        skip_parenting = false
    ) {
        super(
            undefined,
            attributes
        );
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitFunctionDec?.(this, args);
    }

    toJSON(serializer: Serializer) {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "ast",
            value: {
                type: this.type,
                identifier: serializer.to_json(this.identifier),
                inbuilt: this.inbuilt,
                params: serializer.to_json(this.params),
                body: serializer.to_json(this.body),
                is_async: this.is_async,
                exported: this.exported,
                type_parameters: this.type_parameters?.map(i => serializer.to_json(i)),
                return_type: serializer.to_json(this.return_type),
                attributes: this.attributes?.map(i => serializer.to_json(i)),
                generator: this.generator,
                env: serializer.to_json(this.env),
                module: serializer.to_json(this.module),
                parent: serializer.to_json(this.parent),
            }
        }
    }

    static _from_json(value: any): FunctionDecNode {
        const fun = new FunctionDecNode(
            null,
            value.identifier,
            value.params,
            value.block,
            value.inbuilt,
            value.is_async,
            value.exported,
            value.type_parameters,
            value.return_type,
            value.attributes,
            value.generator,
            true
        );

        fun.parent = value.parent;
        fun.env = value.env;
        fun.module = value.module;

        return fun;
    }
}

export class CoroNode extends ASTNodeBase {
    type = 'CoroNode';
    public env: FatMap<string, EEnv> = new FatMap();
    public module: FatMap<string, Module> = new FatMap();
    public is_trait: boolean = false;
    public pc: number = 0;

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode,
        public params: ParametersListNode | undefined,
        public body: BlockNode,
        public inbuilt: boolean = false,
        public is_async: boolean = false,
        public exported: boolean = false,
        public type_parameters?: TypeParameterNode[],
        public return_type?: ASTNode,
        attributes?: AttributeNode[],
        skip_parenting = false
    ) {
        super(
            undefined,
            attributes
        );

        if (!skip_parenting)
            this.body.parent = this;
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitCoro?.(this, args);
    }

    toJSON(serializer: Serializer) {
        return {
            type: this.type,
            identifier: this.identifier.name,
        }
    }

    static _from_json(value: any) {

    }
}

export class LambdaNode extends ASTNodeBase {
    type = 'LambdaNode';
    public env: EEnv | null = null;
    public module: Module | null = null;

    constructor(
        public token: Token | null,
        public params: ParametersListNode | undefined,
        public body: ASTNode,
        public is_async: boolean = false,
        public type_parameters?: TypeParameterNode[],
        public return_type?: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitLambda?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class ParametersListNode extends ASTNodeBase {
    type = 'ParametersListNode';

    constructor(
        public token: Token | null,
        public parameters: ParameterNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitParametersList?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class ParameterNode extends ASTNodeBase {
    type = 'ParameterNode';

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode,
        public variadic: boolean,
        public mutable: boolean,
        public data_type: any,
        public expression?: ASTNode,
        public value?: any,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitParameter?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class BreakNode extends ASTNodeBase {
    type = 'BreakNode';

    constructor(
        public token: Token | null,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitBreak?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class ContinueNode extends ASTNodeBase {
    type = 'ContinueNode';

    constructor(
        public token: Token | null,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitContinue?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class ReturnNode extends ASTNodeBase {
    type = 'ReturnNode';

    constructor(
        public token: Token | null,
        public expression?: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitReturn?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class YieldNode extends ASTNodeBase {
    type = 'YieldNode';

    constructor(
        public token: Token | null,
        public expression: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitYield?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class VariableStatementNode extends ASTNodeBase {
    type = 'VariableStatementNode';

    constructor(
        public token: Token | null,
        public variables: VariableNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitVariableList?.(this, args);
    }

    toJSON(serializer: Serializer) {
        return {
            __id: this.__id,
            format: "lugha",
            version: "0.0.0",
            type: "ast",
            value: {
                type: this.type,
                parent: serializer.to_json(this.parent),
                variables: serializer.to_json(this.variables),
            }
        }
    }

    static _from_json(value: any) {
        const {
            parent,
            variables
        } = value;

        const node = new VariableStatementNode(
            null,
            variables,
            true
        );

        node.parent = parent;

        return node;
    }
}

export class AliasNode extends ASTNodeBase {
    type = 'AliasNode';

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode,
        public data_type?: any,
        public type_parameters?: TypeParameterNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitAlias?.(this, args);
    }

    static _from_json(value: any) {

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
    borrowerNode: PathNode;
    lifetime: Lifetime;

    constructor(
        type: 'shared' | 'mutable',
        borrowerNode: PathNode,
        lifetime: Lifetime
    ) {
        this.type = type;
        this.borrowerNode = borrowerNode;
        this.lifetime = lifetime;
    }
}

export class VariableNode extends ASTNodeBase {
    type = 'VariableNode';
    public moved: boolean = false;
    public active_borrows: ActiveBorrow[] = [];
    public owner_lifetime: Lifetime;

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode,
        public constant: boolean,
        public mutable: boolean,
        public expression?: ASTNode,
        public value?: any, // REMOVE. shouldn't store the value in ast
        public data_type?: any,
        skip_parenting = false
    ) {
        super();
        this.owner_lifetime = new Lifetime();

        if (this.expression) {
            this.expression.parent = this;
        }
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitVariable?.(this, args);
    }

    toJSON(serializer: Serializer) {
        return {
            __id: this.__id,
            format: "lugha",
            version: "0.0.0",
            type: "ast",
            value: {
                type: this.type,
                parent: serializer.to_json(this.parent),
                identifier: serializer.to_json(this.identifier),
                expression: serializer.to_json(this.expression),
            }
        }
    }

    static _from_json(value: any) {
        const {
            identifier,
            parent,
            expression
        } = value;

        const variable = new VariableNode(
            null,
            identifier,
            false,
            false,
            expression,
            true
        );

        variable.parent = parent;

        return variable;
    }
}

export class ExpressionStatementNode extends ASTNodeBase {
    type = 'ExpressionStatementNode';

    constructor(
        public token: Token | null,
        public expression: ASTNode,
        skip_parenting = false
    ) {
        super();

        if (!skip_parenting)
            expression.parent = this;
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitExpressionStatement?.(this, args);
    }

    toJSON(serializer: Serializer) {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "ast",
            value: {
                type: this.type,
                parent: serializer.to_json(this.parent),
                expression: serializer.to_json(this.expression)
            }
        }
    }

    static _from_json(value: any): ExpressionStatementNode {
        const {
            expression,
            parent
        } = value;

        const expr = new ExpressionStatementNode(
            null,
            expression,
            true
        );

        expr.parent = parent;

        return expr
    }
}

export class ExpressionNode extends ASTNodeBase {
    type = 'ExpressionNode';

    constructor(
        public token: Token | null,
        public expression: ASTNode,
        skip_parenting = false
    ) {
        super();

        if (!skip_parenting)
            expression.parent = this;
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitExpression?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class UnitNode extends ASTNodeBase {
    type = 'UnitNode';

    constructor(
        public token: Token | null
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitUnit?.(this, args);
    }

    toJSON(serializer: Serializer) {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "ast",
            value: {
                type: this.type
            }
        }
    }

    static _from_json(value: any) {
        return new UnitNode(
            null,
        )
    }
}

export class NumberNode extends ASTNodeBase {
    type = 'NumberNode';

    constructor(
        public token: Token | null,
        public value: number
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitNumber?.(this, args);
    }

    toJSON(serializer: Serializer) {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "ast",
            value: {
                type: this.type,
                value: this.value
            }
        }
    }

    static _from_json(value: any) {
        return new NumberNode(
            null,
            Number(value.value)
        )
    }
}

export class BooleanNode extends ASTNodeBase {
    type = 'BooleanNode';

    constructor(
        public token: Token | null,
        public value: boolean
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitBoolean?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class StringNode extends ASTNodeBase {
    type = 'StringNode';

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

    static _from_json(value: any) {

    }
}

export class SpawnNode extends ASTNodeBase {
    type = 'SpawnNode';

    constructor(
        public token: Token | null,
        public expression: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitSpawn?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class IfLetNode extends ASTNodeBase {
    type = 'IfLetNode';

    constructor(
        public token: Token | null,
        public pattern: ASTNode,
        public expression: ASTNode,
        public consequent: ASTNode,
        public alternate?: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitIfLet?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class MatchNode extends ASTNodeBase {
    type = 'MatchNode';

    constructor(
        public token: Token | null,
        public expression: ASTNode,
        public arms: MatchArmNode[],
        skip_parenting = false
    ) {
        super();

        if (!skip_parenting) {
            expression.parent = this;
            for (let arm of arms) {
                arm.parent = this;
            }
        }
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMatch?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class MatchArmNode extends ASTNodeBase {
    type = 'MatchArmNode';

    constructor(
        public token: Token | null,
        public pattern: ASTNode,
        public guard: ASTNode | null,
        public exp_block: ASTNode,
        skip_parenting = false
    ) {
        super();

        if (!skip_parenting) {
            pattern.parent = this;

            if (guard) guard.parent = this;

            exp_block.parent = this;
        }
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMatchArm?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class FieldPatternNode extends ASTNodeBase {
    type = 'FieldPatternNode';

    constructor(
        public token: Token | null,
        public iden: IdentifierNode,
        public patterns?: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitFieldPattern?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class StructPatternNode extends ASTNodeBase {
    type = 'StructPatternNode';

    constructor(
        public token: Token | null,
        public path: ASTNode,
        public patterns: FieldPatternNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitStructPattern?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class EnumPatternNode extends ASTNodeBase {
    type = 'EnumPatternNode';

    constructor(
        public token: Token | null,
        public path: ASTNode,
        public patterns?: ASTNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitEnumPattern?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class TuplePatternNode extends ASTNodeBase {
    type = 'TuplePatternNode';

    constructor(
        public token: Token | null,
        public patterns: ASTNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTuplePattern?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class ArrayNode extends ASTNodeBase {
    type = 'ArrayNode';

    constructor(
        public token: Token | null,
        public elements: ASTNode[],
        skip_parenting = false
    ) {
        super();

        if (!skip_parenting) {
            for (let element of this.elements) {
                element.parent = this;
            }
        }
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitArray?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class MapNode extends ASTNodeBase {
    type = 'MapNode';

    constructor(
        public token: Token | null,
        public properties: PropertyNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMap?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class SetNode extends ASTNodeBase {
    type = 'SetNode';

    constructor(
        public token: Token | null,
        public values: ASTNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitSet?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class TupleNode extends ASTNodeBase {
    type = 'TupleNode';

    constructor(
        public token: Token | null,
        public values: ASTNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTuple?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class MacroFunctionNode extends ASTNodeBase {
    type = 'MacroFunctionNode';

    constructor(
        public token: Token | null,
        public name: PathNode,
        public args: ASTNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMacroFunction?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class StructInitNode extends ASTNodeBase {
    type = 'StructInitNode';

    constructor(
        public token: Token | null,
        public name: ASTNode,
        public fields: StructFieldNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitStructInit?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class AlreadyInitNode extends ASTNodeBase {
    type = 'AlreadyInitNode';

    constructor(
        public lugha_type: Type<any>,
        public token: Token | null = null,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitAlreadyInit?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class StructFieldNode extends ASTNodeBase {
    type = 'StructFieldNode';

    constructor(
        public token: Token | null,
        public iden: IdentifierNode,
        public expression?: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitStructField?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export type Key = {
    type: "string",
    value: string
} | {
    type: "ast",
    value: ASTNode
}

export class PropertyNode extends ASTNodeBase {
    type = 'PropertyNode';

    constructor(
        public token: Token | null,
        public key: Key,
        public value?: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitProperty?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class AssignmentExpressionNode extends ASTNodeBase {
    type = 'AssignmentExpressionNode';

    constructor(
        public token: Token | null,
        public operator: string,
        public left: ASTNode,
        public right: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitAssignmentExpression?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class RangeNode extends ASTNodeBase {
    type = 'RangeNode';

    constructor(
        public token: Token | null,
        public start: ASTNode | null,
        public end: ASTNode | null,
        public is_inclusive: boolean,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitRangeExpression?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class BinaryOpNode extends ASTNodeBase {
    type = 'BinaryOpNode';

    constructor(
        public token: Token | null,
        public operator: string,
        public left: ASTNode,
        public right: ASTNode,
        skip_parenting = false
    ) {
        super();

        if (!skip_parenting) {
            this.left.parent = this;
            this.right.parent = this;
        }
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitBinaryOp?.(this, args);
    }

    toJSON(serializer: Serializer) {
        return {
            __id: this.__id,
            format: "lugha",
            version: "0.0.0",
            type: "ast",
            value: {
                type: this.type,
                parent: serializer.to_json(this.parent),
                operator: this.operator,
                left: serializer.to_json(this.left),
                right: serializer.to_json(this.right),
            }
        }
    }

    static _from_json(value: any) {
        const {
            operator,
            left,
            right,
            parent
        } = value;

        const node = new BinaryOpNode(
            null,
            operator,
            left,
            right,
            true
        );

        node.parent = parent;

        return node;
    }
}

export class TertiaryExpressionNode extends ASTNodeBase {
    type = 'TertiaryExpressionNode';

    constructor(
        public token: Token | null,
        public condition: ASTNode,
        public consequent: ASTNode,
        public alternate: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTertiaryExpression?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class IfElseNode extends ASTNodeBase {
    type = 'IfElseNode';

    constructor(
        public token: Token | null,
        public condition: ASTNode,
        public consequent: ASTNode,
        public alternate?: ASTNode,
        skip_parenting = false
    ) {
        super();

        if (!skip_parenting) {
            this.condition.parent = this;
            this.consequent.parent = this;

            if (this.alternate)
                this.alternate.parent = this;
        }
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitIfElse?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class UnaryOpNode extends ASTNodeBase {
    type = 'UnaryOpNode';

    constructor(
        public token: Token | null,
        public operator: string,
        public operand: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitUnaryOp?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class PostfixOpNode extends ASTNodeBase {
    type = 'PostfixOpNode';

    constructor(
        public token: Token | null,
        public operator: string,
        public operand: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitPostfixOp?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class MemberExpressionNode extends ASTNodeBase {
    type = 'MemberExpressionNode';

    constructor(
        public token: Token | null,
        public object: ASTNode,
        public property: ASTNode,
        public computed: boolean,
        skip_parenting = false
    ) {
        super();

        if (!skip_parenting) {
            this.object.parent = this;
            this.property.parent = this;
        }
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMemberExpression?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class CallExpressionNode extends ASTNodeBase {
    type = 'CallExpressionNode';

    constructor(
        public token: Token | null,
        public callee: ASTNode,
        public args: ASTNode[],
        public type_params?: ASTNode[],
        public data_type?: any,
        skip_parenting = false
    ) {
        super();

        if (!skip_parenting) {
            this.callee.parent = this;

            for (let arg of this.args) {
                arg.parent = this;
            }
        }
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitCallExpression?.(this, args);
    }

    toJSON(serializer: Serializer) {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "ast",
            value: {
                type: this.type,
                parent: serializer.to_json(this.parent),
                callee: serializer.to_json(this.callee),
                args: this.args.map(src => serializer.to_json(src))
            }
        }
    }

    static _from_json(value: any) {
        const {
            callee,
            args,
            parent
        } = value;

        const call_expr = new CallExpressionNode(
            null,
            callee,
            args,
            [],
            true
        );

        call_expr.parent = parent;

        return call_expr;
    }
}

export class ArrowExpressionNode extends ASTNodeBase {
    type = 'ArrowExpressionNode';

    constructor(
        public token: Token | null,
        public params: ASTNode,
        public body: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitArrowExpression?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class PostfixExpressionNode extends ASTNodeBase {
    type = 'PostfixExpressionNode';

    constructor(
        public token: Token | null,
        public operator: string,
        public argument: ASTNode,
        public prefix: boolean,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitPostfixExpression?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class SpreadElementNode extends ASTNodeBase {
    type = 'SpreadElementNode';

    constructor(
        public token: Token | null,
        public expression: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitSpreadElement?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class WildcardNode extends ASTNodeBase {
    type = 'WildcardNode';

    constructor(
        public token: Token | null,
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitWildcard?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class IdentifierNode extends ASTNodeBase {
    type = 'IdentifierNode';

    constructor(
        public token: Token | null,
        public name: string
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitIdentifier?.(this, args);
    }

    toJSON(serializer: Serializer): Record<string, any> {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "ast",
            value: {
                type: this.type,
                name: this.name,
                parent: serializer.to_json(this.parent),
            }
        };
    }

    static _from_json(value: any): IdentifierNode {
        const iden = new IdentifierNode(null, value.name);

        iden.parent = value.parent;

        return iden;
    }
}

export class PathNode extends ASTNodeBase {
    type = 'PathNode';
    public borrowed_ref_into?: ActiveBorrow;

    constructor(
        public token: Token | null,
        public name: string[]
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitPath?.(this, args);
    }

    toJSON(serializer: Serializer) {
        return {
            format: "lugha",
            __id: this.__id,
            version: "0.0.0",
            type: "ast",
            value: {
                type: this.type,
                parent: serializer.to_json(this.parent),
                name: this.name
            }
        }
    }

    static _from_json(value: any) {
        const {
            name,
            parent
        } = value;

        const path = new PathNode(
            null,
            name
        );

        path.parent = parent;

        return path;
    }
}

export class TypeParameterNode extends ASTNodeBase {
    type = "TypeParameterNode";

    constructor(
        public token: Token | null,
        public name: string,
        public constraints: string[] = [],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTypeParameter?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class TypeNode extends ASTNodeBase {
    type = "TypeNode";
    public genericParams?: TypeNode[];

    constructor(
        public token: Token | null,
        public name: string,
        public types?: TypeNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitType?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class GenericTypeNode extends ASTNodeBase {
    type = "GenericTypeNode";

    constructor(
        public token: Token | null,
        public type_parameters: TypeParameterNode[],
        public base_type: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitGenericType?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class AssignmentNode extends ASTNodeBase {
    type = 'AssignmentNode';

    constructor(
        public token: Token | null,
        public variable: IdentifierNode,
        public value: ASTNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitAssignment?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class TraitSigNode extends ASTNodeBase {
    type = "TraitSigNode";

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode,
        public params: ParametersListNode | undefined,
        public type_parameters?: TypeParameterNode[],
        public return_type?: ASTNode,
        attributes?: AttributeNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTraitSig?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class TraitNode extends ASTNodeBase {
    type = "TraitNode";

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode,
        public body: (FunctionDecNode | TraitSigNode)[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTrait?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class ImplNode extends ASTNodeBase {
    type = "ImplNode";

    constructor(
        public token: Token | null,
        public trait: IdentifierNode | undefined,
        public iden: IdentifierNode,
        public body: Array<FunctionDecNode>,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitImpl?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class StructNode extends ASTNodeBase {
    type = "StructNode";
    public module: Map<string, any> = new Map()

    constructor(
        public token: Token | null,
        public name: string,
        public body: ASTNode[],
        public exported: boolean = false,
        public type_parameters?: TypeParameterNode[],
        public attributes?: AttributeNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitStruct?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class TaggedNode extends ASTNodeBase {
    type = "TaggedNode";

    constructor(
        public token: Token | null,
        public name: string,
        public body: ASTNode,
        public members: Array<FunctionDecNode> = [],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTagged?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class FieldNode extends ASTNodeBase {
    type = "FieldNode"

    constructor(
        public token: Token | null,
        public field: IdentifierNode,
        public mutable: boolean,
        public data_type?: ASTNode,
        skip_parenting = false
    ) {
        super()
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitField?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class EnumNode extends ASTNodeBase {
    type = "EnumNode";

    constructor(
        public token: Token | null,
        public name: string,
        public body: EnumVariantNode[],
        public exported: boolean,
        public type_parameters?: TypeParameterNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitEnum?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export type EnumVariantValueNode = StructNode | TupleVariantNode;

export class EnumVariantNode extends ASTNodeBase {
    type = "EnumVariantNode";

    constructor(
        public token: Token | null,
        public name: string,
        public value?: EnumVariantValueNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitEnumVariant?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class TupleVariantNode extends ASTNodeBase {
    type = "TupleVariantNode"

    constructor(
        public token: Token | null,
        public types: ASTNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTupleVariant?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class ModuleNode extends ASTNodeBase {
    type = "ModuleNode"

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode,
        public body: ASTNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitModule?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class ImportNode extends ASTNodeBase {
    type = "ImportNode"

    constructor(
        public token: Token | null,
        public identifier: IdentifierNode,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitImport?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class UseNode extends ASTNodeBase {
    type = "UseNode"

    constructor(
        public token: Token | null,
        public path: UsePathNode,
        public list?: UseListNode,
        public alias?: string,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitUse?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class UsePathNode extends ASTNodeBase {
    type = "UsePathNode"

    constructor(
        public token: Token | null,
        public path: string[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitUsePath?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class UseListNode extends ASTNodeBase {
    type = "UseListNode"

    constructor(
        public token: Token | null,
        public items: UseItemNode[],
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitUseList?.(this, args);
    }

    static _from_json(value: any) {

    }
}

export class UseItemNode extends ASTNodeBase {
    type = "UseItemNode"

    constructor(
        public token: Token | null,
        public name: string,
        public alias?: string,
        skip_parenting = false
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitUseItem?.(this, args);
    }

    static _from_json(value: any) {

    }
}
