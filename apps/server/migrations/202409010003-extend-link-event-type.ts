import type { QueryInterface } from 'sequelize'

const ENUM_NAME = 'enum_link_events_event_type'

const run = async (context: QueryInterface, sql: string) => {
  if (!context.sequelize) return
  await context.sequelize.query(sql)
}

const DIALECT_PG = 'postgres'
const DIALECT_MYSQL = 'mysql'

export const up = async ({ context }: { context: QueryInterface }) => {
  const dialect = context.sequelize?.getDialect?.()

  if (dialect === DIALECT_MYSQL) {
    await run(
      context,
      "ALTER TABLE `link_events` MODIFY COLUMN `event_type` ENUM('click','scan','direct','api','bot') NOT NULL"
    )
    return
  }

  if (dialect === DIALECT_PG) {
    await run(context, `ALTER TYPE "${ENUM_NAME}" ADD VALUE IF NOT EXISTS 'direct'`)
    await run(context, `ALTER TYPE "${ENUM_NAME}" ADD VALUE IF NOT EXISTS 'api'`)
    await run(context, `ALTER TYPE "${ENUM_NAME}" ADD VALUE IF NOT EXISTS 'bot'`)
    return
  }

  // Fallback for sqlite or others: recreate column definition via table alter if needed
  await run(
    context,
    "ALTER TABLE link_events ADD COLUMN __event_type_tmp TEXT"
  )
  await run(
    context,
    "UPDATE link_events SET __event_type_tmp = event_type"
  )
  await run(context, 'ALTER TABLE link_events DROP COLUMN event_type')
  await run(
    context,
    "ALTER TABLE link_events ADD COLUMN event_type TEXT NOT NULL DEFAULT 'click'"
  )
  await run(
    context,
    "UPDATE link_events SET event_type = __event_type_tmp"
  )
  await run(context, 'ALTER TABLE link_events DROP COLUMN __event_type_tmp')
}

export const down = async ({ context }: { context: QueryInterface }) => {
  const dialect = context.sequelize?.getDialect?.()

  if (dialect === DIALECT_MYSQL) {
    await run(
      context,
      "UPDATE `link_events` SET `event_type` = 'click' WHERE `event_type` IN ('direct','api','bot')"
    )
    await run(
      context,
      "ALTER TABLE `link_events` MODIFY COLUMN `event_type` ENUM('click','scan') NOT NULL"
    )
    return
  }

  if (dialect === DIALECT_PG) {
    await run(
      context,
      `UPDATE "link_events" SET "event_type" = 'click' WHERE "event_type" IN ('direct', 'api', 'bot')`
    )
    await run(context, `CREATE TYPE "${ENUM_NAME}_old" AS ENUM ('click', 'scan')`)
    await run(
      context,
      `ALTER TABLE "link_events" ALTER COLUMN "event_type" TYPE "${ENUM_NAME}_old" USING "event_type"::text::"${ENUM_NAME}_old"`
    )
    await run(context, `DROP TYPE "${ENUM_NAME}"`)
    await run(context, `ALTER TYPE "${ENUM_NAME}_old" RENAME TO "${ENUM_NAME}"`)
    return
  }

  await run(
    context,
    "UPDATE link_events SET event_type = 'click' WHERE event_type IN ('direct','api','bot')"
  )
  // No strict enum enforcement on fallback
}
