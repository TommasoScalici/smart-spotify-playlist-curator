// Silence Firebase Logger
jest.mock("firebase-functions/logger", () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    write: jest.fn(),
}));
