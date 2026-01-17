# Server Test Suite

This directory contains comprehensive test cases for the license management server.

## Prerequisites

All test dependencies should already be installed. If not, run:

```bash
cd c:\Users\huzfm\Desktop\projects\LM\apps\server
pnpm install
```

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Tests in Watch Mode
```bash
pnpm test:watch
```

### Run Tests with Coverage Report
```bash
pnpm test:coverage
```

### Run Specific Test File
```bash
pnpm test auth.test
pnpm test license.test
pnpm test client.test
pnpm test project.test
pnpm test validate.test
pnpm test dashboard.test
```

## Test Structure

```
src/tests/
├── setup.ts                    # MongoDB Memory Server setup
├── helpers/
│   └── testHelpers.ts         # Test data generators
├── auth.test.ts               # Authentication tests
├── license.test.ts            # License management tests
├── client.test.ts             # Client operations tests
├── project.test.ts            # Project creation tests
├── validate.test.ts           # License validation tests
└── dashboard.test.ts          # Dashboard data tests
```

## Test Coverage

The test suite covers:

### Authentication (`auth.test.ts`)
- User signup with validation
- User login with JWT
- Password validation
- Duplicate email prevention
- OAuth user handling
- User retrieval and updates

### License Management (`license.test.ts`)
- License creation
- License toggling (active/revoked)
- Duration validation
- User-license retrieval
- Authentication requirements

### Client Operations (`client.test.ts`)
- Client creation
- Field validation
- Duplicate email prevention
- Authentication requirements

### Project Management (`project.test.ts`)
- Project creation with license (transaction)
- Transaction rollback on errors
- Validation for all required fields
- Client existence verification
- Services array validation

### License Validation (`validate.test.ts`)
- Active license validation
- Revoked license detection
- Expired license handling
- Pending license status
- License activation
- Various error scenarios

### Dashboard (`dashboard.test.ts`)
- Full dashboard data retrieval
- Client filtering
- Nested data structure (clients → projects → licenses)
- Empty state handling
- Multi-user isolation

## Test Database

Tests use **MongoDB Memory Server**, an in-memory database that:
- Doesn't affect your development or production data
- Creates a fresh database for each test run
- Automatically cleans up after tests complete
- Provides fast, isolated test execution

## Important Notes

1. **Isolation**: Each test is completely isolated with fresh database state
2. **Authentication**: Tests use JWT tokens generated via `generateTestToken()`
3. **Cleanup**: Database is automatically cleaned after each test
4. **Parallel Execution**: Tests run sequentially (`--runInBand`) to avoid conflicts

## Troubleshooting

### Tests Timeout
If tests timeout, increase the timeout in `jest.config.js`:
```javascript
testTimeout: 60000  // 60 seconds
```

### MongoDB Memory Server Issues
If you encounter MongoDB Memory Server download issues:
```bash
# Clear cache and reinstall
rm -rf node_modules
pnpm install
```

### Port Already in Use
The in-memory database uses random ports, so this shouldn't be an issue. If it persists, ensure no other test processes are running.

## Coverage Goals

Current coverage targets:
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

View detailed coverage report after running `pnpm test:coverage` in the `coverage/` directory.
