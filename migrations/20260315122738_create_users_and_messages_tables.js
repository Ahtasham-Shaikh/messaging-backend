/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable("users", (table) => {
      table.increments("id").primary();
      table.string("username", 50).unique().notNullable();
      table.string("password", 255).notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
    })
    .createTable("messages", (table) => {
      table.increments("id").primary();
      table.integer("sender_id").unsigned().notNullable();
      table.integer("receiver_id").unsigned().notNullable();
      table.text("content").notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());

      table.foreign("sender_id").references("id").inTable("users");
      table.foreign("receiver_id").references("id").inTable("users");
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists("messages").dropTableIfExists("users");
};
