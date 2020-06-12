CREATE TABLE IF NOT EXISTS people
    (id varchar(64) NOT NULL,
    first_name varchar(64),
    last_name varchar(64),
    age smallint,
    phone varchar(32),
    primary key (id));