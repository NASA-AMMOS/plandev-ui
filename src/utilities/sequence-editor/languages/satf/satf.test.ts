import { testTree } from '@lezer/generator/dist/test';
import { describe, expect, test } from 'vitest';
import { SatfLanguage } from './satf';

const tests = [
  [
    'Empty SATF',
    `
      $$EOH
      $$EOF
  `,
    `satf_sasf(Satf(
        Header,
        Body
  ))`,
  ],

  [
    'Simple SATF',
    `
    CCS3ZF0000100000001NJPL3KS0L015$$MARK$$;
    MISSION_NAME = TEST;
    CCSD3RE00000$$MARK$$NJPL3IF0M01400000001;
    $$TEST     SPACECRAFT ACTIVITY TYPE FILE
    ************************************************************
    *PROJECT          TEST
    *SPACECRAFT       000
    *Input files used:
    *File Type	Last modified			File name
    *SC_MODEL	Thu Jan 01 00:00:00 UTC 1970	/Default Sequence Project/SC_MODEL/
    ************************************************************
    $$EOH
    absolute(temp,\\temp\\)
    $$EOF
`,
    `satf_sasf(Satf(
    Header(
      SfduHeader(
        HeaderPairs(
          HeaderPair(Key,Value)
        )
      ),
      SeqHeader(
        Start,
        LineSeparator,
        HeaderRecords(
          HeaderRecord(Keyword,Data),
          HeaderRecord(Keyword,Data),
          HeaderRecord(Keyword,Data),
          HeaderRecord(Keyword,Data),
          HeaderRecord(Keyword,Data)
        ),
        LineSeparator
      )
    ),
    Body(
      ActivityTypeDefinitions(
        ActivityTypeGroup(
          ActivityTypeName,
          ActivityTypeCode
        )
      )
    )
  ))`,
  ],

  [
    'Header Gone',
    `
      $$EOH
      absolute(temp,\\temp\\)
      $$EOF
  `,
    `satf_sasf(Satf(
        Header,
        Body(
          ActivityTypeDefinitions(
            ActivityTypeGroup(
              ActivityTypeName,
              ActivityTypeCode)
            )
          )
  ))`,
  ],

  [
    'Empty SeqHeader Gone',
    `
      $$EOH
      absolute(temp,\\temp\\)
      $$EOF
  `,
    `satf_sasf(Satf(
        Header,
        Body(
          ActivityTypeDefinitions(
            ActivityTypeGroup(
              ActivityTypeName,
              ActivityTypeCode)
            )
          )
  ))`,
  ],

  [
    'Multiple Activity Groups',
    `
      $$EOH
      absolute(temp,\\temp\\),
      absolute(temp,\\temp\\)
      $$EOF
  `,
    `satf_sasf(Satf(
      Header,
      Body(
        ActivityTypeDefinitions(
          ActivityTypeGroup(
            ActivityTypeName,
            ActivityTypeCode
          )
        ,
          ActivityTypeGroup(
            ActivityTypeName,
            ActivityTypeCode
          )
       )
      )
  ))`,
  ],

  [
    'Activity Group optional values',
    `
    $$EOH
    ABSOLUTE_SEQUENCE(test,\\testv01\\,
      RETURN_TYPE, \\VOID\\,
      SEQGEN_AUTO_START_OR_LOAD_TIMES, \\S$BEGIN\\,
      VIRTUAL_CHANNEL, \\VC2\\,
      ON_BOARD_FILENAME, \\/tmp/dir/file.seq\\,
      FLAGS,\\one | two | three\\,
      HELP,\\this is help text\\,
      ON_BOARD_PATH,\\path/to/file.txt\\
    )
    $$EOF
  `,
    `satf_sasf(Satf(
      Header,
      Body(
        ActivityTypeDefinitions(
          ActivityTypeGroup(
            ActivityTypeName,
            ActivityTypeCode,
            ReturnType,
            SeqgenText,
            VirtualChannel,
            OnBoardFilename,
            Flags(
              Flag,
              Flag,
              Flag
            ),
            Help,
            OnBoardPath
          )
        )
      )
  ))`,
  ],

  [
    'Activity Group inline optional values',
    `
    $$EOH
    ABSOLUTE_SEQUENCE(test,\\testv01\\,RETURN_TYPE, \\VOID\\,ON_BOARD_PATH,   \\path/to/file.txt\\,
      SEQGEN_AUTO_START_OR_LOAD_TIMES,    \\S$BEGIN\\,
      HELP,\\this is help text\\,
          ON_BOARD_FILENAME,\\/tmp/dir/file.seq\\,VIRTUAL_CHANNEL,\\VC2\\,FLAGS,\\one | two | three\\
    )
    $$EOF
  `,
    `satf_sasf(Satf(
      Header,
      Body(
        ActivityTypeDefinitions(
          ActivityTypeGroup(
            ActivityTypeName,
            ActivityTypeCode,
            ReturnType,
            OnBoardPath,
            SeqgenText,
            Help,
            OnBoardFilename,
            VirtualChannel,
            Flags(
              Flag,
              Flag,
              Flag
            )
          )
        )
      )
  ))`,
  ],

  [
    'Parameters',
    `
    $$EOH
    ABSOLUTE_SEQUENCE(test,\\testv01\\,
      PARAMETERS,
        burn_timeout(
          TYPE,FLOAT,
          RANGE,\\135.0...2500.0\\,
          RANGE, \\10 ... 20\\
          RANGE, \\20 ... 5\\
          HELP,\\cool help folks\\
          DEFAULT,0
        ),
        close_lv(
          TYPE,STRING,
          ENUM_NAME,\\YES_NO\\,
          PREFIX,YES
        ),
        minimum_momentum_delta(
          TYPE,FLOAT,
          RANGE,\\0.1...35.0\\
          RANGE, \\CLK_DUR:15:05:1 ...CLK_DUR:17:20:0\\
          RANGE, \\101T12:15:32.512 ...101T10:20:20.123\\
          RANGE, \\3.4, 0.9, 12.\\,
        ),
        Target (
          TYPE, STRING,
          RANGE, \\ "J", "I", "E" \\,
          DEFAULT, "J" ,
          HELP, \\ Target information for AACS \\ ),
        end
    )
    $$EOF
  `,
    `satf_sasf(Satf(
      Header,
      Body(
        ActivityTypeDefinitions(
          ActivityTypeGroup(
            ActivityTypeName,
            ActivityTypeCode,
            Parameters(
              Entry(
                Name,
                Type,
                Range,
                Range,
                Range,
                Help,
                Default
              ),
              Entry(
                Name,
                Type,
                EnumName,
                Prefix
              ),
              Entry(
                Name,
                Type,
                Range,
                Range,
                Range,
                Range
              ),
              Entry(
                Name,
                Type,
                Range,
                Default,
                Help
              )
            )
          )
        )
      )
  ))`,
  ],

  [
    'Variables',
    `
    $$EOH
    ABSOLUTE_SEQUENCE(test,\\testv01\\,
      VARIABLES,
        burn_timeout(
          TYPE,FLOAT,
          RANGE,\\135.0...2500.0\\,
          RANGE, \\10 ... 20\\
          RANGE, \\20 ... 5\\
          HELP,\\cool help folks\\
          DEFAULT,0
        ),
        close_lv(
          TYPE,STRING,
          ENUM_NAME,\\YES_NO\\,
          PREFIX,YES
        ),
        minimum_momentum_delta(
          TYPE,FLOAT,
          RANGE,\\0.1...35.0\\
          RANGE, \\CLK_DUR:15:05:1 ...CLK_DUR:17:20:0\\
          RANGE, \\101T12:15:32.512 ...101T10:20:20.123\\
          RANGE, \\3.4, 0.9, 12.\\,
        ),
        Target (
          TYPE, STRING,
          RANGE, \\ "J", "I", "E" \\,
          DEFAULT, "J" ,
          HELP, \\ Target information, for AACS \\ ),
        end
    )
    $$EOF
  `,
    `satf_sasf(Satf(
      Header,
      Body(
        ActivityTypeDefinitions(
          ActivityTypeGroup(
            ActivityTypeName,
            ActivityTypeCode,
            Variables(
              Entry(
                Name,
                Type,
                Range,
                Range,
                Range,
                Help,
                Default
              ),
              Entry(
                Name,
                Type,
                EnumName,
                Prefix
              ),
              Entry(
                Name,
                Type,
                Range,
                Range,
                Range,
                Range
              ),
              Entry(
                Name,
                Type,
                Range,
                Default,
                Help
              )
            )
          )
        )
      )
  ))`,
  ],

  [
    'Variables and Parameters',
    `
    $$EOH
    ABSOLUTE_SEQUENCE(test,\\testv01\\,
      VARIABLES,
        burn_timeout(
          TYPE,FLOAT,
          RANGE,\\135.0...2500.0\\,
          RANGE, \\10 ... 20\\
          RANGE, \\20 ... 5\\
          HELP,\\cool help folks\\
          DEFAULT,0
        ),
        close_lv(
          TYPE,STRING,
          ENUM_NAME,\\YES_NO\\,
          PREFIX,YES
        ),
        minimum_momentum_delta(
          TYPE,FLOAT,
          RANGE,\\0.1...35.0\\
          RANGE, \\CLK_DUR:15:05:1 ...CLK_DUR:17:20:0\\
          RANGE, \\101T12:15:32.512 ...101T10:20:20.123\\
          RANGE, \\3.4, 0.9, 12.\\,
        ),
        Target (
          TYPE, STRING,
          RANGE, \\ "J", "I", "E" \\,
          DEFAULT, "J" ,
          HELP, \\ Target information for AACS \\ ),
        end
      PARAMETERS,
        burn_timeout(
          TYPE,FLOAT,
          RANGE,\\135.0...2500.0\\,
          RANGE, \\10 ... 20\\
          RANGE, \\20 ... 5\\
          HELP,\\cool help folks\\
          DEFAULT,0
        ),
      end,
    )
    $$EOF
  `,
    `satf_sasf(Satf(
      Header,
      Body(
        ActivityTypeDefinitions(
          ActivityTypeGroup(
            ActivityTypeName,
            ActivityTypeCode,
            Variables(
              Entry(
                Name,
                Type,
                Range,
                Range,
                Range,
                Help,
                Default
              ),
              Entry(
                Name,
                Type,
                EnumName,
                Prefix
              ),
              Entry(
                Name,
                Type,
                Range,
                Range,
                Range,
                Range
              ),
              Entry(
                Name,
                Type,
                Range,
                Default,
                Help
              )
            ),
            Parameters(
              Entry(
                Name,
                Type,
                Range,
                Range,
                Range,
                Help,
                Default
              ),
            )
          )
        )
      )
  ))`,
  ],

  [
    'Commands',
    `
      $$EOH
        ABSOLUTE_SEQUENCE(test,\\testv01\\,
          STEPS,
          command(
            1,
            SCHEDULED_TIME,\\00:00:01\\,FROM_PREVIOUS_START,
            STR_FILES_RM("/eng/seq/ENG_EXEC_b2024288_e2024294.seq")
          ),
          command(
            3472,
            SCHEDULED_TIME, \\param4\\,
            FROM_ACTIVITY_START, INCLUSION_CONDITION, \\param_rate == receive_rate\\,
            DRAW, VERTICAL,
            COMMENT, \\This command is intended to turn the NIMS to correct position.\\),
          command (
            3472, SCHEDULED_TIME, \\param4\\, FROM_ACTIVITY_START, INCLUSION_CONDITION, \\param_rate == receive_rate\\,
            DRAW, \\VERTICAL\\,
            COMMENT, \\This command turns the NIMS, to correct position.\\, ASSUMED_MODEL_VALUES, \\x=1,y="abc",z=0.2, Tel::power=1\\,
            01VV (param6, param7, param8 + param9),
            PROCESSORS, "PRI", end),
          command(
            2,
            SCHEDULED_TIME,\\00:00:01\\,FROM_PREVIOUS_START,
            STR_FILES_RM
          ),
          end
        )
    $$EOF
  `,
    `satf_sasf(Satf(
      Header
      Body(
        ActivityTypeDefinitions(
        ActivityTypeGroup(
          ActivityTypeName,
          ActivityTypeCode,
          Steps(
            Command(
              StepLabel,
              ScheduledTime(
                Time,
                TimeRelation
              ),
              Stem,
              Args(
                String
              )
            ),
            Command(
              StepLabel,
              ScheduledTime(
                Time,
                TimeRelation
              ),
              InclusionCondition,
              Draw,
              Comment
            ),
            Command(
              StepLabel,
              ScheduledTime(
                Time,
                TimeRelation
              ),
              InclusionCondition,
              Draw,
              Comment,
              AssumedModelValues(
                Model(Key,Value),
                Model(Key,Value),
                Model(Key,Value),
                Model(Key,Value))
              Stem,
              Args(
                Enum,
                Enum,
                Arithmetical
              ),
              Processors
            ),
            Command(
              StepLabel,
              ScheduledTime(
                Time,
                TimeRelation
              ),
              Stem
            )
          )
        )
      )
    )
  )
  )`,
  ],

  [
    'Dynamic Commands',
    `
      $$EOH
      ABSOLUTE_SEQUENCE(test,\\testv01\\,
          STEPS,
              Command_dynamic (
                  3472,
                  SCHEDULED_TIME, \\param4\\, FROM_ACTIVITY_START,
                  INCLUSION_CONDITION, \\param_rate == receive_rate\\,
                  DRAW, \\VERTICAL\\,
                  NTEXT, \\"This command turns the NIMS to correct position."\\,
                  COMMENT, \\This command turns the NIMS to correct position.\\, "01vv" (param6, param7, a+b),
                  PROCESSORS, "PRI", end
              ),
              Command_dynamic (
                  3472, SCHEDULED_TIME, \\param4\\, FROM_ACTIVITY_START,
                  "01vv",
                  PROCESSORS, end ),
          end
      )
      $$EOF
  `,
    `satf_sasf(Satf(
      Header,
      Body(
        ActivityTypeDefinitions(
          ActivityTypeGroup(
            ActivityTypeName,
            ActivityTypeCode,
            Steps(
              CommandDynamic(
                StepLabel,
                ScheduledTime(
                  Time,
                  TimeRelation
                ),
                InclusionCondition,
                Draw,
                Ntext,
                Comment,
                Stem,
                Args(
                  Enum,
                  Enum,
                  Arithmetical
                ),
                Processors
              ),
              CommandDynamic(
                StepLabel,
                ScheduledTime(
                  Time,
                  TimeRelation
                ),
                Stem
              )
            )
          )
        )
      )
    )
  )`,
  ],

  [
    'Notes',
    `
      $$EOH
      ABSOLUTE_SEQUENCE(test,\\testv01\\,
          STEPS,
              note (
                  327.1, SCHEDULED_TIME, \\param_time\\, FROM_PREVIOUS_START,
                  TEXT, \\"Cmd 06VV22 will be issued at"+TIME_TO_STRING(param_time)\\
              ),
              note (2,
              SCHEDULED_TIME, \\param_time\\, FROM_PREVIOUS_START, INCLUSION_CONDITION, \\param_rate == receive_rate\\,
              DRAW, \\STANDARD\\, COMMENT, \\This informs the flight team, about this command.\\, TEXT, \\"Cmd 06VV22 will be issued at"+TIME_TO_STRING(param_time)\\ ),
          end
      )
    $$EOF
  `,
    `satf_sasf(Satf(
    Header,
    Body(
      ActivityTypeDefinitions(
        ActivityTypeGroup(ActivityTypeName,ActivityTypeCode,Steps(
          Note(StepLabel,ScheduledTime(Time,TimeRelation),Stem,Args(Expression)),
          Note(StepLabel,ScheduledTime(Time,TimeRelation),InclusionCondition,Draw,Comment,Stem,Args(Expression))))))))`,
  ],

  [
    'Activate',
    `
      $$EOH
      ABSOLUTE_SEQUENCE(test,\\testv01\\,
          STEPS,
              activity (3, SCHEDULED_TIME, \\param_time\\, FROM_PREVIOUS_START, INCLUSION_CONDITION, \\param_one <= symbol_range\\,
                  DRAW, \\HORIZONTAL\\,
                  COMMENT, \\This is an example of a SEQGEN directive.\\,
                  SEQGEN_directive(MODEL,"my_model")
              ),
              activity (3, SCHEDULED_TIME, \\param_time\\, FROM_PREVIOUS_START,
                  SEQGEN_directive(SSF_BEGIN,"my_SSF", "123", "My sequence") ),
              activity (3, SCHEDULED_TIME, \\param_time\\, FROM_PREVIOUS_START,
                  COMMENT, \\This is an example of a SEQTRAN_SETR directive.\\,
                  SEQTRAN_SETR(macro,"abc", "123", "5,123,OP")
              ),
              activity (3, SCHEDULED_TIME, \\param_time\\, FROM_PREVIOUS_START,
              SEQTRAN_directive(WINDOW,"abc", "123",
              "5,123,OP") ),
              activity (3, SCHEDULED_TIME, \\param_time\\, FROM_PREVIOUS_START, SEQTRAN_directive(SEQEND))
          end
      )
      $$EOF
  `,
    `satf_sasf(Satf(Header,Body(ActivityTypeDefinitions(ActivityTypeGroup(ActivityTypeName,ActivityTypeCode,Steps(
      Activity(StepLabel,ScheduledTime(Time,TimeRelation),InclusionCondition,Draw,Comment,
        Group(TypeGroup,TypeName,Name)),
      Activity(StepLabel,ScheduledTime(Time,TimeRelation),
        Group(TypeGroup,TypeName,Filename,SeqId,Title)),
      Activity(StepLabel,ScheduledTime(Time,TimeRelation),Comment,
        Group(TypeGroup,TypeName,Label,Opcode,Pars)),
      Activity(StepLabel,ScheduledTime(Time,TimeRelation),
        Group(TypeGroup,TypeName,Args(String,String,String))),
      Activity(StepLabel,ScheduledTime(Time,TimeRelation),
        Group(TypeGroup,TypeName))))))))`,
  ],

  [
    'Loops',
    `
    $$EOH
    ABSOLUTE_SEQUENCE(test,\\testv01\\,
        STEPS,
            loop (
                14.2, SCHEDULED_TIME, \\0\\, FROM_ACTIVITY_START,
                COMMENT, \\Example of a loop structure for the SEQGEN program.\\,
                COUNT, \\param_count\\
            ),
            command (
                245, SCHEDULED_TIME, \\param_time + param_offset\\, FROM_PREVIOUS_START,
                4GLS22 (param6, param8, param7 + param9), PROCESSORS,end
            ),
            command (
                327, SCHEDULED_TIME, \\param_time *param_offset\\,FROM_PREVIOUS_START,
                4GLS33
            ),
            end_loop (
                247, SCHEDULED_TIME, \\param_time + param_delta\\, FROM_PREVIOUS_START),
        end
    )
    $$EOF
  `,
    `satf_sasf(Satf(Header,Body(ActivityTypeDefinitions(ActivityTypeGroup(ActivityTypeName,ActivityTypeCode,
      Steps(
        Loop(StepLabel,ScheduledTime(Time,TimeRelation),Comment,
          Count,
          Steps(
            Command(StepLabel,ScheduledTime(Time,TimeRelation),Stem,Args(Enum,Enum,Arithmetical)),
            Command(StepLabel,ScheduledTime(Time,TimeRelation),Stem)
          ),
          EndLoop,StepLabel,ScheduledTime(Time,TimeRelation)
  )))))))`,
  ],

  [
    'Assignment',
    `
    $$EOH
        ABSOLUTE_SEQUENCE(test,\\testv01\\,
            STEPS,
                assignment(326, SCHEDULED_TIME, \\param2 + param3\\, FROM_ACTIVITY_START,
                PHASE,
                \\3.14\\),
        end
    )
    $$EOF
  `,
    `satf_sasf(Satf(Header,Body(ActivityTypeDefinitions(ActivityTypeGroup(ActivityTypeName,ActivityTypeCode,
      Steps(
        Assignment(StepLabel,ScheduledTime(Time,TimeRelation),
          Variable,Args(Number)
  )))))))`,
  ],

  [
    'Ground Event',
    `
     $$EOH
        ABSOLUTE_SEQUENCE(test,\\testv01\\,
            STEPS,
                ground (3472, SCHEDULED_TIME, \\param4\\, FROM_ACTIVITY_START, INCLUSION_CONDITION, \\param_rate == receive_rate\\,
                  COMMENT, \\Occurs at the maximum elevation of the station.\\, max_elevation(ELEV)),
                ground (3472, SCHEDULED_TIME, \\00:01:01\\, FROM_ACTIVITY_START, fire_booster(10.0))
        end
      )
    $$EOF
  `,
    `satf_sasf(Satf(Header,Body(ActivityTypeDefinitions(ActivityTypeGroup(ActivityTypeName,ActivityTypeCode,Steps(
      Ground(StepLabel,ScheduledTime(Time,TimeRelation),InclusionCondition,Comment,Stem,Args(Enum)),
      Ground(StepLabel,ScheduledTime(Time,TimeRelation),Stem,Args(Number))
  ))))))`,
  ],

  [
    'sample satf',
    `
    $$EOH
    RT_on_board_block(test_block, test_block,
        RETURN_TYPE,\\\\, HELP,\\Just a test\\,
        PARAMETERS,
            P1(
                TYPE, \\INTEGER\\,
                RANGE, \\1 ... 50\\,
                DEFAULT, \\10\\,
                HELP, \\Controls number of loops\\
            ),
            D1(
                TYPE, \\DURATION\\
            ),
        end,
        VARIABLES,
            T(
                TYPE, \\TIME\\,
                DEFAULT, \\2000-001T00:00:00.000\\
            ), count(
                TYPE, \\INTEGER\\,
                DEFAULT, \\0\\
            ),
            wait_flag1(
                TYPE, \\INTEGER\\,
                DEFAULT, \\0\\
            ),
            wait_flag2(
                TYPE, \\BOOLEAN\\,
                DEFAULT, \\TRUE\\
            ),
            V1(
                TYPE, \\STRING\\,
                DEFAULT, \\""\\
            ),
        end,
        STEPS,
            command(1,
                SCHEDULED_TIME, \\0:00:00\\, FROM_PREVIOUS_END, COMMENT, \\First cmd\\,
                RW_1_PWR("OFF")
            ),
            command(6,
                SCHEDULED_TIME, 0:00:00, FROM_PREVIOUS_END, COMMENT, \\\\,
                UHF_POWER()
            ),
        end
    ),

    RT_on_board_block(GV_control, GV_control, RETURN_TYPE,\\d\\,
        HELP,\\Just a test\\,
        PARAMETERS,
            D1(
                TYPE, \\DURATION\\
            ),
        end,
        STEPS,
            note(5,
                SCHEDULED_TIME,00:00:00,FROM_PREVIOUS_END,
                TEXT, \\"GV::GV_SPARE_21 should be set to 2 now"\\ ),
            note(7,
            SCHEDULED_TIME,00:00:00,FROM_PREVIOUS_END,
            TEXT, \\"GV::GV_SPARE_22 should be set to 0 now"\\
            ),
            command(3, SCHEDULED_TIME,00:00:00,FROM_PREVIOUS_END, ECHO(global::blah))
            end)
    $$EOF
  `,
    `satf_sasf(Satf(Header,Body(ActivityTypeDefinitions(
      ActivityTypeGroup(ActivityTypeName,ActivityTypeCode,Help,
        Parameters(Entry(Name,Type,Range,Default,Help),Entry(Name,Type)),Variables(Entry(Name,Type,Default),Entry(Name,Type,Default),Entry(Name,Type,Default),Entry(Name,Type,Default),Entry(Name,Type,Default)),
        Steps(
          Command(StepLabel,ScheduledTime(Time,TimeRelation),Comment,Stem,Args(String)),
          Command(StepLabel,ScheduledTime(Time,TimeRelation),Stem))),
      ActivityTypeGroup(ActivityTypeName,ActivityTypeCode,ReturnType,Help,
        Parameters(Entry(Name,Type)),
        Steps(
          Note(StepLabel,ScheduledTime(Time,TimeRelation),Stem,Args(Expression)),
          Note(StepLabel,ScheduledTime(Time,TimeRelation),Stem,Args(Expression)),
          Command(StepLabel,ScheduledTime(Time,TimeRelation),Stem,Args(Global))
  ))))))`,
  ],
];

describe.each([['parse tree structure', tests]])('grammar tests - %s', (_name: string, testArray: string[][]) => {
  test.each(testArray)('%s', (_: string, input: string, expected: string) => {
    /* The Lezer parser is "Error-Insensitive"
    "Being designed for the code editor use case, the parser is equipped with strategies for recovering
    from syntax errors, and can produce a tree for any input." - (https://lezer.codemirror.net/) as such
    it always returns a tree, though the tree may have error tokens ("⚠").

    testTree will throw if there's a mismatch between the returned actual and expected trees, it returns
    undefined when they match. */
    expect(testTree(SatfLanguage.parser.parse(input), expected, undefined)).toBeUndefined();
  });
});
