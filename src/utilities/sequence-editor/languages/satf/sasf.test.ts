import { testTree } from '@lezer/generator/test';
import { describe, expect, test } from 'vitest';
import { SatfLanguage } from './satf';

const tests = [
  [
    'Empty SASF',
    `
      $$EOH
      $$EOD
      $$EOF
  `,
    `satf_sasf(Sasf(
        Header,
        Body
  ))`,
  ],
  [
    'Sample SASF',
    `
    $$EOH
    $$EOD
        request(VFT2_REQUEST_01,
        START_TIME, 2024-266T19:59:57,
        REQUESTOR, "vft2_anichola",
        PROCESSOR, "VC2AB",
        KEY, "No_Key")

      command(1,
        SCHEDULED_TIME,\\00:00:01\\,FROM_PREVIOUS_START,
        COMMENT,\\"VFT2_short_name  : sada_pause_test_main_seq",
                "VFT2_full_name   : psy.abs.vc2ab.sada_pause_test_main_seq.r02",
                "VFT2_onboard_name: sada_pause_test_main_seq",
                "VFT2_product_type: load_and_go_abs",
                "VFT2_pce         : AB",
                "VFT2_vc          : 2",
                "cumulative_time is     1 sec (2024-266T19:59:58)"\\,
        FILE_REMOVE("/eng/seq/sada_pause_test_main_seq.abs")
      )
      end
      $$EOF`,
    `satf_sasf(Sasf(Header,
      Body(
      Requests(
        Request(RequestName,Time,Requestor,Processor,Key,
        Steps(Command(StepLabel,ScheduledTime(Time,TimeRelation),
        Comment,Stem,Args(String))))))))`,
  ],
  [
    'Mulitple Requests',
    `
    $$EOH
    $$EOD
        request(VFT2_REQUEST_01,
        START_TIME, 2024-266T19:59:57,
        REQUESTOR, "vft2_anichola",
        PROCESSOR, "VC2AB",
        KEY, "No_Key")

      command(1,
        SCHEDULED_TIME,\\00:00:01\\,FROM_PREVIOUS_START,
        COMMENT,\\"VFT2_short_name  : sada_pause_test_main_seq",
                "VFT2_full_name   : psy.abs.vc2ab.sada_pause_test_main_seq.r02",
                "VFT2_onboard_name: sada_pause_test_main_seq",
                "VFT2_product_type: load_and_go_abs",
                "VFT2_pce         : AB",
                "VFT2_vc          : 2",
                "cumulative_time is     1 sec (2024-266T19:59:58)"\\,
        FILE_REMOVE("/eng/seq/sada_pause_test_main_seq.abs")
      )
      end,
      request(VFT2_REQUEST_02,
        START_TIME, 2024-266T19:59:57,
        REQUESTOR, "vft2_anichola",
        PROCESSOR, "VC2AB",
        KEY, "No_Key")

      command(1,
        SCHEDULED_TIME,\\00:00:01\\,FROM_PREVIOUS_START,
        FILE_REMOVE("/test.abs")
      )
      end
      $$EOF`,
    `satf_sasf(Sasf(Header,Body(
      Requests(
        Request(RequestName,Time,Requestor,Processor,Key,
          Steps(Command(StepLabel,ScheduledTime(Time,TimeRelation),Comment,Stem,Args(String)))),
        Request(RequestName,Time,Requestor,Processor,Key,
          Steps(Command(StepLabel,ScheduledTime(Time,TimeRelation),Stem,Args(String))))
      )
    )))`,
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
