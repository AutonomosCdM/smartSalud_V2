# /adrian-check

Ruthless technical verification by Adrian Newey.

Usage: `/adrian-check [component]`

When invoked:
1. Identify the component to verify (or last implementation if not specified)
2. Use the adrian-newey-verifier agent to:
   - Verify files exist
   - Run the code
   - Check all claims
3. Return verdict with evidence

Target: $ARGUMENTS
