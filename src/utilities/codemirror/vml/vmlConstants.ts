// The value here must match the rule and token names in vml.grammar

export const RULE_TEXT_FILE = 'Text_file';

export const RULE_BODY = 'Body';

export const RULE_ABSOLUTE_SEQUENCE = 'Absolute_Sequence';
export const RULE_RELATIVE_SEQUENCE = 'Relative_sequence';
export const RULE_BLOCK = 'Block';
export const RULE_SEQUENCE = 'Sequence';

export const RULE_COMMON_FUNCTION = 'Common_Function';

export const RULE_FUNCTIONS = 'Functions';
export const RULE_FUNCTION = 'Function';

export const RULE_IF = 'If';
export const RULE_ELSE_IF = 'Else_if';
export const RULE_ELSE = 'Else';
export const RULE_END_IF = 'End_if';

export const RULE_WHILE = 'While';
export const RULE_END_WHILE = 'End_while';

export const RULE_FOR = 'For_statement';
export const RULE_END_FOR = 'End_for';

export const RULE_VARIABLE_NAME_CONSTANT = 'Variable_name_constant';
export const RULE_VARIABLE_DECLARATION_TYPE = 'Variable_declaration_type';
export const RULE_VARIABLE_DECLARATION_WITH_OPTIONAL_TLM_ID = 'Variable_declaration_with_optional_tlm_id';
export const RULE_ASSIGNMENT = 'Assignment';
export const RULE_STATEMENT = 'Statement';
export const RULE_TIME_TAGGED_STATEMENTS = 'Time_tagged_statements';
export const RULE_TIME_TAGGED_STATEMENT = 'Time_tagged_statement';
export const RULE_TEST_TIME_TAGGED_STATEMENT = 'Test_Time_tagged_statement';
export const RULE_VM_MANAGEMENT = 'Vm_management';
export const RULE_SPAWN = 'Spawn';
export const RULE_HALT = 'Halt';
export const RULE_PAUSE = 'Pause';
export const RULE_RESUME = 'Resume';
export const RULE_ISSUE = 'Issue';
export const RULE_ISSUE_DYNAMIC = 'Issue_dynamic';
export const RULE_FUNCTION_NAME = 'Function_name';
export const RULE_SIMPLE_EXPR = 'Simple_expr';
export const RULE_CALL_PARAMETER = 'Call_parameter';
export const RULE_CALL_PARAMETERS = 'Call_parameters';
export const RULE_PARAMETER = 'Parameter';
export const RULE_PARAMETERS = 'Parameters';
export const RULE_FLOW = 'Flow';
export const RULE_SIMPLE_CALL = 'Simple_call';
export const RULE_EXTERNAL_CALL = 'External_call';
export const RULE_CONSTANT = 'Constant';
export const RULE_VARIABLE_NAME = 'Variable_name';
export const RULE_DATA_KIND = 'Data_kind';
export const RULE_COMMENT = 'Comment';
export const RULE_INPUT_OUTPUT_PARAMETER = 'Input_output_parameter';
export const RULE_INPUT_PARAMETER = 'Input_parameter';
export const RULE_OPTIONAL_STATIC_VARIABLE_SECTION = 'Optional_static_variable_section';
export const RULE_OPTIONAL_DEFAULT_INPUT_VALUE = 'Optional_default_input_value';
export const RULE_OPTIONAL_VALUE_LIST = 'Optional_value_list';
export const RULE_INPUT_RANGE = 'Input_Range';
export const RULE_INPUT_VALUE = 'Input_value';
export const RULE_BYTE_ARRAY = 'Byte_array';

export const GROUP_STATEMENT_SUB = 'StatementSub';
export const RULE_END_LINES = 'End_lines';

// Terminals in grammar
export const TOKEN_MODULE = 'MODULE';
export const TOKEN_END_MODULE = 'END_MODULE';

export const TOKEN_BODY = 'BODY';
export const TOKEN_END_BODY = 'END_BODY';

export const TOKEN_INT = 'INT';
export const TOKEN_UINT = 'UINT';
export const TOKEN_DOUBLE = 'DOUBLE';
export const TOKEN_STRING = 'STRING';
export const TOKEN_TIME = 'TIME';
export const TOKEN_ABSOLUTE_TIME = 'ABSOLUTE_TIME';
export const TOKEN_RELATIVE_TIME = 'RELATIVE_TIME';

export const TOKEN_ERROR = '⚠';
export const TOKEN_COMMA = 'COMMA';
export const TOKEN_STRING_CONST = 'STRING_CONST';
export const TOKEN_DOUBLE_CONST = 'DOUBLE_CONST';
export const TOKEN_INT_CONST = 'INT_CONST';
export const TOKEN_UINT_CONST = 'UINT_CONST';
export const TOKEN_HEX_CONST = 'HEX_CONST';
export const TOKEN_TIME_CONST = 'TIME_CONST';
export const TOKEN_INT_RANGE_CONST = 'INT_RANGE_CONST';
export const TOKEN_SYMBOL_CONST = 'SYMBOL_CONST';

export const TOKEN_EXTERNAL_CALL = 'EXTERNAL_CALL';
export const TOKEN_CALL = 'CALL';
export const TOKEN_ISSUE = 'ISSUE';
export const TOKEN_SPAWN = 'SPAWN';

export const TOKEN_IF = 'IF';
export const TOKEN_ELSE_IF = 'ELSE_IF';
export const TOKEN_ELSE = 'ELSE';
export const TOKEN_END_IF = 'END_IF';
export const TOKEN_THEN = 'THEN';

export const TOKEN_WHILE = 'WHILE';
export const TOKEN_END_WHILE = 'END_WHILE';

export const TOKEN_FOR = 'FOR';
export const TOKEN_TO = 'TO';
export const TOKEN_STEP = 'STEP';
export const TOKEN_DO = 'DO';
export const TOKEN_END_FOR = 'END_FOR';

export const TOKEN_ABSOLUTE_SEQUENCE = 'ABSOLUTE_SEQUENCE';
export const TOKEN_RELATIVE_SEQUENCE = 'RELATIVE_SEQUENCE';
export const TOKEN_BLOCK = 'BLOCK';
export const TOKEN_SEQUENCE = 'SEQUENCE';
