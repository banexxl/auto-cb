"use client";

import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import Link from "next/link";
import type { CloudbetMatch } from "@/lib/cloudbet/cloudbet-types";

interface MatchesTableProps {
  matches: CloudbetMatch[];
  errorMessage?: string;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusColor(status: CloudbetMatch["status"]) {
  if (status === "TRADING_LIVE") {
    return "success";
  }

  if (status === "TRADING" || status === "PRE_TRADING") {
    return "primary";
  }

  if (status === "CANCELLED" || status === "INTERRUPTED") {
    return "error";
  }

  return "default";
}

export function MatchesTable({ matches, errorMessage }: MatchesTableProps) {
  if (errorMessage) {
    return <Alert severity="error">{errorMessage}</Alert>;
  }

  if (matches.length === 0) {
    return (
      <Paper sx={{ borderRadius: 4, p: 4, textAlign: "center" }}>
        <Typography sx={{ fontWeight: 800 }} variant="h6">
          No matches found
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Try another sport or check the Cloudbet API key configuration.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 4 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Match</TableCell>
            <TableCell>Competition</TableCell>
            <TableCell>Start</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Markets</TableCell>
            <TableCell align="right">Details</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {matches.map((match) => (
            <TableRow hover key={match.id}>
              <TableCell>
                <Stack spacing={0.5}>
                  <Typography sx={{ fontWeight: 800 }}>{match.name}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {match.home?.name ?? "Home"} vs {match.away?.name ?? "Away"}
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell>
                <Typography>{match.competition?.name ?? "Unknown competition"}</Typography>
                <Typography color="text.secondary" variant="body2">
                  {match.sport?.name ?? match.sport?.key ?? "Sport"}
                </Typography>
              </TableCell>
              <TableCell>{formatDateTime(match.cutoffTime)}</TableCell>
              <TableCell>
                <Chip color={getStatusColor(match.status)} label={match.status.replaceAll("_", " ")} size="small" />
              </TableCell>
              <TableCell align="right">{Object.keys(match.markets ?? {}).length}</TableCell>
              <TableCell align="right">
                <Button component={Link} href={`/matches/${match.id}?sport=${match.sport?.key ?? "soccer"}`} size="small">
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ borderTop: "1px solid", borderColor: "divider", p: 2 }}>
        <Typography color="text.secondary" variant="body2">
          Showing {matches.length} live and upcoming Cloudbet events.
        </Typography>
      </Box>
    </TableContainer>
  );
}

export function MatchesTableLoading() {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 4 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Match</TableCell>
            <TableCell>Competition</TableCell>
            <TableCell>Start</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Markets</TableCell>
            <TableCell align="right">Details</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6}>
              <Box sx={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 2, py: 8 }}>
                <CircularProgress />
                <Typography color="text.secondary" variant="body2">
                  Loading matches...
                </Typography>
              </Box>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

