-- AlterTable
CREATE SEQUENCE brand_qa_id_seq;
ALTER TABLE "Brand_QA" ALTER COLUMN "id" SET DEFAULT nextval('brand_qa_id_seq');
ALTER SEQUENCE brand_qa_id_seq OWNED BY "Brand_QA"."id";
