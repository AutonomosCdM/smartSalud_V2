# /update-docs

Updates all project documentation with current system state.

Usage: `/update-docs [specific-doc]`

When invoked:
1. Scan the codebase for current capabilities
2. Update all documentation files with latest information
3. Ensure consistency across all docs
4. Report what was updated

## Documentation files to update:
- `SYSTEM_CAPABILITIES.md` - Complete system inventory
- `MANUAL_PDF_PROCESSING.md` - PDF processing guide  
- `PERFORMANCE_FINDINGS.md` - Performance analysis
- `CLAUDE.md` - Project configuration
- `PROJECT_STRUCTURE.md` - File structure
- `README.md` - Main documentation

## Update process:
1. **Verify current state** - Check actual capabilities
2. **Update metrics** - Run benchmarks for real numbers
3. **Sync all docs** - Ensure consistency
4. **Add timestamp** - Mark last update

## Examples:
```
/update-docs                    # Update all docs
/update-docs SYSTEM_CAPABILITIES # Update specific doc
/update-docs performance        # Update performance docs
```