import { describe, expect, it } from 'vitest';
import { satfToSequence } from './satf-sasf-utils';

describe('satfToSequence', () => {
  it('should return empty header and sequences for empty SATF string', async () => {
    const satf = '';
    const result = await satfToSequence(satf);
    expect(result).toEqual({ header: '', sequences: [] });
  });

  it('should return empty for invalid SATF string', async () => {
    const satf = ' invalid satf string ';

    const result = await satfToSequence(satf);
    expect(result).toEqual({ header: '', sequences: [] });
  });

  it('should parse valid SATF string with header and sequences', async () => {
    const satf = `
      $$EOH
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
    `;
    const result = await satfToSequence(satf);
    expect(result).toHaveProperty('header');
    expect(result).toHaveProperty('sequences');
    expect(result.sequences).toBeInstanceOf(Array);
  });

  it('should return empty sequences for SATF string with missing sequences', async () => {
    const satf = `
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
      $$EOF
    `;
    const result = await satfToSequence(satf);
    expect(result).toHaveProperty('header');
    expect(result.sequences).toEqual([]);
  });

  it('should return empty header for SATF string with missing header', async () => {
    const satf = `
      $$EOH
      absolute(temp,\\temp\\)
      $$EOF
    `;
    const result = await satfToSequence(satf);
    expect(result).toHaveProperty('sequences');
    expect(result.header).toEqual('');
  });

  it('should return valid sequence with models', async () => {
    const satf = `
      $$EOH
      ABSOLUTE_SEQUENCE(test,\\testv01\\,
          STEPS,
          command (
            3472, SCHEDULED_TIME, \\00:01:00\\, FROM_ACTIVITY_START, INCLUSION_CONDITION, \\param_rate == receive_rate\\,
            DRAW, \\VERTICAL\\,
            COMMENT, \\This command turns, to correct position.\\, ASSUMED_MODEL_VALUES, \\x=1,z=1.1,y="abc"\\,
            01VV (param6, 10, false, "abc"),
            PROCESSORS, "PRI", end),
          end
        )
      $$EOF
    `;
    const result = await satfToSequence(satf);
    expect(result).toHaveProperty('sequences');
    expect(result.sequences[0].name).toStrictEqual('test');
    expect(result.sequences[0].sequence).toStrictEqual(`## test
B00:01:00  01VV param6 10 false "abc" # This command turns, to correct position.
@MODEL "x" 1 "00:00:00"
@MODEL "z" 1.1 "00:00:00"
@MODEL "y" "abc" "00:00:00"`);
  });

  it('should return multiple sequence with models', async () => {
    const satf = `
      $$EOH
      ABSOLUTE_SEQUENCE(test,\\testv01\\,
          STEPS,
          command (
            3472, SCHEDULED_TIME, \\00:01:00\\, FROM_ACTIVITY_START, INCLUSION_CONDITION, \\param_rate == receive_rate\\,
            DRAW, \\VERTICAL\\,
            COMMENT, \\This command turns, to correct position.\\, ASSUMED_MODEL_VALUES, \\x=1,z=1.1,y="abc"\\,
            01VV (param6, 10, false, "abc"),
            PROCESSORS, "PRI", end),
          end
        ),
      RT_on_board_block(test2,\\testv02\\,
          STEPS,
          command (
            3472, SCHEDULED_TIME, \\00:01:00\\, FROM_ACTIVITY_START, INCLUSION_CONDITION, \\param_rate == receive_rate\\,
            DRAW, \\VERTICAL\\,
            COMMENT, \\This command turns, to correct position.\\, ASSUMED_MODEL_VALUES, \\x=1,z=1.1,y="abc"\\,
            01VV (param6, 10, false, "abc"),
            PROCESSORS, "PRI", end),
          end
        )
      $$EOF
    `;
    const result = await satfToSequence(satf);
    expect(result).toHaveProperty('sequences');
    expect(result.sequences.length).toBe(2);
    expect(result.sequences[0].name).toStrictEqual('test');
    expect(result.sequences[0].sequence).toStrictEqual(`## test
B00:01:00  01VV param6 10 false "abc" # This command turns, to correct position.
@MODEL "x" 1 "00:00:00"
@MODEL "z" 1.1 "00:00:00"
@MODEL "y" "abc" "00:00:00"`);
  });
});

describe('sasfToSequence', () => {
  it('should return empty header and sequences for empty SATF string', async () => {
    const sasf = '';
    const result = await satfToSequence(sasf);
    expect(result).toEqual({ header: '', sequences: [] });
  });

  it('should return empty invalid SATF string', async () => {
    const sasf = ' invalid satf string ';

    const result = await satfToSequence(sasf);
    expect(result).toEqual({ header: '', sequences: [] });
  });

  it('should parse valid SASF string with header and sequences', async () => {
    const sasf = `
      $$EOH
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
      $$EOD
      $$EOF
    `;
    const result = await satfToSequence(sasf);
    expect(result).toHaveProperty('header');
    expect(result).toHaveProperty('sequences');
    expect(result.sequences).toBeInstanceOf(Array);
  });

  it('should return valid request with models', async () => {
    const sasf = `
      $$EOH
      $$EOD
      request(VFT2_REQUEST_01,
        START_TIME, 2024-266T19:59:57,
        REQUESTOR, "me",
        PROCESSOR, "VC2AB",
        KEY, "No_Key")

        command(1,
          SCHEDULED_TIME,\\00:00:01\\,FROM_PREVIOUS_START,
          COMMENT,\\"this is a comment"\\,
          FILE_REMOVE("/eng/seq/awesome.abs")
        ),
        command(2,
          SCHEDULED_TIME,\\00:00:01\\,FROM_PREVIOUS_START,
          COMMENT,\\"cumulative_time is 2 sec"\\,
          USER_SEQ_ECHO("SEQ awesome COMPLETION IN 2 MINS")
        ),
        end;
      $$EOF
    `;
    const result = await satfToSequence(sasf);
    expect(result).toHaveProperty('sequences');
    expect(result.sequences[0].name).toStrictEqual('VFT2_REQUEST_01');
    expect(result.sequences[0].sequence).toStrictEqual(`R2024-266T19:59:57 @REQUEST_BEGIN("VFT2_REQUEST_01")
  R00:00:01  FILE_REMOVE "/eng/seq/awesome.abs" # "this is a comment"
  R00:00:01  USER_SEQ_ECHO "SEQ awesome COMPLETION IN 2 MINS" # "cumulative_time is 2 sec"
@REQUEST_END
@METADATA("REQUESTOR":"me")
@METADATA("PROCESSOR":"VC2AB")
@METADATA("KEY":"No_Key")
`);
  });

  it('Parameters', async () => {
    const satf = `
      $$EOH
      RT_on_board_block(/start.txt,\\start\\,
        PARAMETERS,
        unsigned_decimal(
          TYPE,UNSIGNED_DECIMAL,
          RANGE,\\10.01...99.99\\,
          RANGE,\\100...199.99\\,
        ),
        signed_decimal(
          TYPE,SIGNED_DECIMAL,
          DEFAULT, 10
          RANGE,\\10, 90000, 120000, 150000, 360001\\,
          HELP, \\This is a help\\
        ),
        hex(
          TYPE,HEXADECIMAL,
          RANGE,\\0x00...0xff\\
        ),
        octal(
          TYPE,OCTAL,
          DEFAULT, 10
          RANGE,\\0, 1, 2, 3, 4, 5, 6, 7\\
        ),
        binary(
          TYPE,BINARY,
          RANGE,\\0, 1\\),
        engine(
          TYPE,ENGINEERING,
        ),
        time(
          TYPE,TIME,
          RANGE,\\0T00:00:00...100T00:00:00\\
        ),
        duration(
          TYPE,DURATION,
          DEFAULT, \\00:01:00\\
        ),
        enum(
          TYPE,STRING,
          ENUM_NAME,\\STORE_NAME\\,
          DEFAULT, \\BOB_HARDWARE\\,
          RANGE,\\BOB_HARDWARE, SALLY_FARM, "TIM_FLOWERS"\\
        ),
        string(
          TYPE,STRING,
          DEFAULT, abc
        ),
        quoted_string(
          TYPE,QUOTED_STRING,
          DEFAULT, "abc"
          RANGES,\\"abc", "123"\\
        ),
        end,
        STEPS,
          command (
            1, SCHEDULED_TIME, \\00:01:00\\, FROM_ACTIVITY_START,
            NOOP()
          end
        )
      $$EOF
    `;
    const result = await satfToSequence(satf);
    expect(result).toHaveProperty('sequences');
    expect(result.sequences[0].name).toStrictEqual('start.txt');
    expect(result.sequences[0].sequence).toStrictEqual(`## /start.txt
@INPUT_PARAMS_BEGIN
unsigned_decimal UINT "10.01...99.99, 100...199.99"
signed_decimal INT "" "10, 90000, 120000, 150000, 360001"
hex STRING "0x00...0xff"
octal STRING "" "0, 1, 2, 3, 4, 5, 6, 7"
binary STRING "" "0, 1"
engine FLOAT
time STRING "0T00:00:00...100T00:00:00"
duration STRING
enum ENUM STORE_NAME "" "BOB_HARDWARE, SALLY_FARM, TIM_FLOWERS"
string STRING
quoted_string STRING "" "abc, 123"
@INPUT_PARAMS_END

B00:01:00  NOOP`);
  });

  it('Quoted Parameters', async () => {
    const satf = `
      $$EOH
      RT_on_board_block(/start.txt,\\start\\,
        PARAMETERS,
        attitude_spec(
          TYPE,STRING,
          ENUM_NAME,\\STORE_NAME\\,
          RANGE,\\"BOB_HARDWARE", "SALLY_FARM", "TIM_FLOWERS"\\
        ),
        end,
        STEPS,
          command (
            1, SCHEDULED_TIME, \\00:01:00\\, FROM_ACTIVITY_START, INCLUSION_CONDITION, \\param_rate == receive_rate\\,
            ECHO ("abc")
          end
        )
      $$EOF
    `;
    const result = await satfToSequence(satf);
    expect(result).toHaveProperty('sequences');
    expect(result.sequences[0].name).toStrictEqual('start.txt');
    expect(result.sequences[0].sequence).toStrictEqual(`## /start.txt
@INPUT_PARAMS_BEGIN
attitude_spec ENUM STORE_NAME "" "BOB_HARDWARE, SALLY_FARM, TIM_FLOWERS"
@INPUT_PARAMS_END

B00:01:00  ECHO "abc"`);
  });
});
