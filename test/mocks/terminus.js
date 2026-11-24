class HealthIndicator {
  getStatus(key, isHealthy, data = {}) {
    return {
      [key]: {
        status: isHealthy ? 'up' : 'down',
        ...data,
      },
    };
  }
}

class HealthCheckError extends Error {
  constructor(message, causes) {
    super(message);
    this.causes = causes;
  }
}

class HealthIndicatorService {
  check(key) {
    return {
      up: (data = {}) => ({ [key]: { status: 'up', ...data } }),
      down: (data = {}) => ({ [key]: { status: 'down', ...data } }),
    };
  }
}

class TerminusModule {}

module.exports = {
  HealthIndicator,
  HealthCheckError,
  HealthIndicatorService,
  TerminusModule,
};
