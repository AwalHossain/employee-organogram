import { MigrationInterface, QueryRunner } from "typeorm";

export class AddManagerIdIndex1715000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_EMPLOYEE_MANAGER_ID" ON "employees" ("manager_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_EMPLOYEE_MANAGER_ID"`);
    }
} 