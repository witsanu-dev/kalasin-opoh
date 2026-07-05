import fs from 'fs';
import path from 'path';

export function getSqlQuery(scriptName: string): string {
  try {
    // Determine the root directory of the project
    const rootDir = process.cwd();
    const filePath = path.join(rootDir, 'sql_scripts', `${scriptName}.sql`);
    
    // Read the file synchronously (since it's small and cached by OS)
    const sql = fs.readFileSync(filePath, 'utf8');
    return sql;
  } catch (error) {
    console.error(`Error reading SQL script ${scriptName}:`, error);
    throw new Error(`Could not find or read the SQL script: ${scriptName}.sql`);
  }
}

export function updateSqlQuery(scriptName: string, sql: string): boolean {
  try {
    const rootDir = process.cwd();
    const filePath = path.join(rootDir, 'sql_scripts', `${scriptName}.sql`);
    
    fs.writeFileSync(filePath, sql, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing SQL script ${scriptName}:`, error);
    throw new Error(`Could not write the SQL script: ${scriptName}.sql`);
  }
}
