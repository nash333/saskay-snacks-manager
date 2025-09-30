#!/usr/bin/env node

/**
 * Production Cleanup Script
 * Removes development artifacts and optimizes for production
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

class ProductionCleaner {
  constructor() {
    this.cleaned = [];
    this.preserved = [];
    this.errors = [];
  }

  async run() {
    console.log('🧹 Starting Production Cleanup\n');
    
    try {
      await this.removeDevArtifacts();
      await this.optimizeConfigFiles();
      await this.cleanupTestFiles();
      await this.validateCleanup();
      
      this.printSummary();
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
    }
  }

  async removeDevArtifacts() {
    console.log('⏳ Removing development artifacts...');
    
    // Development-only files to remove (be careful!)
    const devFiles = [
      // Temporary files
      '.DS_Store',
      'Thumbs.db',
      
      // IDE files (keep .vscode for team settings)
      '.idea',
      
      // Backup files
      '*.bak',
      '*.tmp',
      
      // Log files
      '*.log',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*'
    ];

    // Directories to clean
    const devDirs = [
      'node_modules/.cache',
      '.next',
      '.nuxt',
      'coverage'
    ];

    for (const pattern of devFiles) {
      this.removeFilesByPattern(rootDir, pattern);
    }

    for (const dir of devDirs) {
      const fullPath = join(rootDir, dir);
      if (existsSync(fullPath)) {
        try {
          this.removeDirectory(fullPath);
          this.cleaned.push(dir);
        } catch (error) {
          this.errors.push(`Failed to remove ${dir}: ${error.message}`);
        }
      }
    }

    console.log(`   Cleaned ${this.cleaned.length} development artifacts`);
  }

  async optimizeConfigFiles() {
    console.log('⏳ Optimizing configuration files...');
    
    // Check package.json for development scripts that can be removed in production
    const packagePath = join(rootDir, 'package.json');
    if (existsSync(packagePath)) {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      // Keep essential scripts for production
      const essentialScripts = [
        'start',
        'build',
        'setup',
        'deploy',
        'prisma'
      ];

      const originalScriptCount = Object.keys(packageJson.scripts || {}).length;
      
      // Don't actually remove scripts - just report what could be optimized
      const nonEssentialScripts = Object.keys(packageJson.scripts || {})
        .filter(script => !essentialScripts.includes(script));
      
      if (nonEssentialScripts.length > 0) {
        console.log(`   Found ${nonEssentialScripts.length} development scripts that could be optimized`);
        console.log(`   Development scripts: ${nonEssentialScripts.join(', ')}`);
      }
      
      this.preserved.push(`package.json (${originalScriptCount} scripts preserved)`);
    }
  }

  async cleanupTestFiles() {
    console.log('⏳ Analyzing test files...');
    
    // Count test files (don't remove them as they're part of the codebase)
    const testDirs = ['tests', '__tests__', 'test'];
    let testFileCount = 0;
    
    for (const testDir of testDirs) {
      const fullPath = join(rootDir, testDir);
      if (existsSync(fullPath)) {
        testFileCount += this.countFiles(fullPath, ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx']);
      }
    }
    
    if (testFileCount > 0) {
      console.log(`   Found ${testFileCount} test files (preserved for development)`);
      this.preserved.push(`${testFileCount} test files`);
    }
  }

  async validateCleanup() {
    console.log('⏳ Validating cleanup...');
    
    // Ensure essential files are still present
    const essentialFiles = [
      'package.json',
      'app/root.tsx',
      'app/entry.server.tsx',
      'vite.config.ts',
      'tsconfig.json'
    ];

    for (const file of essentialFiles) {
      const fullPath = join(rootDir, file);
      if (!existsSync(fullPath)) {
        throw new Error(`Essential file missing after cleanup: ${file}`);
      }
    }

    console.log('   All essential files preserved');
  }

  removeFilesByPattern(dir, pattern) {
    try {
      const files = readdirSync(dir);
      
      for (const file of files) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          this.removeFilesByPattern(fullPath, pattern);
        } else if (this.matchesPattern(file, pattern)) {
          try {
            unlinkSync(fullPath);
            this.cleaned.push(file);
          } catch (error) {
            this.errors.push(`Failed to remove ${file}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }
  }

  matchesPattern(filename, pattern) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filename);
    }
    return filename === pattern;
  }

  removeDirectory(dirPath) {
    if (existsSync(dirPath)) {
      const files = readdirSync(dirPath);
      
      for (const file of files) {
        const fullPath = join(dirPath, file);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          this.removeDirectory(fullPath);
        } else {
          unlinkSync(fullPath);
        }
      }
      
      // Remove the directory itself
      try {
        import('fs').then(fs => fs.rmSync(dirPath, { recursive: true, force: true }));
      } catch (error) {
        // Fallback for older Node versions
        import('fs').then(fs => fs.rmdirSync(dirPath));
      }
    }
  }

  countFiles(dir, extensions) {
    let count = 0;
    
    try {
      const files = readdirSync(dir);
      
      for (const file of files) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          count += this.countFiles(fullPath, extensions);
        } else if (extensions.some(ext => file.endsWith(ext))) {
          count++;
        }
      }
    } catch (error) {
      // Directory might not be accessible
    }
    
    return count;
  }

  printSummary() {
    console.log('\n📊 Production Cleanup Summary');
    console.log('================================');
    
    if (this.cleaned.length > 0) {
      console.log(`✅ Cleaned ${this.cleaned.length} artifacts:`);
      this.cleaned.slice(0, 10).forEach(item => console.log(`   - ${item}`));
      if (this.cleaned.length > 10) {
        console.log(`   ... and ${this.cleaned.length - 10} more`);
      }
    }
    
    if (this.preserved.length > 0) {
      console.log(`\n📋 Preserved ${this.preserved.length} essential items:`);
      this.preserved.forEach(item => console.log(`   - ${item}`));
    }
    
    if (this.errors.length > 0) {
      console.log(`\n⚠️  ${this.errors.length} warnings:`);
      this.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\n🎉 Production cleanup completed!');
    console.log('\nApplication is now optimized for production deployment.');
    console.log('Run `npm run build` to create production build.');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  new ProductionCleaner().run().catch(error => {
    console.error('\n❌ Production cleanup failed:', error.message);
    process.exit(1);
  });
}

export { ProductionCleaner };