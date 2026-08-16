const SERVICE_NAME = 'outreachr-public';

export const PUBLIC_ROUTE_COST_PROFILES = Object.freeze({
  method_not_allowed: Object.freeze({
    executionClass: 'worker-isolate',
    unit: 'rejected-request',
    cacheClass: 'no-store',
    storageReadOperations: 0,
  }),
  health_live: Object.freeze({
    executionClass: 'worker-isolate',
    unit: 'liveness-probe',
    cacheClass: 'no-store',
    storageReadOperations: 0,
  }),
  health_ready: Object.freeze({
    executionClass: 'worker-isolate+r2',
    unit: 'readiness-probe',
    cacheClass: 'no-store',
    storageReadOperations: 2,
  }),
  atlas_index: Object.freeze({
    executionClass: 'worker-isolate+r2',
    unit: 'atlas-index-delivery',
    cacheClass: 'bounded',
    storageReadOperations: 1,
  }),
  release_manifest: Object.freeze({
    executionClass: 'worker-isolate+r2',
    unit: 'release-manifest-delivery',
    cacheClass: 'bounded',
    storageReadOperations: 1,
  }),
  invalid_release_coordinate: Object.freeze({
    executionClass: 'worker-isolate',
    unit: 'rejected-request',
    cacheClass: 'no-store',
    storageReadOperations: 0,
  }),
  release_artifact: Object.freeze({
    executionClass: 'worker-isolate+r2',
    unit: 'release-artifact-delivery',
    cacheClass: 'immutable',
    storageReadOperations: 1,
  }),
  invalid_artifact_key: Object.freeze({
    executionClass: 'worker-isolate',
    unit: 'rejected-request',
    cacheClass: 'no-store',
    storageReadOperations: 0,
  }),
  static_asset: Object.freeze({
    executionClass: 'worker-isolate+static-assets',
    unit: 'static-asset-delivery',
    cacheClass: 'static-assets',
    storageReadOperations: 0,
  }),
  not_found: Object.freeze({
    executionClass: 'worker-isolate',
    unit: 'rejected-request',
    cacheClass: 'no-store',
    storageReadOperations: 0,
  }),
});

function outcomeForStatus(status) {
  if (status >= 500) return 'server-error';
  if (status >= 400) return 'client-error';
  return 'success';
}

function boundedNonNegative(value, fallback = 0) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function buildPublicCostPoint({
  routeClass,
  method,
  status,
  responseBytes,
  handlerWallMs,
  environment,
  version,
}) {
  const profile = PUBLIC_ROUTE_COST_PROFILES[routeClass];
  if (!profile) throw new Error(`Unknown public route cost profile: ${routeClass}`);

  const safeEnvironment = environment || 'development';
  const safeVersion = version || 'development';
  return {
    indexes: [`${SERVICE_NAME}:${safeEnvironment}`],
    blobs: [
      routeClass,
      profile.executionClass,
      profile.unit,
      profile.cacheClass,
      method,
      outcomeForStatus(status),
      safeVersion,
    ],
    doubles: [
      1,
      status,
      boundedNonNegative(responseBytes, -1),
      profile.storageReadOperations,
      boundedNonNegative(handlerWallMs),
    ],
  };
}

export function emitPublicCostPoint(env, input) {
  if (!env.COST_METRICS || typeof env.COST_METRICS.writeDataPoint !== 'function') return false;
  try {
    env.COST_METRICS.writeDataPoint(buildPublicCostPoint(input));
    return true;
  } catch {
    return false;
  }
}
