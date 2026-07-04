const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/components/bed-dashboard.tsx',
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace rounded variations with rounded-md
  content = content.replace(/rounded-2xl/g, 'rounded-md');
  content = content.replace(/rounded-xl/g, 'rounded-md');
  content = content.replace(/rounded-lg/g, 'rounded-md');
  content = content.replace(/rounded-full/g, 'rounded-md');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
