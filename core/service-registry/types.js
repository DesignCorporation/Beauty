"use strict";
/**
 * Unified Service Registry - Type Definitions
 * Single source of truth for all Beauty Platform services
 *
 * @version 1.0.0
 * @created 26.09.2025
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceStatus = exports.ServiceCriticality = exports.ServiceType = void 0;
var ServiceType;
(function (ServiceType) {
    ServiceType["Frontend"] = "frontend";
    ServiceType["Gateway"] = "gateway";
    ServiceType["Core"] = "core";
    ServiceType["Business"] = "business";
    ServiceType["Media"] = "media";
    ServiceType["AI"] = "ai";
    ServiceType["Utility"] = "utility";
    ServiceType["Infrastructure"] = "infrastructure";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
var ServiceCriticality;
(function (ServiceCriticality) {
    ServiceCriticality["Critical"] = "critical";
    ServiceCriticality["Important"] = "important";
    ServiceCriticality["Optional"] = "optional"; // 🔶 Nice to have, degraded experience
})(ServiceCriticality || (exports.ServiceCriticality = ServiceCriticality = {}));
var ServiceStatus;
(function (ServiceStatus) {
    ServiceStatus["Active"] = "active";
    ServiceStatus["Disabled"] = "disabled";
    ServiceStatus["Development"] = "development";
    ServiceStatus["Deprecated"] = "deprecated";
})(ServiceStatus || (exports.ServiceStatus = ServiceStatus = {}));
//# sourceMappingURL=types.js.map