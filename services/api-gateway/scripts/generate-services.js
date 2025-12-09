#!/usr/bin/env node
/**
 * Generate services.ts from unified service registry
 * Eliminates duplication between service-registry and API Gateway config
 */

const fs = require('fs');
const path = require('path');

// Import the convertToLegacyGatewayConfig function
const { convertToLegacyGatewayConfig } = require('../../../core/service-registry');

const OUTPUT_FILE = path.join(__dirname, '../src/config/services.ts');

function generateServicesFile() {
  console.log('🔄 Generating services.ts from unified service registry...');

  try {
    // Get the gateway configuration from service registry
    const legacyConfig = convertToLegacyGatewayConfig();

    // Create full API Gateway configuration structure
    const fullConfig = {
      services: legacyConfig,
      port: process.env.PORT || 6020,
      host: process.env.API_GATEWAY_HOST || '0.0.0.0',
      security: {
        enableHelmet: true,
        enableCompression: true,
        enableLogging: true
      },
      corsOrigins: [
        "http://localhost:3000",
        "http://localhost:6000",
        "http://localhost:6001",
        "http://localhost:6002",
        "http://localhost:6003",
        "https://salon.beauty.designcorp.eu",
        "https://admin.beauty.designcorp.eu",
        "https://client.beauty.designcorp.eu",
        "https://beauty.designcorp.eu",
        // Dev subdomains
        "https://dev-crm.beauty.designcorp.eu",
        "https://dev-salon.beauty.designcorp.eu",
        "https://dev-admin.beauty.designcorp.eu",
        "https://dev-client.beauty.designcorp.eu"
      ],
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // limit each IP to 1000 requests per windowMs
        message: "Too many requests from this IP, please try again later."
      }
    };

    // Generate TypeScript file content
    const fileContent = `/**
 * API Gateway Services Configuration
 * ⚠️  AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * This file is generated from @beauty-platform/service-registry
 * To make changes, update the unified registry and run:
 * pnpm --filter api-gateway run generate:services
 *
 * Generated: ${new Date().toISOString()}
 */

export interface ServiceConfig {
  name: string;
  url: string;
  path: string;
  timeout?: number;
  retries?: number;
  healthCheck?: string;
}

export interface SecurityConfig {
  enableHelmet: boolean;
  enableCompression: boolean;
  enableLogging: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

export interface APIGatewayConfig {
  services: Record<string, ServiceConfig>;
  port: number;
  host: string;
  security: SecurityConfig;
  corsOrigins: string[];
  rateLimit: RateLimitConfig;
}

// Services integrated with API Gateway (auto-generated from unified registry)
export const SERVICES: Record<string, ServiceConfig> = ${JSON.stringify(legacyConfig, null, 2)};

// Full API Gateway configuration
export const API_GATEWAY_CONFIG: APIGatewayConfig = ${JSON.stringify(fullConfig, null, 2)};

export default SERVICES;
`;

    // Write the file
    fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf8');

    console.log('✅ Successfully generated services.ts');
    console.log(`📁 Output: ${OUTPUT_FILE}`);
    console.log(`📊 Generated ${Object.keys(legacyConfig).length} service configurations`);

  } catch (error) {
    console.error('❌ Error generating services.ts:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateServicesFile();
}

module.exports = { generateServicesFile };
