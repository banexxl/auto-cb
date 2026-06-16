"use client";

import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { CloudbetSport } from "@/lib/cloudbet/cloudbet-types";

interface MatchesFiltersProps {
  competitionName: string;
  competitionNames: string[];
  limit: number;
  sport: string;
  sports: CloudbetSport[];
}

function getMatchesUrl(sport: string, limit: string, competitionName: string) {
  const searchParams = new URLSearchParams();
  searchParams.set("sport", sport);
  searchParams.set("limit", limit);

  if (competitionName) {
    searchParams.set("competitionName", competitionName);
  }

  return `/matches?${searchParams.toString()}`;
}

export function MatchesFilters({ competitionName, competitionNames, limit, sport, sports }: MatchesFiltersProps) {
  const router = useRouter();
  const [selectedCompetitionName, setSelectedCompetitionName] = useState(competitionName);
  const [selectedSport, setSelectedSport] = useState(sport);
  const [selectedLimit, setSelectedLimit] = useState(String(limit));

  useEffect(() => {
    setSelectedCompetitionName(competitionName);
    setSelectedSport(sport);
    setSelectedLimit(String(limit));
  }, [competitionName, limit, sport]);

  function handleSportChange(event: SelectChangeEvent<string>) {
    const nextSport = event.target.value;
    setSelectedSport(nextSport);
    setSelectedCompetitionName("");
    router.push(getMatchesUrl(nextSport, selectedLimit, ""));
  }

  function handleCompetitionChange(event: SelectChangeEvent<string>) {
    const nextCompetitionName = event.target.value;
    setSelectedCompetitionName(nextCompetitionName);
    router.push(getMatchesUrl(selectedSport, selectedLimit, nextCompetitionName));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(getMatchesUrl(selectedSport, selectedLimit, selectedCompetitionName));
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        alignItems: "center",
        bgcolor: "common.white",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 4,
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        p: 2,
      }}
    >
      <FormControl size="small" sx={{ minWidth: 220 }}>
        <InputLabel id="sport-select-label">Sport</InputLabel>
        <Select
          label="Sport"
          labelId="sport-select-label"
          name="sport"
          onChange={handleSportChange}
          value={selectedSport}
        >
          {sports.map((sportOption) => (
            <MenuItem key={sportOption.key} value={sportOption.key}>
              {sportOption.name} ({sportOption.eventCount ?? 0})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 260 }}>
        <InputLabel id="competition-select-label">Competition</InputLabel>
        <Select
          label="Competition"
          labelId="competition-select-label"
          name="competitionName"
          onChange={handleCompetitionChange}
          value={selectedCompetitionName}
        >
          <MenuItem value="">All competitions</MenuItem>
          {competitionNames.map((competitionOption) => (
            <MenuItem key={competitionOption} value={competitionOption}>
              {competitionOption}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Limit"
        name="limit"
        onChange={(event) => setSelectedLimit(event.target.value)}
        size="small"
        slotProps={{ htmlInput: { min: 1, max: 10000 } }}
        type="number"
        value={selectedLimit}
      />
      <Button type="submit" variant="contained">Refresh</Button>
    </Box>
  );
}
