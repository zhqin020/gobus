// ES模块语法的缓存清除脚本
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 为ES模块获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 清除厕所数据缓存的函数
async function clearRestroomCache() {
  try {
    console.log('开始清除厕所数据缓存...');
    
    // 1. 清除文件系统缓存 (服务器端)
    const cacheDir = path.join(__dirname, 'data', 'cache');
    if (fs.existsSync(cacheDir)) {
      const cacheFiles = fs.readdirSync(cacheDir);
      let deletedCount = 0;
      
      cacheFiles.forEach(file => {
        if (file.startsWith('restrooms_')) {
          const filePath = path.join(cacheDir, file);
          try {
            fs.unlinkSync(filePath);
            console.log(`已删除文件缓存: ${file}`);
            deletedCount++;
          } catch (error) {
            console.error(`删除文件缓存时出错: ${file}`, error);
          }
        }
      });
      
      console.log(`共删除 ${deletedCount} 个文件缓存`);
    } else {
      console.log('文件缓存目录不存在');
    }

    // 2. 更新版本信息文件，强制刷新数据
    const versionFilePath = path.join(__dirname, 'data', 'version.json');
    if (fs.existsSync(versionFilePath)) {
      let versionInfo = {};
      try {
        versionInfo = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'));
      } catch (error) {
        console.error('读取版本信息文件时出错:', error);
        versionInfo = {};
      }
      
      // 将厕所数据版本设置为很久以前的值，强制刷新
      versionInfo.restroomVersion = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7天前
      
      try {
        fs.writeFileSync(versionFilePath, JSON.stringify(versionInfo, null, 2));
        console.log('已更新版本信息，强制刷新厕所数据');
      } catch (error) {
        console.error('写入版本信息文件时出错:', error);
      }
    } else {
      console.log('版本信息文件不存在');
    }

    console.log('\n服务器端缓存清除完成');
    console.log('\n浏览器端缓存清除指南:');
    console.log('在浏览器中，您需要清除localStorage中与厕所相关的缓存数据：');
    console.log('1. 打开开发者工具 (通常是按 F12 或 Ctrl+Shift+I)');
    console.log('2. 切换到 "Console" 标签');
    console.log('3. 复制并粘贴以下代码，然后按 Enter 键：');
    console.log('   const keysToDelete = [];');
    console.log('   for (let i = 0; i < localStorage.length; i++) {');
    console.log('     const key = localStorage.key(i);');
    console.log('     if (key && key.startsWith(\'restroomsCache\')) {');
    console.log('       keysToDelete.push(key);');
    console.log('     }');
    console.log('   }');
    console.log('   keysToDelete.forEach(key => {');
    console.log('     console.log(`删除缓存键: ${key}`);');
    console.log('     localStorage.removeItem(key);');
    console.log('   });');
    console.log('   console.log(`已清除 ${keysToDelete.length} 个厕所缓存条目`);');
    console.log('4. 刷新页面以加载新数据');
    
  } catch (error) {
    console.error('清除缓存时出错:', error);
  }
}

// 执行缓存清除
clearRestroomCache();