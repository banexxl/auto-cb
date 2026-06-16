# Research Workflow

## Step 1: Match Identification
Confirm:

- Sport
- League/competition
- Match participants
- Date, kickoff time, venue
- Home/away or neutral location
- Competition stage: regular season, playoff, cup, qualifier, friendly

## Step 2: Source Collection
Prioritize sources in this order:

1. Official club/team/league websites
2. Official squad lists, injury reports, disciplinary reports
3. Reputable sports media
4. Verified journalist reports
5. Press conferences and coach/player statements
6. Statistical databases
7. Betting market data, if relevant
8. Social media only when verified and clearly labeled

Use at least 3 independent sources for important claims when possible.

## Step 3: Availability Check
Investigate:

- Confirmed injuries
- Illness reports
- Suspensions
- Yellow-card/red-card bans
- Personal absences
- Rest/rotation risk
- Players returning from injury
- Late fitness tests
- Expected lineup
- Confirmed lineup, if available

Classify each important player:

- Confirmed available
- Expected available
- Doubtful
- Out
- Suspended
- Unknown

## Step 4: Form and Performance Analysis
Review:

- Last 5–10 matches
- Home/away split
- Quality of opponents
- Goals/points scored and conceded
- Expected goals/advanced metrics when available
- Defensive stability
- Set-piece strength/weakness
- Recent tactical changes
- Coaching changes
- Discipline trends

## Step 5: Head-to-Head Review
Analyze:

- Recent meetings
- Venue-specific history
- Tactical patterns
- Scoreline trends
- Whether old results are still relevant

Do not overvalue old head-to-head data if squads, coaches, or context have changed.

## Step 6: Tactical Matchup
Evaluate:

- Formation and structure
- Pressing intensity
- Transition attack/defense
- Width and crossing
- Central control
- Set pieces
- Matchup advantages
- Weak zones
- Likely game state scenarios

For individual sports, evaluate:

- Style matchup
- Surface/court/field preference
- Physical condition
- Recent workload
- Historical matchup patterns
- Serve/return, pace, stamina, defensive/offensive profile, depending on sport

## Step 7: External Factors
Consider:

- Travel distance
- Rest days
- Fixture congestion
- Weather
- Altitude
- Pitch/court/surface conditions
- Crowd/home advantage
- Referee tendencies, when relevant
- Motivation differences
- Tournament incentives

## Step 8: Integrity and Match-Fixing Risk Review
Check:

- Official sanctions or investigations
- Federation/league disciplinary announcements
- Court cases or police investigations
- Reputable investigative journalism
- Known suspicious betting alerts from credible monitoring bodies
- Sudden unexplained odds movement
- Late lineup surprises
- Financial distress or unpaid wages, where reported
- Club ownership or governance controversy

Important: integrity indicators are risk signals, not proof.

## Step 9: Market/Odds Movement Review
If betting-market analysis is requested:

- Compare opening odds and current odds
- Check movement across multiple bookmakers
- Identify whether movement aligns with news
- Note suspicious or unexplained movement cautiously
- Avoid claiming certainty from odds movement alone

## Step 10: Ticket Construction, If Requested
When the user provides an array of matches and asks for a betting ticket or bet placement:

- Treat each array item as a candidate match, not as an automatic leg.
- Re-check current odds, event status, cutoff time, selection status, marketUrl, minStake, and maxStake.
- Score candidate selections by evidence strength, odds value, market stability, team-news certainty, and integrity risk.
- Build combinations by multiplying decimal odds and keep only totals from 1.5 through 2.2 inclusive.
- Prefer the lowest-risk valid combination, even if another combination has a higher payout.
- Reject any selection with disabled status, stale odds, missing marketUrl, insufficient stake limits, or low-confidence evidence.
- Return `NO_BET` when no combination satisfies both quota and risk requirements.
- Place the bet only when explicitly authorized with stake and currency; otherwise return `PROPOSE_ONLY`.

## Step 11: Final Synthesis
Summarize:

- Most likely match pattern
- Key advantages for each side
- Main uncertainty factors
- Upset paths
- Availability impact
- Integrity-risk summary
- Ticket decision and combined quota, if requested
- Confidence level
