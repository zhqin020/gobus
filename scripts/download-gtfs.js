const GTFS_URL = 'https://gtfs-static.translink.ca/gtfs/google_transit.zip';
const fs = require('fs');
const https = require('https');
const path = require('path');
const AdmZip = require('adm-zip');
const { exec } = require('child_process');

const destZipPath = path.join(__dirname, '../data/google_transit.zip');
const destUnzipDir = path.join(__dirname, '../data/google_transit/');
const versionFilePath = path.join(__dirname, '../data/gtfs_version.json');
const LOCK_FILE = path.join(__dirname, '../data/import.lock');

function getRemoteHeaders(url) {
  return new Promise((resolve, reject) => {
    https.request(url, { method: 'HEAD' }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HEAD request failed with status ${res.statusCode}`));
      } else {
        resolve(res.headers);
      }
    }).on('error', reject).end();
  });
}

function downloadGTFS() {
  if (fs.existsSync(LOCK_FILE)) {
    console.log('[GTFS Download] Download or import already in progress. Exiting.');
    return;
  }
  try {
    fs.writeFileSync(LOCK_FILE, 'lock', { flag: 'wx' });
  } catch (err) {
    console.log('[GTFS Download] Could not create lock file, another process may be running. Exiting.');
    return;
  }

  getRemoteHeaders(GTFS_URL).then((headers) => {
    let remoteEtag = headers.etag || '';
    // Fallback to Last-Modified header if ETag is missing
    if (!remoteEtag) {
      remoteEtag = headers['last-modified'] || '';
    }
    let localVersion = {};
    if (fs.existsSync(versionFilePath)) {
      try {
        localVersion = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'));
      } catch (e) {
        console.warn('Failed to parse local version file, will download GTFS');
      }
    }

    const gtfsDir = path.join(__dirname, '../data/google_transit');
    const gtfsFilesExist = fs.existsSync(gtfsDir) && fs.readdirSync(gtfsDir).some(f => f.endsWith('.txt'));

    if (localVersion.etag === remoteEtag && remoteEtag !== '' && gtfsFilesExist) {
      console.log('GTFS data is up to date, no download needed.');
      try {
        fs.unlinkSync(LOCK_FILE);
      } catch (e) {
        console.warn('[GTFS Download] Failed to remove lock file:', e);
      }
      return;
    }

    console.log(`Downloading GTFS data, remote version: ${remoteEtag}`);

    const file = fs.createWriteStream(destZipPath);
    https.get(GTFS_URL, (response) => {
      if (response.statusCode !== 200) {
        console.error('Failed to download GTFS:', response.statusCode);
        try {
          fs.unlinkSync(LOCK_FILE);
        } catch (e) {
          console.warn('[GTFS Download] Failed to remove lock file:', e);
        }
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('GTFS downloaded to', destZipPath);
        // Save version info
        fs.writeFileSync(versionFilePath, JSON.stringify({ etag: remoteEtag, downloadedAt: new Date().toISOString() }, null, 2));
        // Unzip
        try {
          if (!fs.existsSync(destUnzipDir)) {
            fs.mkdirSync(destUnzipDir, { recursive: true });
          }
          const zip = new AdmZip(destZipPath);
          zip.extractAllTo(destUnzipDir, true);
          console.log('GTFS unzipped to', destUnzipDir);
          // Run import script after unzip
          exec('node scripts/import-gtfs-sqlite.js', (error, stdout, stderr) => {
            if (error) {
              console.error(`Import script error: ${error.message}`);
              try {
                fs.unlinkSync(LOCK_FILE);
              } catch (e) {
                console.warn('[GTFS Download] Failed to remove lock file:', e);
              }
              return;
            }
            if (stderr) {
              console.error(`Import script stderr: ${stderr}`);
              try {
                fs.unlinkSync(LOCK_FILE);
              } catch (e) {
                console.warn('[GTFS Download] Failed to remove lock file:', e);
              }
              return;
            }
            console.log(`Import script output:\n${stdout}`);
            try {
              fs.unlinkSync(LOCK_FILE);
            } catch (e) {
              console.warn('[GTFS Download] Failed to remove lock file:', e);
            }
          });
        } catch (e) {
          console.error('Unzip error:', e);
          try {
            fs.unlinkSync(LOCK_FILE);
          } catch (e) {
            console.warn('[GTFS Download] Failed to remove lock file:', e);
          }
        }
      });
    }).on('error', (err) => {
      fs.unlink(destZipPath, () => {});
      console.error('Download error:', err.message);
      try {
        fs.unlinkSync(LOCK_FILE);
      } catch (e) {
        console.warn('[GTFS Download] Failed to remove lock file:', e);
      }
    });
  }).catch((err) => {
    console.error('Failed to get remote headers:', err.message);
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch (e) {
      console.warn('[GTFS Download] Failed to remove lock file:', e);
    }
  });
}

downloadGTFS();
