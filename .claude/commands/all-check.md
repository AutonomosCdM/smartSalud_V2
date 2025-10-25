# /all-check

Parallel verification by Adrian and James.

Usage: `/all-check [component]`

When invoked:
1. Run adrian-newey-verifier for technical verification
2. Run james-vowles-strategist for financial analysis
3. Combine results into final verdict:
   - 🟢 Green Flag = Production ready
   - 🟡 Yellow Flag = Needs revision
   - 🔴 Red Flag = Blocker found

Target: $ARGUMENTS
