import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// 为ES模块获取__dirname和__filename的兼容方式
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 清除厕所数据缓存的函数
async function clearRestroomCache() {
  try {
    // 1. 清除文件系统缓存 (服务器端)
    const cacheDir = path.join(__dirname, 'data', 'cache');
    if (fs.existsSync(cacheDir)) {
      const cacheFiles = fs.readdirSync(cacheDir);
      cacheFiles.forEach(file => {
        if (file.startsWith('restrooms_')) {
          const filePath = path.join(cacheDir, file);
          fs.unlinkSync(filePath);
          console.log(`已删除文件缓存: ${file}`);
        }
      });
    } else {
      console.log('文件缓存目录不存在');
    }

    // 2. 更新版本信息文件，强制刷新数据
    const versionFilePath = path.join(__dirname, 'data', 'version.json');
    if (fs.existsSync(versionFilePath)) {
      let versionInfo = {};
      try {
        versionInfo = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'));
      } catch {
        versionInfo = {};
      }
      
      // 将厕所数据版本设置为很久以前的值，强制刷新
      versionInfo.restroomVersion = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7天前
      fs.writeFileSync(versionFilePath, JSON.stringify(versionInfo, null, 2));
      console.log('已更新版本信息，强制刷新厕所数据');
    }

    console.log('服务器端缓存清除完成');
    
    console.log('\n浏览器端缓存清除指南:');
    console.log('在浏览器中，您需要清除localStorage中与厕所相关的缓存数据：');
    console.log('1. 打开开发者工具 (通常是按 F12 或 Ctrl+Shift+I)');
    console.log('2. 切换到 "Console" 标签');
    console.log('3. 复制并粘贴以下代码，然后按 Enter 键：');
    console.log('   // 清除所有厕所相关的缓存数据');
    console.log('   const keysToDelete = [];');
    console.log('   for (let i = 0; i < localStorage.length; i++) {');
    console.log('     const key = localStorage.key(i);');
    console.log('     if (key && key.startsWith(\'restroomsCache\')) {');
    console.log('       keysToDelete.push(key);');
    console.log('     }');
    console.log('   }');
    console.log('   keysToDelete.forEach(key => {');
    console.log('     console.log(`删除缓存键: \${key}`);');
    console.log('     localStorage.removeItem(key);');
    console.log('   });');
    console.log('   console.log(`已清除 \${keysToDelete.length} 个厕所缓存条目`);');
    console.log('4. 刷新页面以加载新数据');
    
    console.log('\n改进后的缓存自动更新条件：');
    console.log('1. 当启用测试模式时，将始终获取实际数据而不使用缓存');
    console.log('2. 当缓存数据少于5条时，将获取新数据');
    console.log('3. 缓存数据将在24小时后过期并自动更新');
    console.log('4. 不同位置的缓存数据将使用不同的缓存键存储，避免冲突');
    
    console.log('\n使用提示：');
    console.log('1. 请确保已启用测试模式（位于favorite标签页）');
    console.log('2. 测试模式启用后，系统将使用预设的位置获取实际厕所数据');
    console.log('3. 启用测试模式后，点击"Favorite"标签可强制刷新厕所数据');
  } catch (error) {
    console.error('清除缓存时出错:', error);
  }
}

clearRestroomCache();