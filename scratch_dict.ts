import hosxpDb from './src/lib/db/hosxp';

async function checkTables() {
  try {
    const [tables] = await hosxpDb.query("SHOW TABLES LIKE '%operation%'");
    console.log("Operation tables:", tables);
    
    const [laborTables] = await hosxpDb.query("SHOW TABLES LIKE '%labor%'");
    console.log("Labor tables:", laborTables);
    
    const [labourTables] = await hosxpDb.query("SHOW TABLES LIKE '%labour%'");
    console.log("Labour tables:", labourTables);

    const [personTables] = await hosxpDb.query("SHOW TABLES LIKE 'person_anc%'");
    console.log("Person tables:", personTables);
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkTables();
