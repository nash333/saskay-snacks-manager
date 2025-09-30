/**
 * Production Environment Configuration Validator
 * Ensures all production settings are properly configured
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ProductionCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  fix?: string;
}

export class ProductionValidator {
  private checks: ProductionCheck[] = [];
  private rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  async validate(): Promise<{ passed: number; failed: number; warnings: number; checks: ProductionCheck[] }> {
    console.log('🔍 Validating Production Configuration\n');

    // Environment checks
    this.checkNodeEnv();
    this.checkPackageJson();
    this.checkEnvironmentVariables();
    this.checkDatabaseConfig();
    this.checkShopifyConfig();
    this.checkSecuritySettings();
    this.checkLoggingConfig();
    this.checkPerformanceConfig();

    // Count results
    const passed = this.checks.filter(c => c.status === 'pass').length;
    const failed = this.checks.filter(c => c.status === 'fail').length;
    const warnings = this.checks.filter(c => c.status === 'warn').length;

    this.printResults();

    return { passed, failed, warnings, checks: this.checks };
  }

  private checkNodeEnv(): void {
    const nodeEnv = process.env.NODE_ENV;
    
    if (nodeEnv === 'production') {
      this.addCheck('NODE_ENV', 'pass', 'Environment set to production');
    } else {
      this.addCheck('NODE_ENV', 'warn', `Environment is "${nodeEnv}", should be "production"`, 
        'Set NODE_ENV=production');
    }
  }

  private checkPackageJson(): void {
    const packagePath = join(this.rootDir, 'package.json');
    
    if (!existsSync(packagePath)) {
      this.addCheck('package.json', 'fail', 'package.json not found');
      return;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      
      // Check for production dependencies
      const prodDeps = Object.keys(packageJson.dependencies || {});
      
      if (prodDeps.length > 0) {
        this.addCheck('Dependencies', 'pass', `${prodDeps.length} production dependencies configured`);
      } else {
        this.addCheck('Dependencies', 'fail', 'No production dependencies found');
      }

      // Check for build script
      if (packageJson.scripts?.build) {
        this.addCheck('Build Script', 'pass', 'Build script configured');
      } else {
        this.addCheck('Build Script', 'fail', 'No build script found', 'Add "build" script to package.json');
      }

      // Check for start script
      if (packageJson.scripts?.start) {
        this.addCheck('Start Script', 'pass', 'Start script configured');
      } else {
        this.addCheck('Start Script', 'fail', 'No start script found', 'Add "start" script to package.json');
      }

    } catch (error: any) {
      this.addCheck('package.json', 'fail', `Invalid package.json: ${error.message}`);
    }
  }

  private checkEnvironmentVariables(): void {
    const requiredEnvVars = [
      'SHOPIFY_API_KEY',
      'SHOPIFY_API_SECRET',
      'SCOPES',
      'HOST',
      'DATABASE_URL'
    ];

    const missingVars: string[] = [];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        missingVars.push(envVar);
      }
    }

    if (missingVars.length === 0) {
      this.addCheck('Environment Variables', 'pass', `All ${requiredEnvVars.length} required variables set`);
    } else {
      this.addCheck('Environment Variables', 'fail', 
        `Missing required variables: ${missingVars.join(', ')}`,
        'Set missing environment variables in production environment');
    }
  }

  private checkDatabaseConfig(): void {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      this.addCheck('Database Config', 'fail', 'DATABASE_URL not configured', 
        'Set DATABASE_URL environment variable');
      return;
    }

    // Check if it's a production-appropriate database URL
    if (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')) {
      this.addCheck('Database Config', 'warn', 'Database URL points to localhost',
        'Use production database URL');
    } else if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
      this.addCheck('Database Config', 'pass', 'Production database URL configured');
    } else {
      this.addCheck('Database Config', 'warn', 'Database URL format may not be production-ready');
    }

    // Check for Prisma schema
    const schemaPath = join(this.rootDir, 'prisma', 'schema.prisma');
    if (existsSync(schemaPath)) {
      this.addCheck('Prisma Schema', 'pass', 'Database schema file found');
    } else {
      this.addCheck('Prisma Schema', 'warn', 'Prisma schema file not found');
    }
  }

  private checkShopifyConfig(): void {
    const shopifyApiKey = process.env.SHOPIFY_API_KEY;
    const shopifySecret = process.env.SHOPIFY_API_SECRET;
    const scopes = process.env.SCOPES;
    const host = process.env.HOST;

    if (shopifyApiKey && shopifySecret && scopes && host) {
      this.addCheck('Shopify Config', 'pass', 'Shopify API configuration complete');
    } else {
      this.addCheck('Shopify Config', 'fail', 'Incomplete Shopify configuration',
        'Set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SCOPES, and HOST');
    }

    // Check shopify config files
    const appTomlPath = join(this.rootDir, 'shopify.app.toml');
    const webTomlPath = join(this.rootDir, 'shopify.web.toml');

    if (existsSync(appTomlPath)) {
      this.addCheck('Shopify App Config', 'pass', 'shopify.app.toml found');
    } else {
      this.addCheck('Shopify App Config', 'warn', 'shopify.app.toml not found');
    }

    if (existsSync(webTomlPath)) {
      this.addCheck('Shopify Web Config', 'pass', 'shopify.web.toml found');
    } else {
      this.addCheck('Shopify Web Config', 'warn', 'shopify.web.toml not found');
    }
  }

  private checkSecuritySettings(): void {
    // Check for security-related environment variables
    const sessionSecret = process.env.SHOPIFY_APP_SESSION_SECRET;
    
    if (sessionSecret && sessionSecret.length >= 32) {
      this.addCheck('Session Security', 'pass', 'Session secret properly configured');
    } else if (sessionSecret) {
      this.addCheck('Session Security', 'warn', 'Session secret may be too short',
        'Use a session secret with at least 32 characters');
    } else {
      this.addCheck('Session Security', 'fail', 'Session secret not configured',
        'Set SHOPIFY_APP_SESSION_SECRET environment variable');
    }

    // Check if HTTPS is enforced
    const host = process.env.HOST;
    if (host && host.startsWith('https://')) {
      this.addCheck('HTTPS', 'pass', 'HTTPS configured in HOST');
    } else if (host && host.startsWith('http://')) {
      this.addCheck('HTTPS', 'fail', 'HTTP configured instead of HTTPS',
        'Use HTTPS in production HOST URL');
    } else {
      this.addCheck('HTTPS', 'warn', 'HOST protocol not clearly specified');
    }
  }

  private checkLoggingConfig(): void {
    // Check if logging is properly configured for production
    const logLevel = process.env.LOG_LEVEL;
    
    if (logLevel === 'error' || logLevel === 'warn') {
      this.addCheck('Logging Level', 'pass', `Logging level set to ${logLevel}`);
    } else if (logLevel === 'info') {
      this.addCheck('Logging Level', 'warn', 'Info level logging may be verbose for production');
    } else if (logLevel === 'debug') {
      this.addCheck('Logging Level', 'warn', 'Debug logging should not be used in production',
        'Set LOG_LEVEL to "error" or "warn"');
    } else {
      this.addCheck('Logging Level', 'warn', 'Logging level not explicitly set',
        'Set LOG_LEVEL environment variable');
    }
  }

  private checkPerformanceConfig(): void {
    // Check for performance-related settings
    const port = process.env.PORT;
    
    if (port && !isNaN(parseInt(port))) {
      this.addCheck('Port Configuration', 'pass', `Port set to ${port}`);
    } else {
      this.addCheck('Port Configuration', 'warn', 'PORT not explicitly set',
        'Set PORT environment variable');
    }

    // Check build directory
    const buildPath = join(this.rootDir, 'build');
    if (existsSync(buildPath)) {
      this.addCheck('Build Output', 'pass', 'Build directory exists');
    } else {
      this.addCheck('Build Output', 'warn', 'Build directory not found',
        'Run "npm run build" before deployment');
    }
  }

  private addCheck(name: string, status: 'pass' | 'fail' | 'warn', message: string, fix?: string): void {
    this.checks.push({ name, status, message, fix });
  }

  private printResults(): void {
    console.log('\n📋 Production Configuration Report');
    console.log('=====================================\n');

    const passed = this.checks.filter(c => c.status === 'pass');
    const failed = this.checks.filter(c => c.status === 'fail');
    const warnings = this.checks.filter(c => c.status === 'warn');

    // Print passed checks
    if (passed.length > 0) {
      console.log('✅ Passed Checks:');
      passed.forEach(check => {
        console.log(`   ${check.name}: ${check.message}`);
      });
      console.log();
    }

    // Print warnings
    if (warnings.length > 0) {
      console.log('⚠️  Warnings:');
      warnings.forEach(check => {
        console.log(`   ${check.name}: ${check.message}`);
        if (check.fix) {
          console.log(`      Fix: ${check.fix}`);
        }
      });
      console.log();
    }

    // Print failures
    if (failed.length > 0) {
      console.log('❌ Failed Checks:');
      failed.forEach(check => {
        console.log(`   ${check.name}: ${check.message}`);
        if (check.fix) {
          console.log(`      Fix: ${check.fix}`);
        }
      });
      console.log();
    }

    // Summary
    console.log('📊 Summary:');
    console.log(`   ✅ ${passed.length} passed`);
    console.log(`   ⚠️  ${warnings.length} warnings`);
    console.log(`   ❌ ${failed.length} failed`);
    console.log(`   📝 ${this.checks.length} total checks`);

    if (failed.length === 0) {
      console.log('\n🎉 Configuration is ready for production!');
    } else {
      console.log('\n🔧 Please address failed checks before deploying to production.');
    }
  }
}