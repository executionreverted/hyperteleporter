#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = packageJson.version;

console.log(`🚀 Creating release for version ${version}...`);

try {
  // Build the application
  console.log('📦 Building application...');
  execSync('npm run build', { stdio: 'inherit' });

  // Create a git tag
  console.log(`🏷️  Creating git tag v${version}...`);
  execSync(`git tag v${version}`, { stdio: 'inherit' });

  // Push the tag to trigger GitHub Actions
  console.log('📤 Pushing tag to GitHub...');
  execSync(`git push origin v${version}`, { stdio: 'inherit' });

  console.log('✅ Release process initiated!');
  console.log('📋 Check your GitHub repository for the release status.');
  console.log(`🔗 https://github.com/executionreverted/hyperteleporter/releases`);

} catch (error) {
  console.error('❌ Release failed:', error.message);
  process.exit(1);
}
