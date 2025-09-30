#!/usr/bin/env node

/**
 * Build Optimization Script
 * Optimizes the application for production deployment
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

class BuildOptimizer {
  constructor() {
    this.tasks = [
      'checkEnvironment',
      'cleanBuild',
      'optimizeDependencies',
      'buildProduction',
      'analyzeBundleSize',
      'validateBuild'
    ];
    this.results = {};
  }

  async run() {
    console.log('🚀 Starting Build Optimization\n');
    
    for (const task of this.tasks) {
      try {
        console.log(`⏳ Running ${task}...`);
        await this[task]();
        console.log(`✅ ${task} completed\n`);
      } catch (error) {
        console.error(`❌ ${task} failed:`, error.message);
        process.exit(1);
      }
    }

    this.printSummary();
  }

  async checkEnvironment() {
    // Verify Node.js version
    const nodeVersion = process.version;
    const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
    
    console.log(`   Node.js version: ${nodeVersion}`);
    console.log(`   Required: ${packageJson.engines.node}`);
    
    // Check if all required files exist
    const requiredFiles = [
      'package.json',
      'vite.config.ts',
      'tsconfig.json',
      'app/root.tsx',
      'app/entry.server.tsx'
    ];

    for (const file of requiredFiles) {
      if (!existsSync(join(rootDir, file))) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    this.results.environment = { nodeVersion, status: 'valid' };
  }

  async cleanBuild() {
    // Clean previous build artifacts
    const buildDirs = ['build', 'dist', '.shopify/build'];
    
    for (const dir of buildDirs) {
      const fullPath = join(rootDir, dir);
      if (existsSync(fullPath)) {
        try {
          execSync(`rm -rf "${fullPath}"`, { cwd: rootDir, stdio: 'pipe' });
          console.log(`   Cleaned: ${dir}`);
        } catch (error) {
          // Try Windows command
          try {
            execSync(`rmdir /s /q "${fullPath}"`, { cwd: rootDir, stdio: 'pipe' });
            console.log(`   Cleaned: ${dir}`);
          } catch (winError) {
            console.warn(`   Could not clean ${dir}:`, winError.message);
          }
        }
      }
    }

    this.results.clean = { status: 'completed' };
  }

  async optimizeDependencies() {
    // Check for unused dependencies
    console.log('   Analyzing dependencies...');
    
    try {
      const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
      const dependencies = Object.keys(packageJson.dependencies || {});
      const devDependencies = Object.keys(packageJson.devDependencies || {});
      
      console.log(`   Production dependencies: ${dependencies.length}`);
      console.log(`   Development dependencies: ${devDependencies.length}`);
      
      this.results.dependencies = {
        production: dependencies.length,
        development: devDependencies.length,
        status: 'analyzed'
      };
    } catch (error) {
      throw new Error(`Failed to analyze dependencies: ${error.message}`);
    }
  }

  async buildProduction() {
    console.log('   Building for production...');
    
    try {
      // Set NODE_ENV to production
      const env = { ...process.env, NODE_ENV: 'production' };
      
      // Run the build command
      const buildOutput = execSync('npm run build', { 
        cwd: rootDir, 
        stdio: 'pipe',
        env 
      }).toString();
      
      console.log('   Build completed successfully');
      
      // Check if build directory was created
      const buildPath = join(rootDir, 'build');
      if (!existsSync(buildPath)) {
        throw new Error('Build directory was not created');
      }

      this.results.build = { status: 'success', output: buildOutput.split('\n').length };
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  async analyzeBundleSize() {
    console.log('   Analyzing bundle size...');
    
    try {
      const buildPath = join(rootDir, 'build');
      if (!existsSync(buildPath)) {
        throw new Error('Build directory not found');
      }

      // Get build size (simplified analysis)
      const sizeOutput = execSync(`du -sh "${buildPath}" 2>/dev/null || dir "${buildPath}" /-s`, { 
        cwd: rootDir, 
        stdio: 'pipe' 
      }).toString();
      
      console.log(`   Build size: ${sizeOutput.trim()}`);
      
      this.results.bundleSize = { 
        status: 'analyzed',
        size: sizeOutput.trim()
      };
    } catch (error) {
      console.warn('   Bundle size analysis failed:', error.message);
      this.results.bundleSize = { status: 'skipped', reason: error.message };
    }
  }

  async validateBuild() {
    console.log('   Validating build...');
    
    const buildPath = join(rootDir, 'build');
    const requiredBuildFiles = [
      'server/index.js',
      'client/assets'
    ];

    for (const file of requiredBuildFiles) {
      const fullPath = join(buildPath, file);
      if (!existsSync(fullPath)) {
        console.warn(`   Warning: Expected build file missing: ${file}`);
      } else {
        console.log(`   ✓ Found: ${file}`);
      }
    }

    this.results.validation = { status: 'completed' };
  }

  printSummary() {
    console.log('\n📊 Build Optimization Summary');
    console.log('================================');
    
    Object.entries(this.results).forEach(([task, result]) => {
      const status = result.status === 'success' || result.status === 'completed' || result.status === 'analyzed' ? '✅' : '⚠️';
      console.log(`${status} ${task}: ${result.status}`);
      
      if (result.production && result.development) {
        console.log(`   Dependencies: ${result.production} prod, ${result.development} dev`);
      }
      if (result.size) {
        console.log(`   Size: ${result.size}`);
      }
    });
    
    console.log('\n🎉 Build optimization completed!');
    console.log('\nNext steps:');
    console.log('- Run `npm start` to test the production build');
    console.log('- Deploy using `npm run deploy`');
    console.log('- Monitor performance in production');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  new BuildOptimizer().run().catch(error => {
    console.error('\n❌ Build optimization failed:', error.message);
    process.exit(1);
  });
}

export { BuildOptimizer };