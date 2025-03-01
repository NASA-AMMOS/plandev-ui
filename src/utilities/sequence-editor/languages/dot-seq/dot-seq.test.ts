import { describe, it } from 'vitest';
import { SeqDotTextLanguage as DotSeqLanguage } from './dot-seq';

describe('complete sequences', () => {
  it('sequence', () => {
    const input = `;filename=testseq
;gap=00:00:05
;on_board_filename=defaultSeq
;on_board_path=D:/seq
;upload_type=sequence
;seqgen_start_time=S$BEGIN
CMD_NO_OP ; this command does nothing
CMD2 1,”ab” ; executes 5 sec after the previous command
R00:00:01 CMDA TRUE ; executes 1 sec from the previous command
CMDB ; executes 5 sec from previous command
;gap=00:00:00 changing time between commands to 0 sec
CMDC ; executes 0 sec from previous command
A2013-156T12:00:00 CMDD ; executes at the specified absolute time
CMDE ; executes at the same time as the previous command`;
    DotSeqLanguage.parser.parse(input);
  });

  it('load and go', () => {
    const input = `;filename=testseq2
;on_board_filename=defaultSeq
;on_board_path=D:/seq
;upload_type=load_and_go
;seqgen_start_time=S$BEGIN
CMD_NO_OP ; this command does nothing
CMD2 1,”ab” ; executes 0 sec after the previous command
;gap=00:00:03
CMD3 ; executes 3 sec from previous command
CMD4 ; executes 3 sec from previous command`;
    DotSeqLanguage.parser.parse(input);
  });

  it('flight like', () => {
    const input = `;on_board_filename=test.seq
;on_board_path=/seq/
;upload_type=sequence

;# Notify start of sequence
R00:00:01 CMD_ECHO "seq starts now"

;# Override for next restricted command
R00:00:01 CMD_OVERRIDE

;# Specify motor direction
R00:00:01 MOTOR_DIRECTION "DEPLOY"

;# Override for next restricted command
R00:00:01 CMD_OVERRIDE

;# Drive motor5
R00:00:01 MOTOR_SELECT "MOTOR5",10

;# Override for next restricted command
R00:00:11 CMD_OVERRIDE

;# Disable all motors
R00:00:01 MOTOR_SELECT "DISABLE",1

;# Override for next restricted command
R00:00:01 CMD_OVERRIDE

;# Disable power
R00:00:01 MOTOR_POWER "DISABLE"

;# Notify end of sequence
R00:00:01 CMD_ECHO "test.seq has ended" `;
    DotSeqLanguage.parser.parse(input);
  });
});
