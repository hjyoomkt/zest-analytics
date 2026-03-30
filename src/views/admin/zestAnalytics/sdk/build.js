/**
 * ============================================================================
 * Zest Analytics SDK 빌드 스크립트
 * ============================================================================
 *
 * SDK 소스를 public/sdk/ 디렉토리로 복사
 *
 * 사용법:
 *   node src/views/admin/zestAnalytics/sdk/build.js
 */

const fs = require('fs');
const path = require('path');

// 경로 설정
const sourceFile = path.join(__dirname, 'index.js');
const outputDir = path.join(__dirname, '../../../../../public/sdk');
const outputFile = path.join(outputDir, 'za-sdk.js');

console.log('[ZA Build] Starting SDK build...');
console.log('[ZA Build] Source:', sourceFile);
console.log('[ZA Build] Output:', outputFile);

// public/sdk 디렉토리 생성
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log('[ZA Build] Created output directory:', outputDir);
}

// SDK 소스 읽기
const source = fs.readFileSync(sourceFile, 'utf8');

// SDK 파일 쓰기
fs.writeFileSync(outputFile, source, 'utf8');
console.log('[ZA Build] SDK built successfully:', outputFile);

// 파일 크기 확인
const stats = fs.statSync(outputFile);
const fileSizeKB = (stats.size / 1024).toFixed(2);
console.log('[ZA Build] File size:', fileSizeKB, 'KB');

console.log('[ZA Build] Build complete!');
console.log('[ZA Build] SDK URL: http://localhost:3000/sdk/za-sdk.js');
