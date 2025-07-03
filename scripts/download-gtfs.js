// Node.js script to download and unzip TransLink GTFS static data
const GTFS_URL = 'https://gtfs-static.translink.ca/gtfs/google_transit.zip';
const fs = require('fs');
const https = require('https');
const path = require('path');
const AdmZip = require('adm-zip');

const destZipPath = path.join(__dirname, '../data/google_transit.zip');
const destUnzipDir = path.join(__dirname, '../data/google_transit/');

function downloadGTFS() {
  const file = fs.createWriteStream(destZipPath);
  https.get(GTFS_URL, (response) => {
    if (response.statusCode !== 200) {
      console.error('Failed to download GTFS:', response.statusCode);
      return;
    }
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('GTFS downloaded to', destZipPath);
      // 解压缩
      try {
        if (!fs.existsSync(destUnzipDir)) {
          fs.mkdirSync(destUnzipDir, { recursive: true });
        }
        const zip = new AdmZip(destZipPath);
        zip.extractAllTo(destUnzipDir, true);
        console.log('GTFS unzipped to', destUnzipDir);
      } catch (e) {
        console.error('Unzip error:', e);
      }
    });
  }).on('error', (err) => {
    fs.unlink(destZipPath, () => {});
    console.error('Download error:', err.message);
  });
}

downloadGTFS();
