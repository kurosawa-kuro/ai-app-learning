CREATE TABLE evaluation_members(id uuid PRIMARY KEY,name varchar(80) NOT NULL CHECK(length(trim(name))>0),active boolean NOT NULL DEFAULT true,version bigint NOT NULL DEFAULT 0);
CREATE TABLE evaluation_records(id uuid PRIMARY KEY,member_id uuid NOT NULL REFERENCES evaluation_members(id),business_date date NOT NULL,drinks bigint NOT NULL CHECK(drinks BETWEEN 0 AND 1000000),bottles bigint NOT NULL CHECK(bottles BETWEEN 0 AND 1000000),nominations bigint NOT NULL CHECK(nominations BETWEEN 0 AND 1000000),accompaniments bigint NOT NULL CHECK(accompaniments BETWEEN 0 AND 1000000),sales bigint NOT NULL CHECK(sales BETWEEN 0 AND 1000000000),version bigint NOT NULL DEFAULT 0,UNIQUE(member_id,business_date));
CREATE INDEX evaluation_records_month ON evaluation_records(business_date,member_id);
CREATE TABLE evaluation_rules(category varchar(20) PRIMARY KEY CHECK(category IN ('DRINK','BOTTLE','NOMINATION','ACCOMPANIMENT','SALES')),unit numeric NOT NULL CHECK(unit>0),points numeric NOT NULL CHECK(points>=0),enabled boolean NOT NULL,version bigint NOT NULL DEFAULT 0);
INSERT INTO evaluation_rules VALUES ('DRINK',1,1,true,0),('BOTTLE',1,5,true,0),('NOMINATION',1,3,true,0),('ACCOMPANIMENT',1,5,true,0),('SALES',1000,1,false,0);
ALTER TABLE evaluation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON evaluation_members,evaluation_records,evaluation_rules FROM anon,authenticated;
