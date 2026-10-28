create table learning_questions (
 id varchar(40) primary key,
 prompt text not null check(length(trim(prompt)) > 0),
 answer text not null check(length(trim(answer)) > 0),
 position integer not null unique check(position >= 0),
 active boolean not null default true
);
insert into learning_questions(id,prompt,answer,position) values
 ('greeting','初対面の相手に、自分の名前を英語で伝えましょう。','My name is ...',0),
 ('past','『昨日、公園を歩きました』を英語にしましょう。','I walked in the park yesterday.',1),
 ('request','『もう一度言ってもらえますか』を英語で尋ねましょう。','Could you say that again?',2);
alter table learning_questions enable row level security;
revoke all on learning_questions from anon,authenticated;
alter table learning_entries add column question_id varchar(40) references learning_questions(id) on delete restrict;
alter table learning_entries add column reference_answer text;
-- Link only unambiguous known prompts. Historical reference answers remain unknown.
update learning_entries e set question_id=q.id from learning_questions q
 where e.kind='QUIZ' and e.question=q.prompt
 and (select count(*) from learning_questions x where x.prompt=e.question)=1;
alter table learning_entries add constraint learning_input_valid check(length(trim(input)) > 0 and length(input) <= 1000);
alter table learning_entries add constraint learning_feedback_nonblank check(length(trim(feedback)) > 0);
alter table learning_entries add constraint learning_fingerprint_format check(fingerprint ~ '^[0-9a-f]{64}$');
alter table learning_entries add constraint learning_quiz_reference check((question_id is null and reference_answer is null) or kind='QUIZ');
alter table learning_entries add constraint learning_reference_nonblank check(reference_answer is null or length(trim(reference_answer))>0);
