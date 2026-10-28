alter table janken_rounds add constraint janken_round_character check(character in ('hinoko','shizuku','konoha'));
alter table janken_rounds add constraint janken_round_line_nonblank check(length(trim(line)) > 0);
