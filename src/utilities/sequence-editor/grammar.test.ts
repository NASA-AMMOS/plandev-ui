import { testTree } from '@lezer/generator/dist/test';
import { describe, expect, test } from 'vitest';
import { SeqLanguage } from '../codemirror';

/*
 * Test cases here are canaries against unintended changes to the grammar. Certain grammar changes will alter the parse tree which
 * has may have subtle downstream effects on the behavior of serialization, tooltips, content assist, etc.
 *
 * When invalid input is parsed the tree will contain "⚠" nodes.
 */

const parseTreeTests = [
  [
    'Command with no args',
    'FSW_CMD',
    `Sequence(
    Commands(
      Command(Stem,Args)
    )
  )`,
  ],
  [
    'Hardware commands',
    `@HARDWARE
HARDWARE_COMMAND_1
HDW_2`,
    `Sequence(
HardwareCommands(
Command(Stem,Args),
Command(Stem,Args)
)
)`,
  ],
  [
    'Generic directive',
    `@WRONG_LOAD_AND_GO

C CMD_1`,
    `Sequence(
GenericDirective,
Commands(
Command(TimeTag(TimeComplete),Stem,Args)
)
)`,
  ],
  ['Command with two string args', `FSW_CMD "hello" "world"`, `Sequence(Commands(Command(Stem,Args(String,String))))`],
  [
    'Command with mixed args',
    `FSW_CMD "hello" 10`,
    `Sequence(Commands(
Command(Stem,Args(String,Number))
))`,
  ],
  [
    'Command with mixed args and comment',
    `FSW_CMD "hello" 10# yay comment`,
    `Sequence(Commands(
Command(Stem,Args(String,Number),LineComment)
))`,
  ],
  [
    'Command with two sting args wrapped by comments',
    `# full line comment
FSW_CMD "TRUE" "FALSE" # end of line
# full line comment`,
    `Sequence(Commands(
LineComment,
Command(Stem,Args(String,String),LineComment),
LineComment
))`,
  ],
  [
    'Command with enum args (disallowed in linter)',
    `FSW_CMD TRUE FALSE`,
    `Sequence(Commands(Command(Stem,Args(Enum,Enum))))`,
  ],
  [
    'Command with enum args and comments',
    `# Com
FSW_CMD TRUE FALSE # Com 1
# Com`,
    `Sequence(Commands(
LineComment,
Command(Stem,Args(Enum,Enum),LineComment),
LineComment
))`,
  ],
  [
    'Command with repeat args',
    `C CMD_1 ["asd"] [] ["asdf" 2] [   4      4]`,
    `Sequence(Commands(
Command(TimeTag(TimeComplete),Stem,Args(
RepeatArg(String),
RepeatArg,
RepeatArg(String,Number),
RepeatArg(Number,Number)
))
))`,
  ],
  [
    'Locals and commands',
    `# comment before parameter
@INPUT_PARAMS L02INT { "name": "test" }
# declare my local variables, types are defined in adaptation
# comment before directive
@LOCALS L01STRING L02INT
# before metadata comment
@METADATA "foo" "val foo"
# before commands comment
FSW_CMD 1 2
FSW_CMD2`,
    `Sequence(
LineComment,
ParameterDeclaration(Enum,Object(Property(PropertyName(String),String))),
LineComment,
LineComment,
LocalDeclaration(Enum,Enum),
LineComment,
Metadata(
MetaEntry(Key(String),Value(String))
),
Commands(
LineComment,
Command(Stem,Args(Number,Number)),
Command(Stem,Args)
)
)`,
  ],
  [
    'Parameters, locals, and commands',
    `@INPUT_PARAMS L01STRING L02INT
@LOCALS L01STRING L02INT
FSW_CMD 1 2
FSW_CMD2`,
    `Sequence(
ParameterDeclaration(Enum,Enum),
LocalDeclaration(Enum,Enum),
Commands(
Command(Stem,Args(Number,Number)),
Command(Stem,Args)
)
)`,
  ],
  [
    'Parameters, locals, and indented commands',
    `@INPUT_PARAMS L01STRING L02INT
@LOCALS L01STRING L02INT
  FSW_CMD 1 2
  FSW_CMD2 "string val"`,
    `Sequence(
ParameterDeclaration(Enum,Enum),
LocalDeclaration(Enum,Enum),
Commands(
Command(Stem,Args(Number,Number)),
Command(Stem,Args(String))
)
)`,
  ],
  [
    'Commands with models and metadata',
    `@ID "big test"

@METADATA "foo" "val foo"
@METADATA "empty_object" {}
@METADATA "empty_object_with_space" { }
@METADATA "level0" { "level1": { "l2obj": { }, "l2empty_arr": [ ], "l2arr": [ 1, 2, 3 ] } }

CMD_1 1 2 3
@METADATA "foo" "val\\" foo2"
@METADATA "bar" "val bar"

CMD_2 "hello, it's me"
@METADATA "bar" { "foo": 5}
@MODEL "a" 5 "c"
@MODEL "d" true "f"`,
    `Sequence(
IdDeclaration(String),
Metadata(
  MetaEntry(Key(String),Value(String)),
  MetaEntry(Key(String),Value(Object)),
  MetaEntry(Key(String),Value(Object)),
  MetaEntry(Key(String),Value(
    Object(Property(PropertyName(String),Object(
      Property(PropertyName(String),Object),
      Property(PropertyName(String),Array),
      Property(PropertyName(String),Array(Number,Number,Number))
    ))
  )))
),
Commands(
Command(
  Stem,
  Args(Number,Number,Number),
  Metadata(
    MetaEntry(Key(String),Value(String)),
    MetaEntry(Key(String),Value(String))
  )
),
Command(
  Stem,
  Args(String),
  Metadata(
    MetaEntry(
      Key(String),
      Value(Object(Property(PropertyName(String),Number)))
    )
  ),
  Models(
    Model(Variable(String),Value(Number),Offset(String)),
    Model(Variable(String),Value(Boolean),Offset(String))
  )
)
)
)`,
  ],
  [
    'Commands with models and metadata, with mixed indentation',
    `@ID "big test"

@METADATA "foo" "val foo"

# indented 4 spaces
CMD_1 1 2 3
@METADATA "foo" "val\\" foo2"
@METADATA "bar" "val bar"


    # indented 8 spaces
    CMD_2 "hello, it's me"
    @METADATA "bar" "val bar2"
    @MODEL "a" "b" "c"
    @MODEL  "d" "e" "f"`,
    `Sequence(
IdDeclaration(String),
Metadata(
MetaEntry(Key(String),Value(String))
),
Commands(
LineComment,
Command(
  Stem,
  Args(Number,Number,Number),
  Metadata(
    MetaEntry(Key(String),Value(String)),
    MetaEntry(Key(String),Value(String))
  )
),
LineComment,
Command(
  Stem,
  Args(String),
  Metadata(
    MetaEntry(Key(String),Value(String))
  ),
  Models(
    Model(Variable(String),Value(String),Offset(String)),
    Model(Variable(String),Value(String),Offset(String))
  )
)
)
)`,
  ],
  [
    'Mega Sequence',
    `
@ID "big test"

# Welcome


@INPUT_PARAMS PARM1


# Bingo

@LOCALS FOO    BAR     BIZ







@METADATA "foo" "val foo"



@LOAD_AND_GO

# indented 4 spaces
CMD_1 1 2 3
@METADATA "foo" "val\\" foo2"
@METADATA "bar" "val bar"


# indented 8 spaces
CMD_2 "hello, it's me"
@MODEL "a" "b" "c"
@MODEL  "d" "e" "f"
`,
    `Sequence(
IdDeclaration(String),
LineComment,
ParameterDeclaration(Enum),
LineComment,
LocalDeclaration(Enum,Enum,Enum),
Metadata(MetaEntry(Key(String),Value(String))),
Commands(
LoadAndGoDirective,
LineComment,
Command(Stem,Args(Number,Number,Number),Metadata(MetaEntry(Key(String),Value(String)),MetaEntry(Key(String),Value(String)))),
LineComment,
Command(Stem,Args(String),Models(Model(Variable(String),Value(String),Offset(String)),Model(Variable(String),Value(String),Offset(String))))
)
)`,
  ],
  [
    `Seq.Json comprehension`,
    `A2024-123T12:34:56 @GROUND_BLOCK("ground_block.name") # No Args
R123T12:34:56 @GROUND_EVENT("ground_event.name") "foo" 1 2 3
A2024-123T12:34:56 @ACTIVATE("activate.name") # No Args
@ENGINE 10
@EPOCH "epoch string"
R123T12:34:56 @ACTIVATE("act2.name") "foo" 1 2 3  # Comment
@ENGINE -1
A2024-321T11:22:33 @LOAD("load.name") # No Args
@ENGINE 10
@EPOCH "epoch string"
R123T12:34:56 @LOAD("load2.name") "foo" 1 2 3  # A comment
@ENGINE -1
G3 "Name" @REQUEST_BEGIN("request.name") # Description Text
  C CMD_0 1 2 3
  @METADATA "foo" "bar"
  @MODEL "a" 1 "00:00:00"
  R100 CMD_1 "1 2 3"
  C CMD_2 1 2 3
  R100 CMD_3 "1 2 3"
@REQUEST_END
@METADATA "sub_object" {
  "boolean": true
}
A2024-123T12:34:56 @REQUEST_BEGIN("request2.name")
  C CMD_0 1 2 3
  @METADATA "foo" "bar"
  @MODEL "a" 1 "00:00:00"
  R100 CMD_1 "1 2 3"
  C CMD_2 1 2 3
  R100 CMD_3 "1 2 3"
  C CMD_4 1 2 3
  R100 CMD_5 "1 2 3"
@REQUEST_END
@METADATA "foo" "bar"
`,
    `
Sequence(Commands(
  GroundBlock(TimeTag(TimeAbsolute),GroundName(String),Args,LineComment),
  GroundEvent(TimeTag(TimeRelative),GroundName(String),Args(String,Number,Number,Number)),
  Activate(TimeTag(TimeAbsolute),SequenceName(String),Args,LineComment,Engine(Number),Epoch(String)),
  Activate(TimeTag(TimeRelative),SequenceName(String),Args(String,Number,Number,Number),LineComment,Engine(Number)),
  Load(TimeTag(TimeAbsolute),SequenceName(String),Args,LineComment,Engine(Number),Epoch(String)),
  Load(TimeTag(TimeRelative),SequenceName(String),Args(String,Number,Number,Number),LineComment,Engine(Number)),
  Request(
    TimeTag(TimeGroundEpoch,Name(String)),
    RequestName(String),LineComment,
    Steps(
      Command(TimeTag(TimeComplete),Stem,Args(Number,Number,Number),Metadata(MetaEntry(Key(String),Value(String))),Models(Model(Variable(String),Value(Number),Offset(String)))),
      Command(TimeTag(TimeRelative),Stem,Args(String)),
      Command(TimeTag(TimeComplete),Stem,Args(Number,Number,Number)),
      Command(TimeTag(TimeRelative),Stem,Args(String))
    ),
    Metadata(MetaEntry(Key(String),Value(Object(Property(PropertyName(String),Boolean)))))
  ),
  Request(
    TimeTag(TimeAbsolute),
    RequestName(String),
    Steps(
      Command(TimeTag(TimeComplete),Stem,Args(Number,Number,Number),Metadata(MetaEntry(Key(String),Value(String))),Models(Model(Variable(String),Value(Number),Offset(String)))),
      Command(TimeTag(TimeRelative),Stem,Args(String)),
      Command(TimeTag(TimeComplete),Stem,Args(Number,Number,Number)),
      Command(TimeTag(TimeRelative),Stem,Args(String)),
      Command(TimeTag(TimeComplete),Stem,Args(Number,Number,Number)),
      Command(TimeTag(TimeRelative),Stem,Args(String))
    ),
    Metadata(MetaEntry(Key(String),Value(String)))
  )
))
`,
  ],
];

const errorTests = [
  [
    'Bad Input - Invalid stems',
    `C 2_STEM_NAME
STEM$BAR`,
    `Sequence(Commands(Command(TimeTag(TimeComplete),⚠(Number),Stem,Args),Command(Stem,⚠),Command(Stem,Args)))`,
  ],
  [
    'Stem with disallowed characters',
    `FSW_CMD%BAR$BAZ`,
    `Sequence(Commands(
Command(Stem,⚠),
Command(Stem,⚠),
Command(Stem,Args)
))`,
  ],
  [
    'Stem ending in disallowed character',
    `FSW_CMD%`,
    `Sequence(Commands(
Command(Stem,⚠,Args)
))`,
  ],
  [
    'Mismatched brackets',
    `CMD [[]
CMD2 [
CMD3 ]`,
    `Sequence(Commands(
Command(Stem,Args(RepeatArg(⚠))),
Command(Stem,Args(RepeatArg(⚠,Enum)))
))`,
  ],
  ['locals with wrong value types', `@LOCALS "string_not_enum"`, `Sequence(LocalDeclaration(⚠(String)))`],
];

const timeFormatTests = [
  [
    'Different absolute time tags',
    `C CMD_1
  A2030-001T12:34:56 CMD_2 "hello" "world"
  A2030-001T12:34:56.789 CMD_3 "sub seconds"
  `,
    `Sequence(Commands(
Command(
TimeTag(TimeComplete),
Stem,
Args
),
Command(
TimeTag(TimeAbsolute),
Stem,
Args(String,String)
),
Command(
TimeTag(TimeAbsolute),
Stem,
Args(String)
),
))`,
  ],
  [
    'Different relative times',
    `R010T01:00:00.000 CMD_4 "hello" 10
R00:10:00.000 CMD_5
R00:00:01 CMD_6
R00:00:01.123 CMD_7
R10 CMD_8 10
R10.123 CMD_9 10`,
    `Sequence(Commands(
Command(
TimeTag(TimeRelative),
Stem,
Args(String,Number)
),
Command(
TimeTag(TimeRelative),
Stem,
Args
),
Command(
TimeTag(TimeRelative),
Stem,
Args
),
Command(
TimeTag(TimeRelative),
Stem,
Args
),
Command(
TimeTag(TimeRelative),
Stem,
Args(Number)
),
Command(
TimeTag(TimeRelative),
Stem,
Args(Number)
)
))`,
  ],
  [
    'Different epoch times',
    `E123T12:34:56.789 CMD_3
E-123T12:34:56.789 CMD_3
E+123T12:34:56.789 CMD_3
E12:34:56.789 CMD_3
E-12:34:56.789 CMD_3
E+12:34:56.789 CMD_3
E123T12:34:56 CMD_3
E-123T12:34:56 CMD_3
E+123T12:34:56 CMD_3
E12:34:56 CMD_3
E-12:34:56 CMD_3
E+12:34:56 CMD_3
E123 CMD_3
E-123 CMD_3
E+123 CMD_3
E123.456 CMD_3
E-123.456 CMD_3
E+123.456 CMD_3
  `,
    `Sequence(Commands(
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args),
Command(TimeTag(TimeEpoch),Stem,Args)
  ))`,
  ],
];

describe.each([
  ['error tokens', errorTests],
  ['parse tree structure', parseTreeTests],
  ['time formats', timeFormatTests],
])('grammar tests - %s', (_name: string, testArray: string[][]) => {
  test.each(testArray)('%s', (_: string, input: string, expected: string) => {
    /* The Lezer parser is "Error-Insensitive"
    "Being designed for the code editor use case, the parser is equipped with strategies for recovering
    from syntax errors, and can produce a tree for any input." - (https://lezer.codemirror.net/) as such
    it always returns a tree, though the tree may have error tokens ("⚠").

    testTree will throw if there's a mismatch between the returned actual and expected trees, it returns
    undefined when they match. */
    expect(testTree(SeqLanguage.parser.parse(input), expected, undefined)).toBeUndefined();
  });
});
