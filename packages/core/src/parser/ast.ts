export interface ASTVisitor {
    before_accept?(node: ASTNode, args?: Record<string, any>): any;
    after_accept?(node: ASTNode, args?: Record<string, any>): any;
    visitNumber?(node: NumberNode, args?: Record<string, any>): any;
    visitBoolean?(node: BooleanNode, args?: Record<string, any>): any;
    visitString?(node: StringNode, args?: Record<string, any>): any;
    visitNull?(node: NullNode, args?: Record<string, any>): any;
    visitProgram?(node: ProgramNode, args?: Record<string, any>): any;
    visitSourceElements?(node: SourceElementsNode, args?: Record<string, any>): any;
    visitBlock?(node: BlockNode, args?: Record<string, any>): any;
    visitWhile?(node: WhileNode, args?: Record<string, any>): any;
    visitFor?(node: ForNode, args?: Record<string, any>): any;
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
    visitExpressionStatement?(node: ExpressionStatementNode, args?: Record<string, any>): any;
    visitAssignmentExpression?(node: BinaryOpNode, args?: Record<string, any>): any;
    visitTertiaryExpression?(node: ASTNode, args?: Record<string, any>): any;
    visitExpression?(node: ExpressionNode, args?: Record<string, any>): any;
    visitArray?(node: ArrayNode, args?: Record<string, any>): any;
    visitMap?(node: MapNode, args?: Record<string, any>): any;
    visitSet?(node: SetNode, args?: Record<string, any>): any;
    visitTuple?(node: TupleNode, args?: Record<string, any>): any;
    visitStructInit?(node: StructInitNode, args?: Record<string, any>): any;
    visitStructField?(node: StructFieldNode, args?: Record<string, any>): any;
    visitProperty?(node: PropertyNode, args?: Record<string, any>): any;
    visitBinaryOp?(node: BinaryOpNode, args?: Record<string, any>): any;
    visitTertiaryExpression?(node: TertiaryExpressionNode, args?: Record<string, any>): any;
    visitIfElse?(node: IfElseNode, args?: Record<string, any>): any;
    visitUnaryOp?(node: UnaryOpNode, args?: Record<string, any>): any;
    visitMemberExpression?(node: MemberExpressionNode, args?: Record<string, any>): any;
    visitCallExpression?(node: CallExpressionNode, args?: Record<string, any>): any;
    visitArrowExpression?(node: ArrowExpressionNode, args?: Record<string, any>): any;
    visitPostfixExpression?(node: PostfixExpressionNode, args?: Record<string, any>): any;
    visitIdentifier?(node: IdentifierNode, args?: Record<string, any>): any;
    visitScopedIdentifier?(node: ScopedIdentifierNode, args?: Record<string, any>): any;
    visitType?(node: TypeNode, args?: Record<string, any>): any;
    visitAssignment?(node: AssignmentNode, args?: Record<string, any>): any;
    visitTypeParameter?(node: TypeParameterNode, args?: Record<string, any>): any;
    visitGenericType?(node: GenericTypeNode, args?: Record<string, any>): any;
    visitStruct?(node: StructNode, args?: Record<string, any>): any;
    visitField?(node: FieldNode, args?: Record<string, any>): any;
    visitEnum?(node: EnumNode, args?: Record<string, any>): any;
    visitEnumVariant?(node: EnumVariantNode, args?: Record<string, any>): any;
    visitStructVariant?(node: StructVariantNode, args?: Record<string, any>): any;
    visitTupleVariant?(node: TupleVariantNode, args?: Record<string, any>): any;
    visitConstantVariant?(node: ConstantVariantNode, args?: Record<string, any>): any;
    visitModule?(node: ModuleNode, args?: Record<string, any>): any;
    visitImport?(node: ImportNode, args?: Record<string, any>): any;
    visitUse?(node: UseNode, args?: Record<string, any>): any;
    visitUsePath?(node: UsePathNode, args?: Record<string, any>): any;
    visitUseList?(node: UseListNode, args?: Record<string, any>): any;
    visitUseItem?(node: UseItemNode, args?: Record<string, any>): any;
}


export interface ASTNode {
    type: string;
    accept(visitor: ASTVisitor, args?: Record<string, any>): any;
}

export abstract class ASTNodeBase implements ASTNode {
    abstract type: string;

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

    constructor(public program: ASTNode) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitProgram?.(this, args);
    }
}

export class SourceElementsNode extends ASTNodeBase {
    type = 'SourceElements';

    constructor(public sources: ASTNode[]) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitSourceElements?.(this, args);
    }
}

export class BlockNode extends ASTNodeBase {
    type = 'Block';

    constructor(
        public body: ASTNode[],
        public name: string = ""
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitBlock?.(this, args);
    }
}

export class WhileNode extends ASTNodeBase {
    type = 'While';

    constructor(public expression: ASTNode, public body: ASTNode) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitWhile?.(this, args);
    }
}

export class ForNode extends ASTNodeBase {
    type = 'For';

    constructor(
        public init: ASTNode | undefined,
        public condition: ASTNode | undefined,
        public update: ASTNode | undefined,
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
        public params: any[],
        public body: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitContinuation?.(this, args);
    }
}

export class FunctionDecNode extends ASTNodeBase {
    type = 'FunctionDec';

    constructor(
        public identifier: IdentifierNode,
        public params: ParametersListNode | undefined,
        public body: BlockNode,
        public inbuilt: boolean = false,
        public is_: boolean = false,
        public exported: boolean = false,
        public type_parameters?: TypeParameterNode[],
        public return_type?: ASTNode
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitFunctionDec?.(this, args);
    }
}

export class MemberDecNode extends FunctionDecNode {
    type = 'MemberDec';

    constructor(
        fun: FunctionDecNode,
    ) {
        super(
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

    constructor(
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

    constructor(public parameters: ParameterNode[]) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitParametersList?.(this, args);
    }
}

export class ParameterNode extends ASTNodeBase {
    type = 'Parameter';

    constructor(
        public identifier: IdentifierNode,
        public variadic: boolean,
        public data_type: ASTNode,
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
    type = 'return await ';

    constructor(public expression?: ASTNode) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitReturn?.(this, args);
    }
}

export class VariableStatementNode extends ASTNodeBase {
    type = 'Let';

    constructor(public variables: VariableNode) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitVariableList?.(this, args);
    }
}

export class VariableNode extends ASTNodeBase {
    type = 'Variable';

    constructor(
        public identifier: IdentifierNode,
        public constant: boolean,
        public mutable: boolean,
        public expression?: ASTNode,
        public value?: any,
        public data_type?: any,
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitVariable?.(this, args);
    }
}

export class ExpressionStatementNode extends ASTNodeBase {
    type = 'ExpressionStatement';

    constructor(public expression: ASTNode) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitExpressionStatement?.(this, args);
    }
}

export class ExpressionNode extends ASTNodeBase {
    type = 'Expression';

    constructor(public expressions: ASTNode[]) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitExpression?.(this, args);
    }
}

export class NumberNode extends ASTNodeBase {
    type = 'Number';

    constructor(public value: number) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitNumber?.(this, args);
    }
}

export class BooleanNode extends ASTNodeBase {
    type = 'Boolean';

    constructor(public value: boolean) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitBoolean?.(this, args);
    }
}

export class StringNode extends ASTNodeBase {
    type = 'String';

    constructor(public value: string) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitString?.(this, args);
    }
}

export class NullNode extends ASTNodeBase {
    type = 'Null';

    constructor(public value: string = "null") {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitNull?.(this, args);
    }
}

export class ArrayNode extends ASTNodeBase {
    type = 'Array';

    constructor(public elements: ASTNode[]) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitArray?.(this, args);
    }
}

export class MapNode extends ASTNodeBase {
    type = 'Map';

    constructor(public properties: PropertyNode[]) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitMap?.(this, args);
    }
}

export class SetNode extends ASTNodeBase {
    type = 'Set';

    constructor(public values: ASTNode[]) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitSet?.(this, args);
    }
}

export class TupleNode extends ASTNodeBase {
    type = 'Tuple';

    constructor(public values: ASTNode[]) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTuple?.(this, args);
    }
}

export class StructInitNode extends ASTNodeBase {
    type = 'StructInit';

    constructor(
        public name: ASTNode,
        public fields: StructFieldNode[],
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitStructInit?.(this, args);
    }
}

export class StructFieldNode extends ASTNodeBase {
    type = 'StructField';

    constructor(
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

    constructor(public key: string, public value: ASTNode) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitProperty?.(this, args);
    }
}

export class AssignmentExpressionNode extends ASTNodeBase {
    type = 'AssignmentExpression';

    constructor(
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

export class BinaryOpNode extends ASTNodeBase {
    type = 'BinaryExpression';

    constructor(
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

    constructor(public operator: string, public operand: ASTNode) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitUnaryOp?.(this, args);
    }
}

export class MemberExpressionNode extends ASTNodeBase {
    type = 'MemberExpression';

    constructor(
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

    constructor(public callee: ASTNode, public args: ASTNode[]) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitCallExpression?.(this, args);
    }
}

export class ArrowExpressionNode extends ASTNodeBase {
    type = 'ArrowExpression';

    constructor(public params: ASTNode, public body: ASTNode) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitArrowExpression?.(this, args);
    }
}

export class PostfixExpressionNode extends ASTNodeBase {
    type = 'PostfixExpression';

    constructor(public operator: string, public argument: ASTNode, public prefix: boolean) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitPostfixExpression?.(this, args);
    }
}

export class IdentifierNode extends ASTNodeBase {
    type = 'Identifier';

    constructor(public name: string) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitIdentifier?.(this, args);
    }
}

export class ScopedIdentifierNode extends ASTNodeBase {
    type = 'ScopedIdentifier';

    constructor(
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

    constructor(
        public name: string,
        public types?: any[]
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

    constructor(public variable: IdentifierNode, public value: ASTNode) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitAssignment?.(this, args);
    }
}

export class StructNode extends ASTNodeBase {
    type = "Struct";

    constructor(
        public name: string,
        public body: ASTNode[],
        public exported: boolean = false,
        public type_parameters?: TypeParameterNode[]

    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitStruct?.(this, args);
    }
}

export class FieldNode extends ASTNodeBase {
    type = "Field"

    constructor(
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

export type EnumVariantValueNode = StructNode | TupleVariantNode | ConstantVariantNode;

export class EnumVariantNode extends ASTNodeBase {
    type = "EnumVariant";

    constructor(
        public name: string,
        public value?: EnumVariantValueNode

    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitEnumVariant?.(this, args);
    }
}

export class StructVariantNode extends ASTNodeBase {
    type = "StructVariant"

    constructor(public fields: ASTNode[]) {
        super()
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitStructVariant?.(this, args);
    }
}

export class TupleVariantNode extends ASTNodeBase {
    type = "TupleVariant"

    constructor(public types: ASTNode[]) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitTupleVariant?.(this, args);
    }
}

export class ConstantVariantNode extends ASTNodeBase {
    type = "ConstantVariant"

    constructor(public types: ASTNode) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitConstantVariant?.(this, args);
    }
}

export class ModuleNode extends ASTNodeBase {
    type = "Module"

    constructor(
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
        public name: string,
        public alias?: string
    ) {
        super();
    }

    async _accept(visitor: ASTVisitor, args?: Record<string, any>): Promise<any> {
        return await visitor.visitUseItem?.(this, args);
    }
}
