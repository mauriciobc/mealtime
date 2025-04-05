# Migration Guide

## Overview
This guide provides steps to migrate from the old context architecture to the new domain-specific context architecture.

## Steps

1. **Update Imports**
   - Replace imports of `AppContext` with the new domain-specific contexts (`UserContext`, `CatsContext`, etc.).

2. **Refactor Components**
   - Update components to use the new contexts.
   - Remove dependencies on the old `AppContext`.

3. **Test Functionality**
   - Run the full test suite to ensure all contexts are working as expected.
   - Add new tests for components that were refactored.

4. **Update Documentation**
   - Ensure all references to `AppContext` in the documentation are updated.
   - Add examples of using the new contexts.

5. **Monitor Performance**
   - Use the performance monitoring utilities to track improvements.
   - Address any regressions identified during testing.