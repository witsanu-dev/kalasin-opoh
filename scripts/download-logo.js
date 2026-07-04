const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://bdh.moph.go.th/site/wp-content/uploads/2022/12/cropped-logo-MOPH.png';
const publicDest = path.join(process.cwd(), 'public', 'logo.png');
const appDest = path.join(process.cwd(), 'src', 'app', 'icon.png');

https.get(url, (res) => {
  const file1 = fs.createWriteStream(publicDest);
  res.pipe(file1);
  file1.on('finish', () => {
    file1.close(() => {
      fs.copyFileSync(publicDest, appDest);
      console.log('Downloaded logo successfully!');
    });
  });
}).on('error', (err) => {
  console.error('Error downloading:', err.message);
});
