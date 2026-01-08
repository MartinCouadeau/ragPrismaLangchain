import { PrismaClient } from "../../generated/prisma/client";
import { getFullDatabaseSchema } from "./dataBaseSchema";
import { serializeForJSON } from "./serializeJson";

export type TableColumn = { name: string; type: string };
export type TableSchema = { name: string; columns: TableColumn[] };

export interface GeneratedSQL {
  sql: string;
  explanation: string;
  parameters: any[];
  entityTypes: string[];
}

export function generateSchemaFallbackSQL(userQuestion: string): GeneratedSQL {
  const schema = getFullDatabaseSchema();
  const normalizedQuestion = (userQuestion || "").trim() || "search";
  const tokens = extractTokens(normalizedQuestion);
  const searchTerms = (tokens.length ? tokens.slice(0, 4) : [normalizedQuestion]).map((term) => `%${term.slice(0, 40)}%`);
  const candidateTables = scoreTablesByQuestion(schema?.tables || [], tokens);

  const parameters: any[] = [];
  const unions: string[] = [];

  for (const table of candidateTables) {
    const textColumns = getTextColumns(table.columns || []);
    if (!textColumns.length) continue;

    const predicates: string[] = [];
    for (const col of textColumns) {
      for (const term of searchTerms) {
        const placeholder = `$${parameters.length + 1}`;
        parameters.push(term);
        predicates.push(`"${table.name}"."${col.name}"::text ILIKE ${placeholder}`);
      }
    }

    if (!predicates.length) continue;

    const whereClause = predicates.join(" OR ");
    const titleExpr = pickTitleExpression(table.name, table.columns || []);
    const descriptionExpr = pickDescriptionExpression(table.name, table.columns || []);
    const dateExpr = pickDateExpression(table.name, table.columns || []);

    unions.push(`
      SELECT 
        '${table.name.toLowerCase()}' AS entity_type,
        "${table.name}"."id"::text AS entity_id,
        ${titleExpr} AS title,
        ${descriptionExpr} AS description,
        ${dateExpr} AS created_at
      FROM "${table.name}"
      WHERE ${whereClause}
    `);
  }

  if (!unions.length) {
    return {
      sql: `SELECT id, "firstName", "lastName", email FROM "User" WHERE "firstName" ILIKE $1 OR "lastName" ILIKE $1 OR email ILIKE $1 LIMIT 25`,
      explanation: `Basic user keyword search for "${normalizedQuestion}"`,
      parameters: [`%${tokens[0] || normalizedQuestion.slice(0, 40)}%`],
      entityTypes: ["user"],
    };
  }

  const sql = `
    SELECT * FROM (
      ${unions.join("\n      UNION ALL\n")}
    ) AS schema_search
    ORDER BY created_at DESC NULLS LAST
    LIMIT 50
  `;

  return {
    sql,
    explanation: `Schema-aware keyword search for "${normalizedQuestion}"`,
    parameters,
    entityTypes: candidateTables.map((t) => t.name.toLowerCase()),
  };
}

export async function executeFallbackSearch(prisma: PrismaClient, question: string) {
  const fallbackQuery = generateSchemaFallbackSQL(question);

  try {
    const rawResults =
      fallbackQuery.parameters.length > 0
        ? await prisma.$queryRawUnsafe(fallbackQuery.sql, ...fallbackQuery.parameters)
        : await prisma.$queryRawUnsafe(fallbackQuery.sql);

    return {
      ...fallbackQuery,
      results: serializeForJSON(rawResults),
    };
  } catch (error) {
    console.error("Fallback search error:", error);
    return {
      ...fallbackQuery,
      results: [],
    };
  }
}

function scoreTablesByQuestion(tables: TableSchema[], tokens: string[]): TableSchema[] {
  const prioritized = ["User", "Project", "Task", "Expense"];
  const scored = tables
    .map((table) => {
      const tableName = table.name.toLowerCase();
      let score = tokens.includes(tableName) ? 3 : 0;

      for (const column of table.columns || []) {
        if (tokens.includes(column.name.toLowerCase())) score += 1;
      }
      if (prioritized.includes(table.name)) score += 0.5;

      return { table, score };
    })
    .filter((entry) => entry.table && entry.table.columns);

  const sorted = scored.sort((a, b) => b.score - a.score);
  const selected = sorted.length
    ? sorted.slice(0, 6).map((entry) => entry.table)
    : tables.filter((t) => prioritized.includes(t.name)).slice(0, 4);
  return selected;
}

function pickTitleExpression(tableName: string, columns: TableColumn[]): string {
  if (hasColumn(columns, "firstName") && hasColumn(columns, "lastName")) {
    return `COALESCE(
      TRIM(COALESCE("${tableName}"."firstName", '') || ' ' || COALESCE("${tableName}"."lastName", '')),
      "${tableName}"."firstName"::text,
      "${tableName}"."lastName"::text,
      '${tableName}'
    )`;
  }

  const titleColumn = pickColumn(columns, ["name", "title", "email", "subject"]);
  if (titleColumn) return `COALESCE("${tableName}"."${titleColumn}"::text, '${tableName}')`;

  return `'${tableName}'`;
}

function pickDescriptionExpression(tableName: string, columns: TableColumn[]): string {
  const descColumn = pickColumn(columns, ["description", "message", "summary", "notes", "content", "status", "role"]);
  if (descColumn) return `COALESCE("${tableName}"."${descColumn}"::text, '')`;
  if (hasColumn(columns, "email")) return `COALESCE("${tableName}"."email"::text, '')`;
  return `''`;
}

function pickDateExpression(tableName: string, columns: TableColumn[]): string {
  const dateColumn = pickColumn(columns, ["createdAt", "updatedAt", "dueDate", "startDate", "endDate"]);
  if (dateColumn) return `"${tableName}"."${dateColumn}"`;
  return "NOW()";
}

function pickColumn(columns: TableColumn[], candidates: string[]): string | undefined {
  return candidates.find((candidate) => hasColumn(columns, candidate));
}

function getTextColumns(columns: TableColumn[]): TableColumn[] {
  return (columns || []).filter((col) => ["string", "enum", "json"].includes(col.type));
}

function hasColumn(columns: TableColumn[], name: string): boolean {
  return (columns || []).some((col) => col.name === name);
}

function extractTokens(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9_]+/).filter((token) => token.length > 2);
}
