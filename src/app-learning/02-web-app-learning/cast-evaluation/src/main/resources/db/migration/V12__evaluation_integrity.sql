-- Keep unconstrained numeric so invalid precision is rejected, not rounded on assignment.
alter table evaluation_rules add constraint evaluation_unit_range check(unit <= 1000000000 and scale(unit) <= 2);
alter table evaluation_rules add constraint evaluation_points_range check(points <= 1000000 and scale(points) <= 2);
alter table evaluation_rules add constraint evaluation_rule_version check(version >= 0);
alter table evaluation_members add constraint evaluation_member_version check(version >= 0);
alter table evaluation_records add constraint evaluation_record_version check(version >= 0);
