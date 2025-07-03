// 用 node-cron 每天凌晨 2 点自动下载 GTFS
const cron = require('node-cron');
const { exec } = require('child_process');

cron.schedule('0 2 * * *', () => {
  console.log('[GTFS] Scheduled download started at', new Date().toISOString());
  exec('node scripts/download-gtfs.js', (err, stdout, stderr) => {
    if (err) {
      console.error('[GTFS] Download error:', err);
      return;
    }
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  });
});

console.log('[GTFS] Scheduler running. GTFS will be downloaded every day at 2:00 AM.');
