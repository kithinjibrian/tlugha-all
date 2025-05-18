import { ErrorCodes, getCategory } from './code';

export { ErrorCodes };

export class TError extends Error {
    code: string;
    reason: string;
    line: number;
    column: number;
    lineStr: string;
    stage: string;
    hint?: string;
    context?: string;
    expected?: string[];
    example?: string;
    pointer?: string;
    message: string;

    constructor(params: {
        code: string;
        reason: string;
        line: number;
        column: number;
        lineStr: string;
        stage: string;
        file?: string;
        hint?: string;
        context?: string;
        expected?: string[];
        example?: string;
    }) {
        const { file, code, reason, line, column, lineStr, stage, hint, context, expected, example } = params;

        // Generate the pointer for where the error occurred
        const pointer = ' '.repeat(column - 1) + '^';

        // Build the detailed error message
        const message =
            `${file ? `File: ${file}` : ''}
[${getCategory(code)}:${code}] ${reason}
--> line ${line}, column ${column}
${lineStr}
${pointer}
${expected ? `Expected: ${expected.join(', ')}` : ''}
${hint ? `Hint: ${hint}` : ''}
${context ? `Context: ${context}` : ''}
${example ? `Example: ${example}` : ''}`;

        super(message);

        this.message = message;
        this.name = `${stage.charAt(0).toUpperCase() + stage.slice(1)}Error`;
        this.code = code;
        this.reason = reason;
        this.line = line;
        this.column = column;
        this.lineStr = lineStr;
        this.stage = stage;
        this.hint = hint;
        this.context = context;
        this.expected = expected;
        this.example = example;
        this.pointer = pointer;
    }

    toJSON() {
        return {
            error_type: this.name,
            code: this.code,
            reason: this.reason,
            location: {
                line: this.line,
                column: this.column,
            },
            line_str: this.lineStr,
            hint: this.hint,
            context: this.context,
            expected: this.expected,
            example: this.example,
            pointer: this.pointer,
            stage: this.stage
        };
    }
}
